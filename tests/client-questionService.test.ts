import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  GenerateError,
  RATE_LIMIT_NOTICE,
  buildDeck,
  estimateFirewallReset,
  fetchQuestions,
  getOfflineQuestions,
  type DeckContext,
} from '../services/questionService';
import { getStarterQuestions } from '../data/starterDeck';
import { SPICY_EXPLICIT } from '../data/spicyDeck';
import { BATCH_SIZE, MAX_FEEDBACK_SENT, MAX_HISTORY_SENT, normalizeQuestion } from '../shared/vibes';
import { MemoryStorage, throwingStorage } from './helpers/clientMemoryStorage';

const WINDOW = 10 * 60 * 1000;
const NOW = new Date('2026-01-01T12:00:00Z').getTime();

let store: MemoryStorage;
let fetchMock: ReturnType<typeof vi.fn>;

const jsonResponse = (body: unknown, init: { status?: number; headers?: Record<string, string> } = {}) =>
  new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'Content-Type': 'application/json', ...init.headers },
  });

const aiQuestions = (n: number, prefix = 'AI question number') =>
  Array.from({ length: n }, (_, i) => ({ text: `${prefix} ${i} unique zebra?`, category: 'AI' }));

const ctx = (over: Partial<DeckContext> = {}): DeckContext => ({
  isOnline: true,
  history: [],
  historyByVibe: {},
  localHistory: [],
  saved: [],
  disliked: [],
  ...over,
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  store = new MemoryStorage();
  fetchMock = vi.fn();
  vi.stubGlobal('localStorage', store);
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('estimateFirewallReset', () => {
  it('is now + window with no recorded requests', () => {
    expect(estimateFirewallReset()).toBe(NOW + WINDOW);
  });
  it('uses the oldest request still inside the window', () => {
    store.setItem('qa-ai-requests', JSON.stringify([NOW - 4 * 60_000, NOW - 8 * 60_000, NOW - 1000]));
    expect(estimateFirewallReset()).toBe(NOW - 8 * 60_000 + WINDOW);
  });
  it('ignores requests older than the window', () => {
    store.setItem('qa-ai-requests', JSON.stringify([NOW - WINDOW - 1, NOW - WINDOW, NOW - 60_000]));
    expect(estimateFirewallReset()).toBe(NOW - 60_000 + WINDOW);
  });
  it('accepts an explicit now', () => {
    expect(estimateFirewallReset(1000)).toBe(1000 + WINDOW);
  });
  it('survives malformed or throwing storage', () => {
    store.setItem('qa-ai-requests', 'garbage');
    expect(estimateFirewallReset()).toBe(NOW + WINDOW);
    vi.stubGlobal('localStorage', throwingStorage());
    expect(estimateFirewallReset()).toBe(NOW + WINDOW);
  });
});

describe('fetchQuestions', () => {
  const req = { vibe: 'playful' as const, previouslyAsked: ['a'], liked: [], disliked: [] };

  it('posts the request and returns sanitised questions', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        questions: [{ text: 'One?', category: 'Cat', extra: 'drop' }, { text: 5, category: 'x' }, null, { text: 'No cat' }],
        source: 'bank',
        notice: 'hello',
      }),
    );
    const result = await fetchQuestions(req);
    expect(result).toEqual({ questions: [{ text: 'One?', category: 'Cat' }], source: 'bank', notice: 'hello' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/generate');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual(req);
  });

  it('defaults source to ai and ignores non-string notice', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ questions: aiQuestions(1), source: 'weird', notice: 3 }));
    const result = await fetchQuestions(req);
    expect(result.source).toBe('ai');
    expect(result.notice).toBeUndefined();
  });

  it('logs each request for the firewall estimate', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ questions: aiQuestions(1) }));
    await fetchQuestions(req);
    expect(JSON.parse(store.getItem('qa-ai-requests')!)).toEqual([NOW]);
  });

  it('keeps only the last 10 logged requests', async () => {
    store.setItem('qa-ai-requests', JSON.stringify(Array.from({ length: 12 }, (_, i) => NOW - 1000 + i)));
    fetchMock.mockResolvedValue(jsonResponse({ questions: aiQuestions(1) }));
    await fetchQuestions(req);
    const log = JSON.parse(store.getItem('qa-ai-requests')!);
    expect(log).toHaveLength(10);
    expect(log.at(-1)).toBe(NOW);
  });

  it('caches results so they can be dealt offline', async () => {
    const qs = aiQuestions(3, 'Cached gem');
    fetchMock.mockResolvedValue(jsonResponse({ questions: qs }));
    await fetchQuestions(req);
    const offline = getOfflineQuestions('playful', [], 1000);
    for (const q of qs) expect(offline).toContainEqual(q);
  });

  it('dedupes cached questions by normalised text', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ questions: [{ text: 'Same thing?', category: 'A' }] }));
    await fetchQuestions(req);
    fetchMock.mockResolvedValue(jsonResponse({ questions: [{ text: 'same THING', category: 'B' }] }));
    await fetchQuestions(req);
    const cache = JSON.parse(store.getItem('qa-cache-v2')!);
    expect(cache.playful).toHaveLength(1);
  });

  it('caps the cache at 120 per vibe, keeping the newest', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ questions: aiQuestions(100, 'first batch') }));
    await fetchQuestions(req);
    fetchMock.mockResolvedValue(jsonResponse({ questions: aiQuestions(100, 'second batch') }));
    await fetchQuestions(req);
    const cache = JSON.parse(store.getItem('qa-cache-v2')!);
    expect(cache.playful).toHaveLength(120);
    expect(cache.playful.at(-1).text).toContain('second batch');
  });

  it('throws a network error when fetch rejects', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(fetchQuestions(req)).rejects.toMatchObject({ code: 'network', message: "Couldn't reach the server." });
  });

  it('throws rate_limited on 429 with retry-after', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, { status: 429, headers: { 'retry-after': '30' } }));
    const err = await fetchQuestions(req).catch(e => e);
    expect(err).toBeInstanceOf(GenerateError);
    expect(err.code).toBe('rate_limited');
    expect(err.message).toBe(RATE_LIMIT_NOTICE);
    expect(err.retryAt).toBe(NOW + 30_000);
  });

  it('estimates retryAt from the request log when 429 has no retry-after', async () => {
    store.setItem('qa-ai-requests', JSON.stringify([NOW - 5 * 60_000]));
    fetchMock.mockResolvedValue(jsonResponse({}, { status: 429 }));
    const err = await fetchQuestions(req).catch(e => e);
    expect(err.retryAt).toBe(NOW - 5 * 60_000 + WINDOW);
  });

  it('treats non-numeric or non-positive retry-after as missing', async () => {
    for (const value of ['soon', '0', '-5']) {
      store.clear();
      fetchMock.mockResolvedValue(jsonResponse({}, { status: 429, headers: { 'retry-after': value } }));
      const err = await fetchQuestions(req).catch(e => e);
      // The request itself was just logged at NOW, so the window ends at NOW + WINDOW.
      expect(err.retryAt).toBe(NOW + WINDOW);
    }
  });

  it('treats a Vercel firewall mitigation (even on 403) as rate limited', async () => {
    fetchMock.mockResolvedValue(new Response('blocked', { status: 403, headers: { 'x-vercel-mitigated': 'deny' } }));
    const err = await fetchQuestions(req).catch(e => e);
    expect(err.code).toBe('rate_limited');
    expect(err.retryAt).toBe(NOW + WINDOW);
  });

  it('surfaces server error message and code', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: 'quota', message: 'Daily limit reached.' }, { status: 503 }));
    await expect(fetchQuestions(req)).rejects.toMatchObject({ code: 'quota', message: 'Daily limit reached.' });
  });

  it('falls back to a generic message for non-JSON error bodies', async () => {
    fetchMock.mockResolvedValue(new Response('<html>', { status: 502 }));
    await expect(fetchQuestions(req)).rejects.toMatchObject({ code: 'failed', message: 'Server error (502).' });
  });

  it('throws empty when no valid questions come back', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ questions: [{ text: 1 }] }));
    await expect(fetchQuestions(req)).rejects.toMatchObject({ code: 'empty' });
    fetchMock.mockResolvedValue(jsonResponse({}));
    await expect(fetchQuestions(req)).rejects.toMatchObject({ code: 'empty' });
  });
});

