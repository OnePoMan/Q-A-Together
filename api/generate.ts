import { BANK_EXTRA, BATCH_SIZE, type Question } from '../shared/vibes.js';
import { buildPrompt, sample } from '../server/prompt.js';
import { InputError, parseGenerateInput, sanitizeQuestions, type GenerateInput } from '../server/validate.js';
import { RateLimiter } from '../server/rateLimit.js';
import { UpstreamError, generateRaw } from '../server/gemini.js';
import { HttpError, clientIp, fail, readJsonPost, sendError, type ApiRequest, type ApiResponse } from '../server/http.js';
import { getStore, type Store } from '../server/store.js';
import { addToBank, drawFromBank, reserveAiCall } from '../server/quota.js';

export type { ApiRequest, ApiResponse };

const MIN_QUESTIONS = 8;

// First line of defence is the Vercel Firewall rule on /api/generate. This
// per-instance limiter only catches bursts that reach one warm instance.
const burstLimiter = new RateLimiter(8, 10 * 60 * 1000);

type Source = 'ai' | 'bank';

const NOTICES = {
  daily_budget: "Today's fresh AI questions are used up. Dealing from the question bank until midnight Pacific.",
  ip_daily: "You've had a lot of fresh decks today. Dealing from the question bank for now.",
  upstream: 'The AI is busy right now. Dealing from the question bank instead.',
} as const;

async function serveFromBank(
  res: ApiResponse,
  store: Store,
  input: GenerateInput,
  notice: string,
  fallback: HttpError,
) {
  const questions = await drawFromBank(store, input.vibe, input.previouslyAsked, BATCH_SIZE).catch(() => []);
  if (questions.length === 0) return sendError(res, fallback);
  return res.status(200).json({ questions, vibe: input.vibe, source: 'bank' satisfies Source, notice });
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  let input: GenerateInput;
  try {
    const body = readJsonPost(req, res);
    input = parseGenerateInput(body);
  } catch (error) {
    if (error instanceof HttpError) return sendError(res, error);
    if (error instanceof InputError) return fail(res, 400, 'bad_request', error.message);
    throw error;
  }

  const ip = clientIp(req);
  const retryAfter = burstLimiter.check(ip);
  if (retryAfter > 0) {
    return sendError(res, new HttpError(429, 'rate_limited', `Slow down a little. Try again in ${retryAfter}s.`), retryAfter);
  }

  const store = getStore();
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('[generate] GEMINI_API_KEY is not set');
    return fail(res, 503, 'not_configured', 'The question generator is not configured yet.');
  }

  const quota = await reserveAiCall(store, ip).catch(error => {
    // Fail open: Gemini's own quota is still the hard stop.
    console.error('[generate] quota check failed:', error);
    return { ok: true } as const;
  });
  if (!quota.ok) {
    return serveFromBank(res, store, input, NOTICES[quota.reason], new HttpError(429, quota.reason, NOTICES[quota.reason].split('.')[0] + '.'));
  }

  const count = BATCH_SIZE + BANK_EXTRA;
  const { system, user, categories } = buildPrompt(input.vibe, input.previouslyAsked, count, Math.random, input);

  let questions: Question[];
  try {
    const { data, model } = await generateRaw({ apiKey, system, prompt: user, categories });
    // Models tend to return questions grouped by category; shuffle so a deck mixes them.
    questions = sample(sanitizeQuestions(data, categories, input.previouslyAsked, count), count);
    if (questions.length < MIN_QUESTIONS) {
      console.error(`[generate] ${model} returned only ${questions.length} usable questions`);
      return serveFromBank(res, store, input, NOTICES.upstream, new HttpError(502, 'bad_output', 'The AI had an off moment. Try again.'));
    }
  } catch (error) {
    // Details stay in the server logs; clients only get a stable code.
    console.error('[generate] failed:', error);
    const status = error instanceof UpstreamError ? error.status : undefined;
    const fallback =
      status === 429
        ? new HttpError(503, 'upstream_busy', 'The AI is busy right now. Try again in a minute.')
        : new HttpError(502, 'upstream_error', "Couldn't reach the AI. Try again shortly.");
    return serveFromBank(res, store, input, NOTICES.upstream, fallback);
  }

  await addToBank(store, input.vibe, questions).catch(error => console.error('[generate] bank write failed:', error));
  return res.status(200).json({ questions: questions.slice(0, BATCH_SIZE), vibe: input.vibe, source: 'ai' satisfies Source });
}
