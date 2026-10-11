function vibrate(pattern: number | number[]): void {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(pattern);
  }
}

/** Light tap: next card, toggle answered */
export const tapLight = () => vibrate(10);

/** Double pulse: toggle favorite */
export const tapDouble = () => vibrate([10, 50, 10]);

/** Medium tap: deal a new batch */
export const tapMedium = () => vibrate(15);

/** Long buzz: answer timer ran out */
export const tapLong = () => vibrate([40, 60, 80]);

/** Short tap: share, settings */
export const tapShort = () => vibrate(8);
