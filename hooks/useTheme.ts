import { useEffect, useState } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { readJson } from '../lib/storage';

export type ThemePreference = 'system' | 'light' | 'dark';

const LIGHT_THEME_COLOR = '#f43f5e';
const DARK_THEME_COLOR = '#0f172a';

const prefersDark = () => typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches;

// public/theme-init.js applies the same logic before first paint to avoid a flash.
const initialPreference = (): ThemePreference =>
  // v1 stored a boolean under qa-dark-mode.
  readJson<boolean | null>('qa-dark-mode', null) === true ? 'dark' : 'system';

export function useTheme(): { preference: ThemePreference; isDark: boolean; setPreference: (p: ThemePreference) => void } {
  const [preference, setPreference] = useLocalStorage<ThemePreference>('qa-theme', initialPreference);
  const [systemDark, setSystemDark] = useState(prefersDark);

  useEffect(() => {
    if (typeof matchMedia !== 'function') return;
    const query = matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const isDark = preference === 'dark' || (preference === 'system' && systemDark);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', isDark ? DARK_THEME_COLOR : LIGHT_THEME_COLOR);
  }, [isDark]);

  return { preference, isDark, setPreference };
}
