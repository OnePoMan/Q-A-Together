/**
 * Best-effort, in-memory sliding-window rate limiter.
 *
 * Serverless instances are ephemeral and not shared, so this only slows down a
 * single client hammering one warm instance. For a hard guarantee, put a rate
 * limit rule in front of /api/generate (Vercel Firewall, Upstash, etc.).
 */
export class RateLimiter {
  private hits = new Map<string, number[]>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly maxKeys = 5000,
  ) {}

  /** Returns 0 if allowed, otherwise the number of seconds until the next slot frees up. */
  check(key: string, now = Date.now()): number {
    const windowStart = now - this.windowMs;
    const recent = (this.hits.get(key) ?? []).filter(t => t > windowStart);

    if (recent.length >= this.limit) {
      this.hits.set(key, recent);
      return Math.max(1, Math.ceil((recent[0] + this.windowMs - now) / 1000));
    }

    recent.push(now);
    this.hits.delete(key); // re-insert to keep Map order ~ least recently used first
    this.hits.set(key, recent);

    if (this.hits.size > this.maxKeys) {
      const oldest = this.hits.keys().next().value;
      if (oldest !== undefined) this.hits.delete(oldest);
    }
    return 0;
  }
}
