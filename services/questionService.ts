import { getStarterQuestions } from '../data/starterDeck';
import {
  BATCH_SIZE,
  MAX_FEEDBACK_SENT,
  MAX_HISTORY_SENT,
  normalizeQuestion,
  type Question,
  type VibeId,
} from '../shared/vibes';
import { readJson, writeJson } from '../lib/storage';

const CACHE_KEY = 'qa-cache-v2';
const LEGACY_CACHE_KEY = 'qa-cached-questions';
const MAX_CACHE_PER_VIBE = 120;
const REQUEST_TIMEOUT_MS = 65_000;
/** Cards per Spicy deck that come from the hand-written explicit set. */
const SPICY_EXPLICIT_PER_DECK = 8;

type Cache = Partial<Record<VibeId, Question[]>>;

export class GenerateError extends Error {
  constructor(
    message: string,
    readonly code: string,
    /** When set, the server asked us to back off until this time (ms since epoch). */
    readonly retryAt?: number,
  ) {
    super(message);
  }
}

export const RATE_LIMIT_NOTICE = 'Too many recent requests - here are some saved questions as you wait.';

// The Vercel Firewall rule on /api/generate allows 3 requests per 10-minute
// fixed window per IP and does not say when the block lifts, so we estimate it
// from our own recent requests. Keep in sync with the rule in the dashboard.
const FIREWALL_WINDOW_MS = 10 * 60 * 1000;
const REQUEST_LOG_KEY = 'qa-ai-requests';

function logRequest(now = Date.now()) {
  const recent = readJson<number[]>(REQUEST_LOG_KEY, []).filter(t => now - t < FIREWALL_WINDOW_MS);
  writeJson(REQUEST_LOG_KEY, [...recent, now].slice(-10));
}

