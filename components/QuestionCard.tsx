import React from 'react';
import { CircleCheck, Heart, Share2 } from 'lucide-react';
import type { Question } from '../shared/vibes';
import { tapDouble, tapLight } from '../utils/haptics';

interface QuestionCardProps {
  question: Question;
  index: number;
  isSaved: boolean;
  isAnswered: boolean;
  onToggleSaved: () => void;
  onToggleAnswered: () => void;
  onShare: () => void;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  index,
  isSaved,
  isAnswered,
  onToggleSaved,
  onToggleAnswered,
  onShare,
}) => (
  <article
    className={`group relative flex h-full flex-col rounded-3xl border p-6 transition-all duration-300 animate-fade-in-up ${
      isAnswered
        ? 'bg-emerald-50/80 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20'
        : 'bg-white dark:bg-slate-800/70 border-slate-200/70 dark:border-slate-700/60 shadow-sm hover:shadow-md hover:-translate-y-0.5'
    }`}
    style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
  >
    <div className="mb-3 flex items-center justify-between gap-2">
      <span className="truncate text-xs font-semibold uppercase tracking-wider text-rose-500/80 dark:text-rose-300/80">
        {question.category || 'Question'}
      </span>
      <div className="-mr-2 -mt-1 flex shrink-0 items-center">
        <button
          type="button"
          onClick={onShare}
          className="rounded-full p-2 text-slate-300 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
          aria-label="Share question"
        >
          <Share2 className="h-[18px] w-[18px]" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => {
            tapDouble();
            onToggleSaved();
          }}
          className="rounded-full p-2 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
          aria-pressed={isSaved}
          aria-label={isSaved ? 'Remove from saved' : 'Save question'}
        >
          <Heart
            className={`h-5 w-5 transition-all ${isSaved ? 'fill-rose-500 text-rose-500 animate-heart-bounce' : 'text-slate-300 dark:text-slate-500 hover:text-rose-400'}`}
            aria-hidden
          />
        </button>
      </div>
    </div>

    <p
      className={`font-serif text-xl leading-snug transition-colors ${
        isAnswered ? 'text-slate-500 dark:text-slate-400' : 'text-slate-800 dark:text-slate-100'
      }`}
    >
      {question.text}
    </p>

    <button
      type="button"
      onClick={() => {
        tapLight();
        onToggleAnswered();
      }}
      aria-pressed={isAnswered}
      className={`mt-auto self-start pt-5 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 ${
        isAnswered ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
      }`}
    >
      <CircleCheck className="h-4 w-4" aria-hidden />
      {isAnswered ? 'Answered' : 'Mark answered'}
    </button>
  </article>
);
