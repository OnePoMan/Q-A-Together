import { useEffect, useState } from 'react';
import { useLocalStorage } from './useLocalStorage';

export type DisplayPreference = 'auto' | 'phone' | 'desktop';

// Phones in portrait, and phones held sideways (short, touch-only screens).
// public/theme-init.js applies the same query before first paint.
export const PHONE_QUERY = '(max-width: 767px), (pointer: coarse) and (max-height: 500px)';

const matchesPhone = () => typeof matchMedia === 'function' && matchMedia(PHONE_QUERY).matches;

/**
 * Chooses between the phone layout (full-height, thumb-friendly) and the
 * classic desktop layout. Sets data-display on <html> for the `phone:` CSS variant.
 */
export function useDisplayMode() {
  const [preference, setPreference] = useLocalStorage<DisplayPreference>('qa-display', 'auto');
  const [autoPhone, setAutoPhone] = useState(matchesPhone);
  const [isPortrait, setIsPortrait] = useState(() => typeof matchMedia !== 'function' || matchMedia('(orientation: portrait)').matches);

  useEffect(() => {
    if (typeof matchMedia !== 'function') return;
    const phone = matchMedia(PHONE_QUERY);
    const portrait = matchMedia('(orientation: portrait)');
    const onChange = () => {
      setAutoPhone(phone.matches);
      setIsPortrait(portrait.matches);
    };
    phone.addEventListener('change', onChange);
    portrait.addEventListener('change', onChange);
    return () => {
      phone.removeEventListener('change', onChange);
      portrait.removeEventListener('change', onChange);
    };
  }, []);

  const isPhone = preference === 'phone' || (preference === 'auto' && autoPhone);

  useEffect(() => {
    document.documentElement.dataset.display = isPhone ? 'phone' : 'desktop';
  }, [isPhone]);

  return { preference, setPreference, isPhone, isPortrait };
}
