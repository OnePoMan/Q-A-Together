import { sanitizeTimerSeconds } from '../lib/countdown';
import { useLocalStorage } from './useLocalStorage';

/** Answer-timer preferences, shared by the home screen and the play stage via localStorage. On by default. */
export function useTimerSettings() {
  const [timerOn, setTimerOn] = useLocalStorage<boolean>('qa-timer-on', true);
  const [storedSeconds, setTimerSeconds] = useLocalStorage<number>('qa-timer-seconds', 15);
  return { timerOn, setTimerOn, timerSeconds: sanitizeTimerSeconds(storedSeconds), setTimerSeconds };
}