describe('getOfflineQuestions', () => {
  it('deals from the starter deck with an empty cache', () => {
    const starter = new Set(getStarterQuestions('deep').map(q => q.text));
    const qs = getOfflineQuestions('deep', [], 5);
    expect(qs).toHaveLength(5);
    for (const q of qs) expect(starter.has(q.text)).toBe(true);
  });

  it('prefers unseen questions and falls back to repeats', () => {
    const starter = getStarterQuestions('deep');
    const unseen = starter.slice(0, 3);
    const history = starter.slice(3).map(q => q.text);
    const qs = getOfflineQuestions('deep', history, starter.length);
    expect(qs.slice(0, 3).map(q => q.text).sort()).toEqual(unseen.map(q => q.text).sort());
    expect(qs).toHaveLength(starter.length);
  });

  it('matches history by normalised text', () => {
    const [first, ...rest] = getStarterQuestions('deep');
    const qs = getOfflineQuestions('deep', [first.text.toUpperCase() + '!!!'], rest.length);
    expect(qs.map(q => q.text)).not.toContain(first.text);
  });

  it('honours count and defaults to BATCH_SIZE', () => {
    expect(getOfflineQuestions('mix', [])).toHaveLength(BATCH_SIZE);
    expect(getOfflineQuestions('deep', [], 2)).toHaveLength(2);
  });

  it('returns no duplicate questions', () => {
    const qs = getOfflineQuestions('mix', [], 1000);
    expect(new Set(qs.map(q => normalizeQuestion(q.text))).size).toBe(qs.length);
  });

  it('includes cached questions for the vibe', () => {
    const cached = { text: 'Cached only question zz?', category: 'AI' };
    store.setItem('qa-cache-v2', JSON.stringify({ deep: [cached] }));
    expect(getOfflineQuestions('deep', [], 1000)).toContainEqual(cached);
  });

  it('mix includes cache from other vibes but never spicy', () => {
    const a = { text: 'Playful cache zz?', category: 'AI' };
    const b = { text: 'Spicy cache zz?', category: 'AI' };
    store.setItem('qa-cache-v2', JSON.stringify({ playful: [a], spicy: [b] }));
    const texts = getOfflineQuestions('mix', [], 1000).map(q => q.text);
    expect(texts).toContain(a.text);
    expect(texts).not.toContain(b.text);
  });

  it('does not leak other vibes cache into a specific vibe', () => {
    store.setItem('qa-cache-v2', JSON.stringify({ playful: [{ text: 'Playful only zz?', category: 'AI' }] }));
    expect(getOfflineQuestions('deep', [], 1000).map(q => q.text)).not.toContain('Playful only zz?');
  });

  it('migrates the legacy string cache into mix and removes it', () => {
    store.setItem('qa-cached-questions', JSON.stringify(['Legacy one?', 42, 'Legacy two?']));
    const texts = getOfflineQuestions('mix', [], 1000).map(q => q.text);
    expect(texts).toContain('Legacy one?');
    expect(texts).toContain('Legacy two?');
    expect(store.getItem('qa-cached-questions')).toBeNull();
    const cache = JSON.parse(store.getItem('qa-cache-v2')!);
    expect(cache.mix).toEqual([
      { text: 'Legacy one?', category: 'Classic' },
      { text: 'Legacy two?', category: 'Classic' },
    ]);
  });

  it('works with storage that throws', () => {
    vi.stubGlobal('localStorage', throwingStorage());
    expect(getOfflineQuestions('deep', [], 4)).toHaveLength(4);
  });
});

