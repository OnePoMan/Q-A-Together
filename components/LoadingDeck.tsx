import React, { useEffect, useState } from 'react';

const MESSAGES = [
  'Shuffling the deck...',
  'Brewing good questions...',
  'Skipping the boring ones...',
  'Checking for repeats...',
  'Almost there...',
];

export const LoadingDeck: React.FC = () => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setStep(s => Math.min(s + 1, MESSAGES.length - 1)), 2200);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="mx-auto w-full max-w-xl" role="status" aria-live="polite">
      <div className="mb-5 h-1.5 rounded-full bg-slate-200/80 dark:bg-slate-800 overflow-hidden">
        <div className="h-full w-1/3 rounded-full bg-rose-400/70 animate-indeterminate" />
      </div>
      <div className="relative">
        <div aria-hidden className="absolute inset-x-6 -bottom-3 top-3 rounded-[2rem] bg-white/50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/40 rotate-[1.5deg]" />
        <div aria-hidden className="absolute inset-x-3 -bottom-1.5 top-1.5 rounded-[2rem] bg-white/70 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/50 -rotate-1" />
        <div className="relative flex min-h-[22rem] sm:min-h-[24rem] flex-col rounded-[2rem] border border-white/80 dark:border-slate-700/60 bg-white dark:bg-slate-900 p-7 sm:p-9 shadow-xl animate-deal">
          <div className="h-6 w-28 rounded-full bg-slate-100 dark:bg-slate-800 animate-pulse" />
          <div className="my-auto space-y-3">
            <div className="h-7 w-11/12 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
            <div className="h-7 w-9/12 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
            <div className="h-7 w-5/12 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
          </div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{MESSAGES[step]}</p>
        </div>
      </div>
    </div>
  );
};
