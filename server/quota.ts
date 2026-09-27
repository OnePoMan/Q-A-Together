import { KEY_PREFIX, type Store } from './store.js';
import { normalizeQuestion, type Question, type VibeId } from '../shared/vibes.js';

// Gemini's daily quota is per Google Cloud project and resets at midnight
// Pacific time, so the budget is keyed on the Pacific calendar date.
export function pacificDay(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(now);
}

const DAY_TTL = 36 * 60 * 60;

/** Seconds until the next Pacific-time midnight, when the daily budget resets. */
export function secondsUntilPacificMidnight(now = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(now);
  const get = (type: string) => Number(parts.find(p => p.type === type)?.value ?? 0);
  const elapsed = get('hour') * 3600 + get('minute') * 60 + get('second');
  return Math.max(1, 24 * 3600 - elapsed);
}

const intFromEnv = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

export interface QuotaLimits {
  /** AI calls per Pacific day across all users. Keep a little under the Gemini RPD. */
  daily: number;
  /** AI calls per Pacific day for one IP address. */
  perIp: number;
}

export const quotaLimits = (env: NodeJS.ProcessEnv = process.env): QuotaLimits => ({
  daily: intFromEnv(env.DAILY_AI_LIMIT, 18),
  perIp: intFromEnv(env.PER_IP_DAILY_AI_LIMIT, 5),
});

export type QuotaResult = { ok: true } | { ok: false; reason: 'daily_budget' | 'ip_daily' };

/**
 * Reserves one AI call. Counters only go up, so a failed Gemini call still
 * counts: that matches how Google counts requests against the quota.
 */
export async function reserveAiCall(store: Store, ip: string, limits = quotaLimits(), now = new Date()): Promise<QuotaResult> {
  const day = pacificDay(now);
  const ipCount = await store.incr(`${KEY_PREFIX}ai-ip:${day}:${ip}`, DAY_TTL);
  if (ipCount > limits.perIp) return { ok: false, reason: 'ip_daily' };

  const total = await store.incr(`${KEY_PREFIX}ai-day:${day}`, DAY_TTL);
  if (total > limits.daily) return { ok: false, reason: 'daily_budget' };

  return { ok: true };
}

// --- Shared question bank ---------------------------------------------------
// Every AI call asks for a few extra questions. They are banked per vibe, so
// once the day's AI budget is spent, people still get fresh-to-them questions.

const BANK_MAX = 300;
const BANK_TTL = 30 * 24 * 60 * 60;
const bankKey = (vibe: VibeId) => `${KEY_PREFIX}bank:${vibe}`;

export async function addToBank(store: Store, vibe: VibeId, questions: Question[]): Promise<void> {
  await store.pushList(bankKey(vibe), questions.map(q => JSON.stringify(q)), BANK_MAX, BANK_TTL);
}

export async function drawFromBank(
  store: Store,
  vibe: VibeId,
  previouslyAsked: readonly string[],
  count: number,
  rng: () => number = Math.random,
): Promise<Question[]> {
  const seen = new Set(previouslyAsked.map(normalizeQuestion));
  const unseen = new Map<string, Question>();

  for (const raw of await store.readList(bankKey(vibe), BANK_MAX)) {
    try {
      const q = JSON.parse(raw) as Question;
      if (typeof q?.text !== 'string' || typeof q?.category !== 'string') continue;
      const key = normalizeQuestion(q.text);
      if (!seen.has(key) && !unseen.has(key)) unseen.set(key, q);
    } catch {
      // skip corrupt entry
    }
  }

  const pool = [...unseen.values()];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}
