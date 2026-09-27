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

export const MAX_BODY_BYTES = 32 * 1024;

export const header = (req: ApiRequest, name: string): string | undefined => {
  const value = req.headers[name];
  return Array.isArray(value) ? value[0] : value;
};

export const clientIp = (req: ApiRequest): string =>
  header(req, 'x-real-ip') || header(req, 'x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

/**
 * Browsers always send Origin on POST. Requiring it to match this deployment (or
 * ALLOWED_ORIGINS) stops other sites from spending your quota through visitors'
 * browsers, and turns away the laziest scripted abuse. It is not authentication.
 */
export function isAllowedOrigin(req: ApiRequest): boolean {
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

export const fail = (res: ApiResponse, status: number, error: string, message: string) =>
  res.status(status).json({ error, message });

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Common guards for the JSON POST endpoints. Returns the parsed body or throws
 * HttpError, which callers turn into a response with `sendError`.
 */
export function readJsonPost(req: ApiRequest, res: ApiResponse): unknown {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    throw new HttpError(405, 'method_not_allowed', 'Use POST.');
  }
  if (!isAllowedOrigin(req)) throw new HttpError(403, 'forbidden', 'Requests must come from the app.');
  if (!header(req, 'content-type')?.toLowerCase().startsWith('application/json')) {
    throw new HttpError(415, 'unsupported_media_type', 'Send JSON.');
  }

  const body = req.body;
  if (typeof body === 'string') {
    if (body.length > MAX_BODY_BYTES) throw new HttpError(413, 'too_large', 'Request too large.');
    if (body === '') return undefined;
    try {
      return JSON.parse(body);
    } catch {
      throw new HttpError(400, 'bad_request', 'Invalid JSON.');
    }
  }
  if (JSON.stringify(body ?? null).length > MAX_BODY_BYTES) throw new HttpError(413, 'too_large', 'Request too large.');
  return body;
}

export function sendError(res: ApiResponse, error: HttpError, retryAfter?: number) {
  if (retryAfter) res.setHeader('Retry-After', String(retryAfter));
  return fail(res, error.status, error.code, error.message);
}
