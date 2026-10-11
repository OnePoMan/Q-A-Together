import { describe, expect, it } from 'vitest';
import { shuffle } from '../lib/shuffle';

const seeded = (values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length];
};

describe('shuffle', () => {
  it('keeps the same elements', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    expect([...shuffle(input)].sort()).toEqual(input);
  });

  it('does not mutate the input and returns a new array', () => {
    const input = Object.freeze([1, 2, 3, 4]);
    const out = shuffle(input);
    expect(input).toEqual([1, 2, 3, 4]);
    expect(out).not.toBe(input);
  });

  it('is deterministic with an injected random', () => {
    const input = ['a', 'b', 'c', 'd', 'e'];
    const a = shuffle(input, seeded([0.1, 0.7, 0.4, 0.9]));
    const b = shuffle(input, seeded([0.1, 0.7, 0.4, 0.9]));
    expect(a).toEqual(b);
    expect([...a].sort()).toEqual(input);
    expect(shuffle(input, () => 0)).toEqual(['b', 'c', 'd', 'e', 'a']);
  });

  it('handles empty and single-item lists', () => {
    expect(shuffle([])).toEqual([]);
    expect(shuffle([1])).toEqual([1]);
  });
});
