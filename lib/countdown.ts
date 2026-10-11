/** Seconds left (fractional, clamped to 0..total) for a countdown that began at `startedAt` (ms). */
export function remainingSeconds(startedAt: number, now: number, total: number): number {
  const left = total - (now - startedAt) / 1000;
  return Math.min(total, Math.max(0, left));
}

export const TIMER_CHOICES = [10, 15, 30, 60] as const;

/** Next duration in the 10/15/30/60 cycle; unknown values fall back to the first choice. */
export function nextTimerSeconds(current: number): number {
  const i = TIMER_CHOICES.indexOf(current as (typeof TIMER_CHOICES)[number]);
  return TIMER_CHOICES[(i + 1) % TIMER_CHOICES.length];
}
