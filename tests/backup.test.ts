import { beforeEach, describe, expect, it } from 'vitest';
import { backupFileName, createBackup, parseBackup, restoreBackup, type BackupPayload } from '../lib/backup';
import { isPlainObject, merge, mergeKey } from '../lib/transfer';

const store = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => void store.set(k, String(v)),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
  key: (i: number) => [...store.keys()][i] ?? null,
  get length() {
    return store.size;
  },
};

const payload = (data: Record<string, unknown>): BackupPayload => ({ app: 'qa-together', v: 1, exportedAt: '', data: data as Record<string, string> });

beforeEach(() => store.clear());

describe('createBackup', () => {
  it('collects only known keys and excludes cache and adult flag', () => {
    store.set('qa-saved', '["a"]');
    store.set('qa-cache-v2', '{}');
    store.set('qa-adult-ok', '1');
    store.set('other', 'x');
    const backup = createBackup();
    expect(backup.app).toBe('qa-together');
    expect(backup.v).toBe(1);
    expect(Number.isNaN(Date.parse(backup.exportedAt))).toBe(false);
    expect(backup.data).toEqual({ 'qa-saved': '["a"]' });
  });

  it('names files by date', () => {
    expect(backupFileName(new Date(2026, 0, 5))).toBe('qa-backup-2026-01-05.json');
  });
});

describe('parseBackup', () => {
  it('accepts a valid backup', () => {
    expect(parseBackup(JSON.stringify(createBackup())).app).toBe('qa-together');
  });
  it('rejects bad JSON, wrong app/version and bad data', () => {
    expect(() => parseBackup('{nope')).toThrow(/JSON/);
    expect(() => parseBackup(JSON.stringify({ app: 'other', v: 1, data: {} }))).toThrow(/not a backup/);
    expect(() => parseBackup(JSON.stringify({ app: 'qa-together', v: 2, data: {} }))).toThrow(/not a backup/);
    expect(() => parseBackup(JSON.stringify({ app: 'qa-together', v: 1, data: [] }))).toThrow(/no data/);
  });
  it('rejects oversized files', () => {
    expect(() => parseBackup(' '.repeat(5_000_001))).toThrow(/too large/);
  });
});

describe('restoreBackup', () => {
  it('merge keeps existing and unions arrays', () => {
    store.set('qa-saved', '["a","b"]');
    store.set('qa-answered', '{"q1":true}');
    store.set('qa-theme', '"dark"');
    const n = restoreBackup(
      payload({ 'qa-saved': '["b","c"]', 'qa-answered': '{"q1":false,"q2":true}', 'qa-theme': '"light"', 'qa-vibe': '"deep"' }),
      'merge',
    );
    expect(n).toBe(4);
    expect(JSON.parse(store.get('qa-saved')!)).toEqual(['a', 'b', 'c']);
    expect(JSON.parse(store.get('qa-answered')!)).toEqual({ q1: true, q2: true });
    expect(store.get('qa-theme')).toBe('"dark"');
    expect(store.get('qa-vibe')).toBe('"deep"');
  });

  it('replace overwrites', () => {
    store.set('qa-saved', '["a"]');
    store.set('qa-theme', '"dark"');
    expect(restoreBackup(payload({ 'qa-saved': '["z"]' }), 'replace')).toBe(1);
    expect(JSON.parse(store.get('qa-saved')!)).toEqual(['z']);
    expect(store.get('qa-theme')).toBe('"dark"');
  });

  it('ignores unknown keys, non-strings, bad JSON, cache and adult flag', () => {
    const n = restoreBackup(
      payload({ evil: '1', 'qa-adult-ok': '1', 'qa-cache-v2': '{}', 'qa-saved': 5, 'qa-journal': '{bad', 'qa-vibe': '"x"' }),
      'replace',
    );
    expect(n).toBe(1);
    expect([...store.keys()]).toEqual(['qa-vibe']);
  });
});

describe('transfer merge', () => {
  it('unions arrays without duplicates', () => {
    expect(merge([1, { a: 1 }], [{ a: 1 }, 2])).toEqual([1, { a: 1 }, 2]);
  });
  it('lets existing object fields win', () => {
    expect(merge({ a: 1 }, { a: 2, b: 3 })).toEqual({ a: 1, b: 3 });
  });
  it('keeps existing scalars and mismatched types', () => {
    expect(merge('x', 'y')).toBe('x');
    expect(merge([1], { a: 1 })).toEqual([1]);
  });
  it('isPlainObject excludes arrays and null', () => {
    expect(isPlainObject({})).toBe(true);
    expect(isPlainObject([])).toBe(false);
    expect(isPlainObject(null)).toBe(false);
  });
});

describe('names merge', () => {
  it('keeps names set on this device and fills blank slots', () => {
    expect(mergeKey('qa-names', ['Ethan', ''], ['E', 'Brianna'])).toEqual(['Ethan', 'Brianna']);
    expect(mergeKey('qa-names', ['', ''], ['Ethan', 'Brianna'])).toEqual(['Ethan', 'Brianna']);
    expect(mergeKey('qa-names', ['Ethan', 'Bri'], ['Ethan', 'Brianna'])).toEqual(['Ethan', 'Bri']);
  });
  it('never grows the pair and ignores a malformed incoming value', () => {
    expect(mergeKey('qa-names', ['A', 'B'], ['C', 'D'])).toHaveLength(2);
    expect(mergeKey('qa-names', ['A', ''], 'oops')).toEqual(['A', '']);
    expect(mergeKey('qa-names', null, ['A', 'B', 'C'])).toEqual(['A', 'B']);
  });
  it('restoreBackup merges names as a pair', () => {
    store.set('qa-names', JSON.stringify(['', '']));
    restoreBackup(payload({ 'qa-names': JSON.stringify(['Ethan', 'Brianna']) }), 'merge');
    expect(JSON.parse(store.get('qa-names')!)).toEqual(['Ethan', 'Brianna']);
  });
  it('other keys still use the generic merge', () => {
    expect(mergeKey('qa-saved', [1], [1, 2])).toEqual([1, 2]);
  });
});
