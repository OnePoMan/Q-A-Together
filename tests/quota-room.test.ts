import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryStore, setStore } from '../server/store';
import { addToBank, drawFromBank, pacificDay, reserveAiCall } from '../server/quota';

describe('pacificDay', () => {
  it('rolls over at midnight Pacific, not UTC', () => {
    // 2026-09-27 06:59 UTC is still 23:59 on the 26th in Los Angeles (PDT).
    expect(pacificDay(new Date('2026-09-27T06:59:00Z'))).toBe('2026-09-26');
    expect(pacificDay(new Date('2026-09-27T07:00:00Z'))).toBe('2026-09-27');
  });
});

describe('reserveAiCall', () => {
  it('enforces per-IP and global daily limits', async () => {
    const store = new MemoryStore();
    const limits = { daily: 3, perIp: 2 };
    const now = new Date('2026-09-27T12:00:00Z');
    expect(await reserveAiCall(store, 'a', limits, now)).toEqual({ ok: true });
    expect(await reserveAiCall(store, 'a', limits, now)).toEqual({ ok: true });
    expect(await reserveAiCall(store, 'a', limits, now)).toEqual({ ok: false, reason: 'ip_daily' });
    expect(await reserveAiCall(store, 'b', limits, now)).toEqual({ ok: true });
    expect(await reserveAiCall(store, 'c', limits, now)).toEqual({ ok: false, reason: 'daily_budget' });
    // Next Pacific day starts fresh.
    expect(await reserveAiCall(store, 'c', limits, new Date('2026-09-28T12:00:00Z'))).toEqual({ ok: true });
  });
});

describe('question bank', () => {
  it('returns unseen, de-duplicated questions for the vibe', async () => {
    const store = new MemoryStore();
    await addToBank(store, 'playful', [
      { text: 'Seen already?', category: 'A' },
      { text: 'Fresh one?', category: 'B' },
      { text: 'fresh ONE', category: 'B' },
    ]);
    await addToBank(store, 'deep', [{ text: 'Other vibe?', category: 'C' }]);
    const drawn = await drawFromBank(store, 'playful', ['seen already'], 10);
    expect(drawn.map(q => q.text)).toHaveLength(1);
    expect(drawn[0].text.toLowerCase()).toContain('fresh');
  });
});

describe('generate handler with quota', () => {
  const base = { host: 'app.example', origin: 'https://app.example', 'content-type': 'application/json' };
  const makeRes = () => {
    const res = {
      statusCode: 0,
      body: undefined as any,
      status(code: number) {
        res.statusCode = code;
        return res;
      },
      setHeader() {},
      json(payload: unknown) {
        res.body = payload;
      },
    };
    return res;
  };

  beforeEach(() => {
    vi.resetModules();
    process.env.GEMINI_API_KEY = 'k';
    process.env.DAILY_AI_LIMIT = '1';
  });
  afterEach(() => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.DAILY_AI_LIMIT;
    vi.doUnmock('../server/gemini.js');
  });

  it('banks extras, then serves the bank once the daily budget is spent', async () => {
    const store = new MemoryStore();
    const generateRaw = vi.fn().mockResolvedValue({
      model: 'm',
      data: [...Array(30).keys()].map(i => ({ text: `Banked question number ${i}?`, category: 'x' })),
    });
    vi.doMock('../server/gemini.js', async importOriginal => ({
      ...(await importOriginal<typeof import('../server/gemini')>()),
      generateRaw,
    }));
    const storeModule = await import('../server/store');
    storeModule.setStore(store);
    const { default: handler } = await import('../api/generate');

    let res = makeRes();
    await handler({ method: 'POST', headers: { ...base, 'x-real-ip': '1.1.1.1' }, body: { vibe: 'deep' } }, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.source).toBe('ai');
    expect(res.body.questions).toHaveLength(20);

    res = makeRes();
    await handler(
      { method: 'POST', headers: { ...base, 'x-real-ip': '2.2.2.2' }, body: { vibe: 'deep', previouslyAsked: ['Banked question number 0?'] } },
      res,
    );
    expect(generateRaw).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(200);
    expect(res.body.source).toBe('bank');
    expect(res.body.notice).toMatch(/used up/);
    expect(res.body.questions.some((q: { text: string }) => q.text === 'Banked question number 0?')).toBe(false);
  });
});

describe('room handler', () => {
  const base = { host: 'app.example', origin: 'https://app.example', 'content-type': 'application/json', 'x-real-ip': '9.9.9.9' };
  const call = async (body: unknown, headers: Record<string, string | undefined> = base) => {
    const { default: handler } = await import('../api/room');
    const res = {
      statusCode: 0,
      body: undefined as any,
      status(code: number) {
        res.statusCode = code;
        return res;
      },
      setHeader() {},
      json(payload: unknown) {
        res.body = payload;
      },
    };
    await handler({ method: 'POST', headers, body }, res);
    return res;
  };

  beforeEach(() => setStore(new MemoryStore()));

  it('creates, reads, syncs position and replaces the deck', async () => {
    const created = await call({ action: 'create', vibe: 'us', questions: [{ text: 'Q one?', category: 'A' }, { text: 'Q two?', category: 'B' }] });
    expect(created.statusCode).toBe(201);
    const code = created.body.code;
    expect(code).toMatch(/^[A-Z2-9]{6}$/);

    const updated = await call({ action: 'update', code: code.toLowerCase(), index: 1 });
    expect(updated.body.index).toBe(1);
    expect(updated.body.version).toBe(2);

    const same = await call({ action: 'get', code, version: 2 });
    expect(same.body).toEqual({ unchanged: true, version: 2 });

    const replaced = await call({ action: 'update', code, vibe: 'deep', questions: [{ text: 'New deck?', category: 'C' }] });
    expect(replaced.body).toMatchObject({ vibe: 'deep', index: 0, version: 3 });
  });

  it('validates input and origin', async () => {
    expect((await call({ action: 'create', vibe: 'nope', questions: [{ text: 'x', category: '' }] })).statusCode).toBe(400);
    expect((await call({ action: 'get', code: 'BAD' })).statusCode).toBe(400);
    expect((await call({ action: 'get', code: 'ZZZZZZ' })).statusCode).toBe(404);
    expect((await call({ action: 'get', code: 'ZZZZZZ' }, { ...base, origin: 'https://evil.example' })).statusCode).toBe(403);
    const created = await call({ action: 'create', vibe: 'us', questions: [{ text: 'Q?', category: '' }] });
    expect((await call({ action: 'update', code: created.body.code, index: 5 })).statusCode).toBe(400);
  });

  it('throttles code guessing and room creation', async () => {
    const guesses = [];
    for (let i = 0; i < 22; i++) guesses.push((await call({ action: 'get', code: 'ZZZZZZ' })).statusCode);
    expect(guesses.at(-1)).toBe(429);

    const creates = [];
    for (let i = 0; i < 11; i++) {
      creates.push((await call({ action: 'create', vibe: 'us', questions: [{ text: 'Q?', category: '' }] }, { ...base, 'x-real-ip': '8.8.8.8' })).statusCode);
    }
    expect(creates.at(-1)).toBe(429);
  });
});

describe('secondsUntilPacificMidnight', () => {
  it('counts down to midnight in Los Angeles', async () => {
    const { secondsUntilPacificMidnight } = await import('../server/quota');
    // 23:00 PDT on Sep 26 = 06:00 UTC on Sep 27.
    expect(secondsUntilPacificMidnight(new Date('2026-09-27T06:00:00Z'))).toBe(3600);
  });
});
