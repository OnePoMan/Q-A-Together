import { GoogleGenAI, Type, type GenerateContentConfig, type ThinkingLevel } from '@google/genai';

// Newest Flash / Flash-Lite IDs listed in @google/genai 2.24's model type.
// Override without a code change via GEMINI_MODEL / GEMINI_FALLBACK_MODEL.
export const DEFAULT_PRIMARY_MODEL = 'gemini-3.8-flash';
export const DEFAULT_FALLBACK_MODEL = 'gemini-3.1-flash-lite';

// 404: model retired or renamed. 408/429/5xx: overloaded or rate limited.
const FALLBACK_STATUSES = new Set([404, 408, 429, 500, 502, 503, 504]);

export class UpstreamError extends Error {
  constructor(
    message: string,
    readonly status: number | undefined,
  ) {
    super(message);
  }
}

export function modelChain(env: NodeJS.ProcessEnv = process.env): string[] {
  const primary = env.GEMINI_MODEL?.trim() || DEFAULT_PRIMARY_MODEL;
  const fallback = env.GEMINI_FALLBACK_MODEL === undefined ? DEFAULT_FALLBACK_MODEL : env.GEMINI_FALLBACK_MODEL.trim();
  return [...new Set([primary, fallback].filter(Boolean))];
}

let client: GoogleGenAI | null = null;
const getClient = (apiKey: string) => (client ??= new GoogleGenAI({ apiKey }));

const statusOf = (error: unknown): number | undefined => {
  const status = (error as { status?: unknown })?.status;
  return typeof status === 'number' ? status : undefined;
};

const isTimeout = (error: unknown): boolean =>
  error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError');

export interface GenerateOptions {
  apiKey: string;
  system: string;
  prompt: string;
  categories: string[];
  models?: string[];
  /** Total time budget across all attempts, in ms. Keep below the function's maxDuration. */
  budgetMs?: number;
}

export async function generateRaw({
  apiKey,
  system,
  prompt,
  categories,
  models = modelChain(),
  budgetMs = 50_000,
}: GenerateOptions): Promise<{ data: unknown; model: string }> {
  const deadline = Date.now() + budgetMs;

  const config: GenerateContentConfig = {
    systemInstruction: system,
    responseMimeType: 'application/json',
    responseSchema: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          text: { type: Type.STRING },
          category: { type: Type.STRING, enum: categories },
        },
        required: ['text', 'category'],
        propertyOrdering: ['text', 'category'],
      },
    },
  };
  const thinkingLevel = process.env.GEMINI_THINKING_LEVEL?.trim();
  if (thinkingLevel) config.thinkingConfig = { thinkingLevel: thinkingLevel as ThinkingLevel };

  let lastError: unknown;
  for (const [i, model] of models.entries()) {
    const remaining = deadline - Date.now();
    if (remaining < 3_000) break;
    // Leave the fallback a fair share of the budget.
    const timeout = i < models.length - 1 ? Math.min(remaining, Math.round(budgetMs * 0.65)) : remaining;

    try {
      const response = await getClient(apiKey).models.generateContent({
        model,
        contents: prompt,
        config: { ...config, httpOptions: { timeout } },
      });
      const text = response.text;
      if (!text) throw new UpstreamError('Empty response', undefined);
      return { data: JSON.parse(text), model };
    } catch (error) {
      lastError = error;
      const status = statusOf(error);
      const retryable =
        (status !== undefined && FALLBACK_STATUSES.has(status)) || isTimeout(error) || error instanceof SyntaxError || error instanceof UpstreamError;
      console.warn(`[generate] ${model} failed (${status ?? (error as Error)?.name ?? 'unknown'})${retryable ? ', trying next model' : ''}`);
      if (!retryable) break;
    }
  }

  throw new UpstreamError(lastError instanceof Error ? lastError.message : 'Generation failed', statusOf(lastError));
}
