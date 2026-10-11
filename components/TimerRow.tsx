import { nextTimerSeconds } from '../lib/countdown';
import { useTimerSettings } from '../hooks/useTimerSettings';

/** Compact one-line answer-timer control for the home screen. */
export function TimerRow() {
  const { timerOn, setTimerOn, timerSeconds, setTimerSeconds } = useTimerSettings();
  return (
    <div className="mb-2 flex items-center justify-between gap-3 text-sm">
      <div className="flex items-center gap-2">
        <button
          type="button"
          role="switch"
          aria-checked={timerOn}
          aria-label="Answer timer"
          onClick={() => setTimerOn(on => !on)}
          className={`relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 ${timerOn ? 'bg-rose-500' : 'bg-slate-300 dark:bg-slate-700'}`}
        >
          <span
            aria-hidden
            className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${timerOn ? 'translate-x-[18px]' : 'translate-x-0.5'}`}
          />
        </button>
        <span className="font-medium text-slate-600 dark:text-slate-300" aria-hidden>
          Answer timer
        </span>
      </div>
      {timerOn ? (
        <button
          type="button"
          onClick={() => setTimerSeconds(nextTimerSeconds(timerSeconds))}
          aria-label={`Timer length ${timerSeconds} seconds. Change`}
          title="Change timer length"
          className="rounded-full px-2.5 py-1 text-sm font-semibold tabular-nums text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
        >
          {timerSeconds}s per card
        </button>
      ) : (
        <span className="px-2.5 py-1 text-sm text-slate-500 dark:text-slate-400">Off</span>
      )}
    </div>
  );
}