/** Best guess at when the firewall's current window ends for this device. */
export function estimateFirewallReset(now = Date.now()): number {
  const recent = readJson<number[]>(REQUEST_LOG_KEY, []).filter(t => now - t < FIREWALL_WINDOW_MS);
  return (recent.length ? Math.min(...recent) : now) + FIREWALL_WINDOW_MS;
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

export interface GenerateRequest {
  vibe: VibeId;
  previouslyAsked: string[];
  liked: string[];
  disliked: string[];
}

export interface GenerateResponse {
  questions: Question[];
  source: 'ai' | 'bank';
  notice?: string;
}

export async function fetchQuestions(request: GenerateRequest): Promise<GenerateResponse> {
  let response: Response;
  logRequest();
  try {
    response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new GenerateError("Couldn't reach the server.", 'network');
  }

  const data = await response.json().catch(() => ({}));
  const blockedByFirewall = response.headers.get('x-vercel-mitigated') !== null;
  if (blockedByFirewall || response.status === 429) {
    const retryAfter = Number(response.headers.get('retry-after'));
    const retryAt = Number.isFinite(retryAfter) && retryAfter > 0 ? Date.now() + retryAfter * 1000 : estimateFirewallReset();
    throw new GenerateError(RATE_LIMIT_NOTICE, 'rate_limited', retryAt);
  }
  if (!response.ok) {
    throw new GenerateError(
      typeof data.message === 'string' ? data.message : `Server error (${response.status}).`,
      typeof data.error === 'string' ? data.error : 'failed',
    );
  }

  const questions = Array.isArray(data.questions)
    ? (data.questions as unknown[])
        .filter(
          (q): q is Question =>
            typeof q === 'object' && q !== null && typeof (q as Question).text === 'string' && typeof (q as Question).category === 'string',
        )
        .map(({ text, category }) => ({ text, category }))
    : [];
  if (questions.length === 0) throw new GenerateError('No questions came back.', 'empty');

  addToCache(request.vibe, questions);
  return {
    questions,
    source: data.source === 'bank' ? 'bank' : 'ai',
    notice: typeof data.notice === 'string' ? data.notice : undefined,
  };
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Unseen first, then repeats, from a pool of candidates. */
function pickFresh(pool: Question[], seen: ReadonlySet<string>, count: number): Question[] {
  const unique = new Map(pool.map(q => [normalizeQuestion(q.text), q]));
  const unseen = [...unique.entries()].filter(([key]) => !seen.has(key)).map(([, q]) => q);
  const repeats = [...unique.entries()].filter(([key]) => seen.has(key)).map(([, q]) => q);
  return [...shuffle(unseen), ...shuffle(repeats)].slice(0, count);
}

/**
 * Builds a deck without the network: previously generated questions for this
 * vibe plus the bundled starter deck, unseen ones first.
 */
export function getOfflineQuestions(vibe: VibeId, history: readonly string[], count = BATCH_SIZE): Question[] {
  const cache = readCache();
  const cached =
    vibe === 'mix'
      ? Object.entries(cache)
          .filter(([id]) => id !== 'spicy')
          .flatMap(([, qs]) => qs ?? [])
      : cache[vibe] ?? [];
  return pickFresh([...getStarterQuestions(vibe), ...cached], new Set(history.map(normalizeQuestion)), count);
}

export interface DeckContext {
  isOnline: boolean;
  /** Skip the API until this time (ms since epoch) after being rate limited. */
  cooldownUntil?: number | null;
  /** Everything seen so far (non-explicit), for de-duplication. */
  history: readonly string[];
  /** Seen per vibe: what gets sent to the server. */
  historyByVibe: Partial<Record<VibeId, string[]>>;
  /** Explicit cards already seen; kept on-device only. */
  localHistory: readonly string[];
  saved: readonly Question[];
  disliked: readonly Question[];
}

export interface BuiltDeck {
  questions: Question[];
  notice: string | null;
  /** Set when rate limited: fresh AI questions are available again at this time. */
  retryAt?: number;
}

const forServer = (questions: readonly Question[]) =>
  questions.filter(q => !q.local).map(q => q.text).slice(-MAX_FEEDBACK_SENT);

export async function buildDeck(vibe: VibeId, ctx: DeckContext): Promise<BuiltDeck> {
  const seen = new Set(ctx.history.map(normalizeQuestion));
  const explicitCount = vibe === 'spicy' ? SPICY_EXPLICIT_PER_DECK : 0;
  const target = BATCH_SIZE - explicitCount;

  let questions: Question[] = [];
  let notice: string | null = null;
  let retryAt: number | undefined;

  const coolingDown = !!ctx.cooldownUntil && ctx.cooldownUntil > Date.now();
  if (coolingDown) {
    notice = RATE_LIMIT_NOTICE;
    retryAt = ctx.cooldownUntil ?? undefined;
  } else if (ctx.isOnline) {
    try {
      const sent = vibe === 'mix' ? ctx.history : ctx.historyByVibe[vibe] ?? [];
      const result = await fetchQuestions({
        vibe,
        previouslyAsked: sent.slice(-MAX_HISTORY_SENT),
        liked: forServer(ctx.saved),
        disliked: forServer(ctx.disliked),
      });
      questions = result.questions.filter(q => !seen.has(normalizeQuestion(q.text))).slice(0, target);
      notice = result.notice ?? null;
    } catch (err) {
      if (err instanceof GenerateError && err.code === 'rate_limited') {
        notice = RATE_LIMIT_NOTICE;
        retryAt = err.retryAt;
      } else {
        notice = `${err instanceof Error ? err.message : "Couldn't reach the AI."} Dealt from saved and built-in questions instead.`;
      }
    }
  }

  // Top up from the cache and starter deck when the server returned too few.
  if (questions.length < target) {
    const have = new Set([...seen, ...questions.map(q => normalizeQuestion(q.text))]);
    const extra = getOfflineQuestions(vibe, [...have], target).filter(q => !have.has(normalizeQuestion(q.text)));
    questions = [...questions, ...extra].slice(0, target);
  }

  if (explicitCount > 0) {
    const { SPICY_EXPLICIT } = await import('../data/spicyDeck');
    const explicit = pickFresh(SPICY_EXPLICIT, new Set(ctx.localHistory.map(normalizeQuestion)), explicitCount);
    // Interleave so explicit cards are spread through the deck, not bunched at the end.
    const mixed: Question[] = [];
    const spacing = Math.max(1, Math.floor(questions.length / Math.max(explicit.length, 1)));
    questions.forEach((q, i) => {
      mixed.push(q);
      if ((i + 1) % spacing === 0 && explicit.length) mixed.push(explicit.shift()!);
    });
    questions = [...mixed, ...explicit];
  }

  return { questions, notice: questions.length ? notice : notice ?? 'No questions available right now.', retryAt };
}
