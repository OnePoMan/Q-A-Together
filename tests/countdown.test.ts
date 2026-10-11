import { describe, expect, it } from 'vitest';
import { nextTimerSeconds, remainingSeconds } from '../lib/countdown';

describe('remainingSeconds', () => {
  it('starts at the total', () => expect(remainingSeconds(1000, 1000, 15)).toBe(15));
  it('counts down from wall-clock deltas', () => expect(remainingSeconds(0, 4500, 15)).toBeCloseTo(10.5));
  it('clamps at zero', () => expect(remainingSeconds(0, 99999, 15)).toBe(0));
  it('never exceeds total if the clock steps back', () => expect(remainingSeconds(5000, 1000, 15)).toBe(15));
});

describe('nextTimerSeconds', () => {
  it('cycles 10/15/30/60', () => {
    expect(nextTimerSeconds(10)).toBe(15);
    expect(nextTimerSeconds(15)).toBe(30);
    expect(nextTimerSeconds(30)).toBe(60);
    expect(nextTimerSeconds(60)).toBe(10);
  });
  it('recovers from unknown values', () => expect(nextTimerSeconds(7)).toBe(10));
});
