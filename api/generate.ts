import { BATCH_SIZE } from '../shared/vibes.js';
import { buildPrompt } from '../server/prompt.js';
import { InputError, parseGenerateInput, sanitizeQuestions } from '../server/validate.js';
import { RateLimiter } from '../server/rateLimit.js';
import { UpstreamError, generateRaw } from '../server/gemini.js';

// Minimal request/response shapes shared by Vercel's Node runtime and the Vite dev
// middleware (see vite.config.ts), so we don't need @vercel/node at runtime.
export interface ApiRequest {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
}
export interface ApiResponse {
  status(code: number): ApiResponse;
  setHeader(name: string, value: string): unknown;
  json(body: unknown): unknown;
}

const MAX_BODY_BYTES = 32 * 1024;
const MIN_QUESTIONS = 8;

const limiter = new RateLimiter(8, 10 * 60 * 1000);

const header = (req: ApiRequest, name: string): string | undefined => {
  const value = req.headers[name];
  return Array.isArray(value) ? value[0] : value;
};

const clientIp = (req: ApiRequest): string =>
  header(req, 'x-real-ip') || header(req, 'x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

/**
 * Browsers always send Origin on POST. Requiring it to match this deployment (or
 * ALLOWED_ORIGINS) stops other sites from spending your quota through visitors'
 * browsers, and turns away the laziest scripted abuse. It is not authentication.
 */
function isAllowedOrigin(req: ApiRequest): boolean {
  const origin = header(req, 'origin');
  if (!origin) return false;

  const allowed = (process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);
  if (allowed.includes(origin)) return true;

  const host = header(req, 'host');
  if (!host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

const fail = (res: ApiResponse, status: number, error: string, message: string) =>
  res.status(status).json({ error, message });

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return fail(res, 405, 'method_not_allowed', 'Use POST.');
  }
  if (!isAllowedOrigin(req)) {
    return fail(res, 403, 'forbidden', 'Requests must come from the app.');
  }
  if (!header(req, 'content-type')?.toLowerCase().startsWith('application/json')) {
    return fail(res, 415, 'unsupported_media_type', 'Send JSON.');
  }

  const retryAfter = limiter.check(clientIp(req));
  if (retryAfter > 0) {
    res.setHeader('Retry-After', String(retryAfter));
    return fail(res, 429, 'rate_limited', `Slow down a little. Try again in ${retryAfter}s.`);
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('[generate] GEMINI_API_KEY is not set');
    return fail(res, 503, 'not_configured', 'The question generator is not configured yet.');
  }

  let body = req.body;
  if (typeof body === 'string') {
    if (body.length > MAX_BODY_BYTES) return fail(res, 413, 'too_large', 'Request too large.');
    try {
      body = JSON.parse(body);
    } catch {
      return fail(res, 400, 'bad_request', 'Invalid JSON.');
    }
  } else if (JSON.stringify(body ?? null).length > MAX_BODY_BYTES) {
    return fail(res, 413, 'too_large', 'Request too large.');
  }

  let input;
  try {
    input = parseGenerateInput(body);
  } catch (error) {
    if (error instanceof InputError) return fail(res, 400, 'bad_request', error.message);
    throw error;
  }

  const { system, user, categories } = buildPrompt(input.vibe, input.previouslyAsked, BATCH_SIZE);

  try {
    const { data, model } = await generateRaw({ apiKey, system, prompt: user, categories });
    const questions = sanitizeQuestions(data, categories, input.previouslyAsked, BATCH_SIZE);

    if (questions.length < MIN_QUESTIONS) {
      console.error(`[generate] ${model} returned only ${questions.length} usable questions`);
      return fail(res, 502, 'bad_output', 'The AI had an off moment. Try again.');
    }
    return res.status(200).json({ questions, vibe: input.vibe });
  } catch (error) {
    // Details stay in the server logs; clients only get a stable code.
    console.error('[generate] failed:', error);
    const status = error instanceof UpstreamError ? error.status : undefined;
    if (status === 429) return fail(res, 503, 'upstream_busy', 'The AI is busy right now. Try again in a minute.');
    return fail(res, 502, 'upstream_error', "Couldn't reach the AI. Try again shortly.");
  }
}
