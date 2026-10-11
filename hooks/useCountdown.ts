import { useEffect, useRef, useState } from 'react';
import { remainingSeconds } from '../lib/countdown';

const TICK_MS = 250;

/**
 * Wall-clock countdown. Recomputed from Date.now() deltas (no decrementing counter), so it
 * cannot drift. Restarts whenever `resetKey` changes; pauses while `running` is false or the
 * document is hidden.
 */
export function useCountdown(seconds: number, running: boolean, resetKey: unknown) {
  const [remaining, setRemaining] = useState(seconds);
  const startedAt = useRef(Date.now());
  const pausedAt = useRef<number | null>(null);
  const [hidden, setHidden] = useState(() => typeof document !== 'undefined' && document.hidden);

  useEffect(() => {
    const onVis = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  useEffect(() => {
    startedAt.current = Date.now();
    pausedAt.current = null;
    setRemaining(seconds);
  }, [seconds, resetKey]);

  const active = running && !hidden;
  useEffect(() => {
    if (!active) {
      pausedAt.current ??= Date.now();
      return;
    }
    if (pausedAt.current !== null) {
      startedAt.current += Date.now() - pausedAt.current;
      pausedAt.current = null;
    }
    const tick = () => setRemaining(remainingSeconds(startedAt.current, Date.now(), seconds));
    tick();
    const id = setInterval(tick, TICK_MS);
    return () => clearInterval(id);
  }, [active, seconds, resetKey]);

  return { remaining, done: remaining <= 0 };
}
