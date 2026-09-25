import {
  DEFAULT_VIBE,
  MAX_HISTORY_SENT,
  MAX_QUESTION_LENGTH,
  isVibeId,
  normalizeQuestion,
  type Question,
  type VibeId,
} from '../shared/vibes.js';

export interface GenerateInput {
  vibe: VibeId;
  previouslyAsked: string[];
}

// Control characters (including newlines) are stripped so user-supplied history
// cannot break out of the delimited block in the prompt.
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/g;

const cleanText = (value: string): string => value.replace(CONTROL_CHARS, ' ').replace(/\s+/g, ' ').trim();

export class InputError extends Error {}

export function parseGenerateInput(body: unknown): GenerateInput {
  if (body === undefined || body === null || body === '') {
    return { vibe: DEFAULT_VIBE, previouslyAsked: [] };
  }
  if (typeof body !== 'object' || Array.isArray(body)) {
    throw new InputError('Body must be a JSON object');
  }

  const { vibe, previouslyAsked } = body as Record<string, unknown>;

  if (vibe !== undefined && !isVibeId(vibe)) {
    throw new InputError('Unknown vibe');
  }
  if (previouslyAsked !== undefined && !Array.isArray(previouslyAsked)) {
    throw new InputError('previouslyAsked must be an array');
  }

  const history = ((previouslyAsked as unknown[] | undefined) ?? [])
    .slice(-MAX_HISTORY_SENT)
    .filter((q): q is string => typeof q === 'string')
    .map(q => cleanText(q).replace(/[<>]/g, '').slice(0, MAX_QUESTION_LENGTH))
    .filter(q => q.length > 0);

  return { vibe: (vibe as VibeId | undefined) ?? DEFAULT_VIBE, previouslyAsked: history };
}

/**
 * Validates model output: keeps well-formed questions, drops duplicates (within the
 * batch and against history), and snaps unknown categories to a known one.
 */
export function sanitizeQuestions(
  raw: unknown,
  allowedCategories: readonly string[],
  previouslyAsked: readonly string[],
  limit: number,
): Question[] {
  if (!Array.isArray(raw)) return [];

  const seen = new Set(previouslyAsked.map(normalizeQuestion));
  const allowed = new Map(allowedCategories.map(name => [name.toLowerCase(), name]));
  const fallbackCategory = allowedCategories[0] ?? 'Wildcard';
  const result: Question[] = [];

  for (const item of raw) {
    if (result.length >= limit) break;

    const rawText = typeof item === 'string' ? item : (item as { text?: unknown })?.text;
    const rawCategory = typeof item === 'object' && item !== null ? (item as { category?: unknown }).category : undefined;
    if (typeof rawText !== 'string') continue;

    const text = cleanText(rawText);
    if (text.length < 12 || text.length > MAX_QUESTION_LENGTH) continue;

    const key = normalizeQuestion(text);
    if (!key || seen.has(key)) continue;
    seen.add(key);

    const category =
      typeof rawCategory === 'string' ? allowed.get(cleanText(rawCategory).toLowerCase()) ?? fallbackCategory : fallbackCategory;

    result.push({ text, category });
  }

  return result;
}
