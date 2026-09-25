import { getStarterQuestions } from '../data/starterDeck';
import { BATCH_SIZE, MAX_HISTORY_SENT, normalizeQuestion, type Question, type VibeId } from '../shared/vibes';
import { readJson, writeJson } from '../lib/storage';

const CACHE_KEY = 'qa-cache-v2';
const LEGACY_CACHE_KEY = 'qa-cached-questions';
const MAX_CACHE_PER_VIBE = 120;
const REQUEST_TIMEOUT_MS = 65_000;

type Cache = Partial<Record<VibeId, Question[]>>;

export class GenerateError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
  }
}

function readCache(): Cache {
  const cache = readJson<Cache>(CACHE_KEY, {});
  // One-time migration from the v1 string cache.
  const legacy = readJson<unknown>(LEGACY_CACHE_KEY, null);
  if (Array.isArray(legacy)) {
    const migrated = legacy.filter((t): t is string => typeof t === 'string').map(text => ({ text, category: 'Classic' }));
    cache.mix = [...(cache.mix ?? []), ...migrated].slice(-MAX_CACHE_PER_VIBE);
    writeJson(CACHE_KEY, cache);
    try {
      localStorage.removeItem(LEGACY_CACHE_KEY);
    } catch {
      // storage unavailable
    }
  }
  return cache;
}

function addToCache(vibe: VibeId, questions: Question[]) {
  const cache = readCache();
  const merged = new Map([...(cache[vibe] ?? []), ...questions].map(q => [normalizeQuestion(q.text), q]));
  cache[vibe] = [...merged.values()].slice(-MAX_CACHE_PER_VIBE);
  writeJson(CACHE_KEY, cache);
}

export async function fetchQuestions(vibe: VibeId, history: readonly string[]): Promise<Question[]> {
  let response: Response;
  try {
    response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vibe, previouslyAsked: history.slice(-MAX_HISTORY_SENT) }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new GenerateError("Couldn't reach the server.", 'network');
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new GenerateError(
      typeof data.message === 'string' ? data.message : `Server error (${response.status}).`,
      typeof data.error === 'string' ? data.error : 'failed',
    );
  }

  const questions = Array.isArray(data.questions)
    ? (data.questions as unknown[]).filter(
        (q): q is Question =>
          typeof q === 'object' && q !== null && typeof (q as Question).text === 'string' && typeof (q as Question).category === 'string',
      )
    : [];
  if (questions.length === 0) throw new GenerateError('No questions came back.', 'empty');

  addToCache(vibe, questions);
  return questions;
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Builds a deck without the network: previously generated questions for this
 * vibe plus the bundled starter deck, unseen ones first.
 */
export function getOfflineQuestions(vibe: VibeId, history: readonly string[], count = BATCH_SIZE): Question[] {
  const cache = readCache();
  const cached = vibe === 'mix' ? Object.values(cache).flat() : cache[vibe] ?? [];
  const pool = new Map([...getStarterQuestions(vibe), ...cached].map(q => [normalizeQuestion(q.text), q]));

  const seen = new Set(history.map(normalizeQuestion));
  const unseen = [...pool.entries()].filter(([key]) => !seen.has(key)).map(([, q]) => q);
  const repeats = [...pool.entries()].filter(([key]) => seen.has(key)).map(([, q]) => q);

  return [...shuffle(unseen), ...shuffle(repeats)].slice(0, count);
}
