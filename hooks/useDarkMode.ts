import { useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';

export function useDarkMode(): [boolean, () => void] {
  const [isDark, setIsDark] = useLocalStorage('qa-dark-mode', false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  return [isDark, () => setIsDark(prev => !prev)];
}