describe('buildDeck', () => {
  it('uses AI questions and returns the server notice', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ questions: aiQuestions(BATCH_SIZE), notice: 'Heads up' }));
    const deck = await buildDeck('playful', ctx());
    expect(deck.questions).toHaveLength(BATCH_SIZE);
    expect(deck.questions.every(q => q.category === 'AI')).toBe(true);
    expect(deck.notice).toBe('Heads up');
    expect(deck.retryAt).toBeUndefined();
  });

  it('filters out already-seen AI questions and tops up from offline', async () => {
    const qs = aiQuestions(BATCH_SIZE);
    fetchMock.mockResolvedValue(jsonResponse({ questions: qs }));
    const deck = await buildDeck('playful', ctx({ history: [qs[0].text, qs[1].text.toUpperCase()] }));
    const texts = deck.questions.map(q => q.text);
    expect(texts).not.toContain(qs[0].text);
    expect(texts).not.toContain(qs[1].text);
    expect(deck.questions).toHaveLength(BATCH_SIZE);
    expect(new Set(texts.map(normalizeQuestion)).size).toBe(texts.length);
  });

  it('truncates an oversized AI response to the batch size', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ questions: aiQuestions(BATCH_SIZE + 10) }));
    const deck = await buildDeck('playful', ctx());
    expect(deck.questions).toHaveLength(BATCH_SIZE);
  });

  it('sends per-vibe history, capped, plus feedback without local cards', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ questions: aiQuestions(BATCH_SIZE) }));
    const byVibe = Array.from({ length: MAX_HISTORY_SENT + 20 }, (_, i) => `h${i}`);
    const saved = Array.from({ length: MAX_FEEDBACK_SENT + 4 }, (_, i) => ({ text: `s${i}`, category: 'c' }));
    await buildDeck(
      'deep',
      ctx({
        history: ['everything'],
        historyByVibe: { deep: byVibe, playful: ['other'] },
        saved: [...saved, { text: 'explicit', category: 'c', local: true }],
        disliked: [{ text: 'd1', category: 'c' }, { text: 'dlocal', category: 'c', local: true }],
      }),
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.vibe).toBe('deep');
    expect(body.previouslyAsked).toEqual(byVibe.slice(-MAX_HISTORY_SENT));
    expect(body.liked).toHaveLength(MAX_FEEDBACK_SENT);
    expect(body.liked).not.toContain('explicit');
    expect(body.disliked).toEqual(['d1']);
  });

  it('mix sends the full history', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ questions: aiQuestions(BATCH_SIZE) }));
    await buildDeck('mix', ctx({ history: ['x', 'y'], historyByVibe: { mix: ['z'] } }));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).previouslyAsked).toEqual(['x', 'y']);
  });

  it('skips the network when offline and deals starter questions', async () => {
    const deck = await buildDeck('mix', ctx({ isOnline: false }));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(deck.questions).toHaveLength(BATCH_SIZE);
    const starter = new Set(getStarterQuestions('mix').map(q => q.text));
    expect(deck.questions.every(q => starter.has(q.text))).toBe(true);
    expect(deck.notice).toBeNull();
  });

  it('skips the network during cooldown and reports retryAt', async () => {
    const until = NOW + 60_000;
    const deck = await buildDeck('deep', ctx({ cooldownUntil: until }));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(deck.notice).toBe(RATE_LIMIT_NOTICE);
    expect(deck.retryAt).toBe(until);
    expect(deck.questions.length).toBeGreaterThan(0);
  });

  it('ignores an expired or null cooldown', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ questions: aiQuestions(BATCH_SIZE) }));
    await buildDeck('deep', ctx({ cooldownUntil: NOW - 1 }));
    await buildDeck('deep', ctx({ cooldownUntil: null }));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('falls back to offline questions with retryAt on 429', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, { status: 429, headers: { 'retry-after': '120' } }));
    const deck = await buildDeck('mix', ctx());
    expect(deck.notice).toBe(RATE_LIMIT_NOTICE);
    expect(deck.retryAt).toBe(NOW + 120_000);
    expect(deck.questions).toHaveLength(BATCH_SIZE);
  });

  it('falls back with an explanatory notice on network failure', async () => {
    fetchMock.mockRejectedValue(new Error('offline'));
    const deck = await buildDeck('mix', ctx());
    expect(deck.notice).toBe("Couldn't reach the server. Dealt from saved and built-in questions instead.");
    expect(deck.retryAt).toBeUndefined();
    expect(deck.questions).toHaveLength(BATCH_SIZE);
  });

  it('falls back using the server message on other errors', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: 'Out of budget.' }, { status: 503 }));
    const deck = await buildDeck('mix', ctx());
    expect(deck.notice).toBe('Out of budget. Dealt from saved and built-in questions instead.');
  });

  it('excludes seen questions from the offline fallback when enough remain', async () => {
    fetchMock.mockRejectedValue(new Error('x'));
    const history = getStarterQuestions('deep').slice(0, 5).map(q => q.text);
    const deck = await buildDeck('deep', ctx({ history }));
    for (const h of history) expect(deck.questions.map(q => q.text)).not.toContain(h);
  });

  it('returns an empty deck with a notice when everything has been seen', async () => {
    const history = getStarterQuestions('deep').map(q => q.text);
    const deck = await buildDeck('deep', ctx({ isOnline: false, history }));
    expect(deck.questions).toHaveLength(0);
    expect(deck.notice).toBe('No questions available right now.');
  });

  it('keeps an existing notice when the deck is empty', async () => {
    const history = getStarterQuestions('deep').map(q => q.text);
    const deck = await buildDeck('deep', ctx({ history, cooldownUntil: NOW + 1000 }));
    expect(deck.questions).toHaveLength(0);
    expect(deck.notice).toBe(RATE_LIMIT_NOTICE);
  });

  describe('spicy', () => {
    const explicitTexts = new Set(SPICY_EXPLICIT.map(q => q.text));

    it('adds 8 on-device explicit cards and 12 AI cards, never sending explicit ones', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ questions: aiQuestions(BATCH_SIZE) }));
      const deck = await buildDeck('spicy', ctx());
      expect(deck.questions).toHaveLength(BATCH_SIZE);
      expect(deck.questions.filter(q => explicitTexts.has(q.text))).toHaveLength(8);
      expect(deck.questions.filter(q => q.category === 'AI')).toHaveLength(12);
      const body = fetchMock.mock.calls[0][1].body as string;
      for (const t of explicitTexts) expect(body).not.toContain(t);
    });

    it('spreads explicit cards through the deck', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ questions: aiQuestions(BATCH_SIZE) }));
      const deck = await buildDeck('spicy', ctx());
      const idx = deck.questions.map((q, i) => (explicitTexts.has(q.text) ? i : -1)).filter(i => i >= 0);
      expect(idx[0]).toBeLessThan(5);
      expect(idx.at(-1)).toBeGreaterThan(deck.questions.length - 8);
    });

    it('prefers explicit cards not in localHistory', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ questions: aiQuestions(BATCH_SIZE) }));
      const localHistory = SPICY_EXPLICIT.slice(0, SPICY_EXPLICIT.length - 8).map(q => q.text);
      const deck = await buildDeck('spicy', ctx({ localHistory }));
      const explicit = deck.questions.filter(q => explicitTexts.has(q.text)).map(q => q.text);
      expect(explicit.sort()).toEqual(SPICY_EXPLICIT.slice(-8).map(q => q.text).sort());
    });

    it('still deals explicit cards offline', async () => {
      const deck = await buildDeck('spicy', ctx({ isOnline: false }));
      expect(fetchMock).not.toHaveBeenCalled();
      expect(deck.questions.filter(q => explicitTexts.has(q.text))).toHaveLength(8);
      expect(deck.questions).toHaveLength(BATCH_SIZE);
    });
  });

  it('non-spicy decks contain no explicit cards', async () => {
    const deck = await buildDeck('mix', ctx({ isOnline: false }));
    const explicitTexts = new Set(SPICY_EXPLICIT.map(q => q.text));
    expect(deck.questions.some(q => explicitTexts.has(q.text))).toBe(false);
  });
});
