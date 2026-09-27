import { Redis } from '@upstash/redis';

/**
 * Tiny key-value interface over Upstash Redis. When no Redis credentials are
 * configured (local dev, tests) it falls back to per-instance memory, which is
 * fine for development but not shared between serverless instances.
 */
export interface Store {
  readonly shared: boolean;
  /** Increments a counter and sets its TTL on first use. Returns the new value. */
  incr(key: string, ttlSeconds: number): Promise<number>;
  get(key: string): Promise<string | null>;
  /** Returns false when `nx` is set and the key already exists. */
  set(key: string, value: string, ttlSeconds: number, nx?: boolean): Promise<boolean>;
  del(key: string): Promise<void>;
  /** Prepends values and trims the list to `max` entries. */
  pushList(key: string, values: string[], max: number, ttlSeconds: number): Promise<void>;
  readList(key: string, max: number): Promise<string[]>;
}

export const KEY_PREFIX = 'qa:';

class RedisStore implements Store {
  readonly shared = true;
  constructor(private readonly redis: Redis) {}

  async incr(key: string, ttlSeconds: number) {
    const [count] = await this.redis.pipeline().incr(key).expire(key, ttlSeconds, 'NX').exec<[number, number]>();
    return count;
  }
  async get(key: string) {
    return (await this.redis.get<string>(key)) ?? null;
  }
  async set(key: string, value: string, ttlSeconds: number, nx = false) {
    const result = nx
      ? await this.redis.set(key, value, { ex: ttlSeconds, nx: true })
      : await this.redis.set(key, value, { ex: ttlSeconds });
    return result === 'OK';
  }
  async del(key: string) {
    await this.redis.del(key);
  }
  async pushList(key: string, values: string[], max: number, ttlSeconds: number) {
    if (values.length === 0) return;
    await this.redis
      .pipeline()
      .lpush(key, ...values)
      .ltrim(key, 0, max - 1)
      .expire(key, ttlSeconds)
      .exec();
  }
  async readList(key: string, max: number) {
    return this.redis.lrange<string>(key, 0, max - 1);
  }
}

export class MemoryStore implements Store {
  readonly shared = false;
  private data = new Map<string, { value: string | string[]; expires: number }>();

  private live(key: string, now = Date.now()) {
    const entry = this.data.get(key);
    if (entry && entry.expires <= now) {
      this.data.delete(key);
      return undefined;
    }
    return entry;
  }

  async incr(key: string, ttlSeconds: number) {
    const entry = this.live(key);
    const next = Number(entry?.value ?? 0) + 1;
    this.data.set(key, { value: String(next), expires: entry?.expires ?? Date.now() + ttlSeconds * 1000 });
    return next;
  }
  async get(key: string) {
    const value = this.live(key)?.value;
    return typeof value === 'string' ? value : null;
  }
  async set(key: string, value: string, ttlSeconds: number, nx = false) {
    if (nx && this.live(key)) return false;
    this.data.set(key, { value, expires: Date.now() + ttlSeconds * 1000 });
    return true;
  }
  async del(key: string) {
    this.data.delete(key);
  }
  async pushList(key: string, values: string[], max: number, ttlSeconds: number) {
    const current = this.live(key)?.value;
    const list = [...[...values].reverse(), ...(Array.isArray(current) ? current : [])].slice(0, max);
    this.data.set(key, { value: list, expires: Date.now() + ttlSeconds * 1000 });
  }
  async readList(key: string, max: number) {
    const value = this.live(key)?.value;
    return Array.isArray(value) ? value.slice(0, max) : [];
  }
}

let store: Store | null = null;

export function getStore(env: NodeJS.ProcessEnv = process.env): Store {
  if (store) return store;
  // Vercel KV / Upstash integrations use either naming scheme.
  const url = env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL;
  const token = env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    store = new RedisStore(new Redis({ url, token, automaticDeserialization: false }));
  } else {
    console.warn('[store] No Redis credentials; using per-instance memory (not shared).');
    store = new MemoryStore();
  }
  return store;
}

/** For tests. */
export function setStore(next: Store | null) {
  store = next;
}
