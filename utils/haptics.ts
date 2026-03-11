function vibrate(pattern: number | number[]): void {
  if (navigator.vibrate) {
    navigator.vibrate(pattern);
  }
}

/** Light tap — toggle answered */
export const tapLight = () => vibrate(10);

/** Double pulse — toggle favorite */
export const tapDouble = () => vibrate([10, 50, 10]);

/** Medium tap — generate button */
export const tapMedium = () => vibrate(15);

/** Short tap — share, dark mode toggle */
export const tapShort = () => vibrate(8);
