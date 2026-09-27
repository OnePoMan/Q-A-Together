import React from 'react';
import { displayNames } from '../shared/brand';
import { BookOpen, Pencil } from 'lucide-react';
import { Button } from './Button';
import type { Journal, JournalEntry } from '../lib/journal';

interface MemoriesViewProps {
  journal: Journal;
  names: [string, string];
  onEdit: (entry: JournalEntry) => void;
  onFindQuestions: () => void;
}

const dateFormat = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

export const MemoriesView: React.FC<MemoriesViewProps> = ({ journal, names, onEdit, onFindQuestions }) => {
  const entries = Object.values(journal).sort((a, b) => b.updatedAt - a.updatedAt);
  const labels = displayNames(names);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <h1 className="font-serif text-3xl sm:text-4xl font-semibold">Memories</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          {entries.length
            ? `${entries.length} answer${entries.length === 1 ? '' : 's'} worth remembering.`
            : 'Your answers, kept for later.'}
        </p>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 bg-white/60 dark:bg-slate-900/40 px-6 py-16 text-center">
          <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-500/10">
            <BookOpen className="h-7 w-7 text-rose-300 dark:text-rose-400/60" aria-hidden />
          </span>
          <h2 className="mb-1 text-lg font-semibold">No memories yet</h2>
          <p className="mx-auto mb-6 max-w-xs text-slate-500 dark:text-slate-400">
            Tap the notebook on any card to write down what you each said.
          </p>
          <Button onClick={onFindQuestions}>Find questions</Button>
        </div>
      ) : (
        <ol className="relative space-y-5 border-l-2 border-rose-100 dark:border-slate-800 pl-6">
          {entries.map((entry, i) => (
            <li key={entry.question.text} className="relative animate-fade-in-up" style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}>
              <span aria-hidden className="absolute -left-[33px] top-6 h-4 w-4 rounded-full border-4 border-slate-50 dark:border-slate-950 bg-rose-400" />
              <article className="rounded-3xl border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-800/70 p-6 shadow-sm">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-rose-500/80 dark:text-rose-300/80">
                    {entry.question.category || 'Question'} · {dateFormat.format(entry.updatedAt)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onEdit(entry)}
                    aria-label="Edit memory"
                    className="-mr-2 rounded-full p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                  >
                    <Pencil className="h-4 w-4" aria-hidden />
                  </button>
                </div>
                <p className="mb-4 font-serif text-xl leading-snug text-slate-900 dark:text-slate-50">{entry.question.text}</p>
                <dl className="grid gap-3 sm:grid-cols-2">
                  {entry.answers.map((answer, idx) =>
                    answer.trim() ? (
                      <div key={idx} className="rounded-2xl bg-slate-50 dark:bg-slate-900/60 p-4">
                        <dt className="mb-1 text-xs font-semibold text-slate-500 dark:text-slate-400">{labels[idx]}</dt>
                        <dd className="whitespace-pre-wrap text-slate-700 dark:text-slate-200">{answer}</dd>
                      </div>
                    ) : null,
                  )}
                </dl>
              </article>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
};
