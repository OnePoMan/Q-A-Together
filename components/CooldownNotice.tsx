import React, { useEffect, useState } from 'react';
import { Hourglass } from 'lucide-react';
import { RATE_LIMIT_NOTICE } from '../services/questionService';

interface CooldownNoticeProps {
  until: number;
  onDone: () => void;
}

const format = (ms: number) => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = String(total % 60).padStart(2, '0');
  return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m` : `${minutes}:${seconds}`;
};

/** Live countdown shown while fresh AI questions are paused by the rate limit. */
export const CooldownNotice: React.FC<CooldownNoticeProps> = ({ until, onDone }) => {
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const remaining = until - now;
  useEffect(() => {
    if (remaining <= 0) onDone();
  }, [remaining, onDone]);
  if (remaining <= 0) return null;

  return (
    <div
      role="status"
      className="mx-auto mb-5 flex max-w-xl items-start gap-3 rounded-2xl border border-amber-200 dark:border-amber-500/25 bg-amber-50 dark:bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100 animate-fade-in-up"
    >
      <Hourglass className="mt-0.5 h-4 w-4 shrink-0 animate-hourglass" aria-hidden />
      <p>
        {RATE_LIMIT_NOTICE}{' '}
        <span className="whitespace-nowrap font-semibold tabular-nums">
          Fresh questions in <span aria-live="off">{format(remaining)}</span>
        </span>
      </p>
    </div>
  );
};
