import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readJson, writeJson } from '../lib/storage';
import { MemoryStorage, throwingStorage } from './helpers/clientMemoryStorage';

let store: MemoryStorage;
beforeEach(() => {
  store = new MemoryStorage();
  vi.stubGlobal('localStorage', store);
});
afterEach(() => vi.unstubAllGlobals());

describe('readJson', () => {
  it('returns the fallback for a missing key', () => {
    expect(readJson('nope', { a: 1 })).toEqual({ a: 1 });
  });
  it('parses stored JSON', () => {
    store.setItem('k', '{"x":[1,2]}');
    expect(readJson('k', null)).toEqual({ x: [1, 2] });
  });
  it('returns stored falsy values rather than the fallback', () => {
    store.setItem('zero', '0');
    store.setItem('nul', 'null');
    expect(readJson('zero', 5)).toBe(0);
    expect(readJson('nul', 5)).toBeNull();
  });
  it('returns the fallback for malformed JSON', () => {
    store.setItem('k', '{oops');
    expect(readJson('k', 'fb')).toBe('fb');
  });
  it('returns the fallback when storage throws', () => {
    vi.stubGlobal('localStorage', throwingStorage());
    expect(readJson('k', 'fb')).toBe('fb');
  });
  it('returns the fallback when localStorage is undefined', () => {
    vi.stubGlobal('localStorage', undefined);
    expect(readJson('k', 'fb')).toBe('fb');
  });
});

describe('writeJson', () => {
  it('round-trips values', () => {
    writeJson('k', { a: [1, 'two'] });
    expect(store.getItem('k')).toBe('{"a":[1,"two"]}');
    expect(readJson('k', null)).toEqual({ a: [1, 'two'] });
  });
  it('overwrites existing values', () => {
    writeJson('k', 1);
    writeJson('k', 2);
    expect(readJson('k', 0)).toBe(2);
  });
  it('does not throw when storage throws', () => {
    vi.stubGlobal('localStorage', throwingStorage());
    expect(() => writeJson('k', 1)).not.toThrow();
  });
  it('does not throw for unserializable values', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(() => writeJson('k', circular)).not.toThrow();
    expect(store.getItem('k')).toBeNull();
  });
  it('does not throw when quota is exceeded', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => {
        throw new DOMException('full', 'QuotaExceededError');
      },
    });
    expect(() => writeJson('k', 'x')).not.toThrow();
  });
});
