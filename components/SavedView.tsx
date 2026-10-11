import React, { useMemo, useState } from 'react';
import { Heart, Play } from 'lucide-react';
import { Button } from './Button';
import { QuestionCard } from './QuestionCard';
import { SearchField } from './SearchField';
import { categoriesOf, filterQuestions } from '../lib/filterQuestions';
import type { Question } from '../shared/vibes';

interface SavedViewProps {
  saved: Question[];
  answered: Record<string, boolean>;
  onPlay: (questions: Question[]) => void;
  onToggleSaved: (q: Question) => void;
  onToggleAnswered: (q: Question, value: boolean) => void;
  onShare: (q: Question) => void;
  onOpenJournal: (q: Question) => void;
  hasJournal: (q: Question) => boolean;
  onFindQuestions: () => void;
}

const chipClass = (active: boolean) =>
  `rounded-full px-3.5 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 ${
    active
      ? 'bg-rose-500 text-white shadow-sm'
      : 'bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-slate-800'
  }`;

export const SavedView: React.FC<SavedViewProps> = ({
  saved,
  answered,
  onPlay,
  onToggleSaved,
  onToggleAnswered,
  onShare,
  onOpenJournal,
  hasJournal,
  onFindQuestions,
}) => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);

  const categories = useMemo(() => categoriesOf(saved), [saved]);
  // A removed last-of-its-category question should not leave an invisible active chip behind.
  const activeCategory = category !== null && categories.includes(category) ? category : null;
  const filtered = useMemo(() => filterQuestions(saved, query, activeCategory), [saved, query, activeCategory]);
  const isFiltered = query.trim() !== '' || activeCategory !== null;

  const clearFilters = () => {
    setQuery('');
    setCategory(null);
  };

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold">Saved questions</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            {saved.length ? `${saved.length} favorite${saved.length === 1 ? '' : 's'} to come back to.` : 'Your favorites will live here.'}
          </p>
        </div>
        {saved.length > 0 && (
          <Button onClick={() => onPlay(filtered)} disabled={filtered.length === 0} className="self-start sm:self-auto">
            <Play className="h-4 w-4" aria-hidden />
            {isFiltered ? `Play ${filtered.length} matching` : 'Play these'}
          </Button>
        )}
      </div>

      {saved.length > 0 && (
        <div className="mb-6 space-y-3">
          <SearchField value={query} onChange={setQuery} label="Search saved questions" placeholder="Search saved questions" />
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setCategory(null)} aria-pressed={activeCategory === null} className={chipClass(activeCategory === null)}>
                All
              </button>
              {categories.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(activeCategory === c ? null : c)}
                  aria-pressed={activeCategory === c}
                  className={chipClass(activeCategory === c)}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {saved.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 bg-white/60 dark:bg-slate-900/40 px-6 py-16 text-center">
          <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-500/10">
            <Heart className="h-7 w-7 text-rose-300 dark:text-rose-400/60" aria-hidden />
          </span>
          <h2 className="mb-1 text-lg font-semibold">Nothing saved yet</h2>
          <p className="mx-auto mb-6 max-w-xs text-slate-500 dark:text-slate-400">
            Tap the heart on any question to keep it for another night.
          </p>
          <Button onClick={onFindQuestions}>Find questions</Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 bg-white/60 dark:bg-slate-900/40 px-6 py-12 text-center">
          <h2 className="mb-4 text-lg font-semibold">No saved questions match</h2>
          <Button onClick={clearFilters}>Clear filters</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...filtered].reverse().map((q, i) => (
            <QuestionCard
              key={q.text}
              question={q}
              index={i}
              isSaved
              isAnswered={!!answered[q.text]}
              onToggleSaved={() => onToggleSaved(q)}
              onToggleAnswered={() => onToggleAnswered(q, !answered[q.text])}
              onShare={() => onShare(q)}
              onOpenJournal={() => onOpenJournal(q)}
              hasJournal={hasJournal(q)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
