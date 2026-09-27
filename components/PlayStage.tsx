import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Heart, Layers, Share2, Sparkles, ThumbsDown } from 'lucide-react';
import type { Question, VibeId } from '../shared/vibes';
import { getVibe } from '../shared/vibes';
import { VIBE_STYLES } from './vibeMeta';
import { Button } from './Button';
import { tapDouble, tapLight } from '../utils/haptics';

interface PlayStageProps {
  questions: Question[];
  index: number;
  vibe: VibeId;
  names: [string, string];
  isSaved: (q: Question) => boolean;
  answeredCount: number;
  isLoading: boolean;
  onIndexChange: (index: number) => void;
  onAnswered: (q: Question) => void;
  onToggleSaved: (q: Question) => void;
  onDislike: (q: Question) => void;
  onShare: (q: Question) => void;
  onDealMore: () => void;
  onChangeVibe: () => void;
  onEditNames: () => void;
}

const SWIPE_THRESHOLD = 80;

const isTypingTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

export const PlayStage: React.FC<PlayStageProps> = ({
  questions,
  index,
  vibe,
  names,
  isSaved,
  answeredCount,
  isLoading,
  onIndexChange,
  onAnswered,
  onToggleSaved,
  onDislike,
  onShare,
  onDealMore,
  onChangeVibe,
  onEditNames,
}) => {
  const [direction, setDirection] = useState<'next' | 'prev'>('next');
  const [dragX, setDragX] = useState(0);
  const drag = useRef<{ x: number; y: number; id: number; horizontal: boolean | null } | null>(null);

  const total = questions.length;
  const atEnd = index >= total;
  const current = atEnd ? null : questions[index];
  const style = VIBE_STYLES[vibe];

  const goNext = () => {
    if (atEnd) return;
    tapLight();
    if (current) onAnswered(current);
    setDirection('next');
    onIndexChange(index + 1);
  };
  const skipDisliked = () => {
    if (!current) return;
    tapLight();
    onDislike(current);
    setDirection('next');
    onIndexChange(index + 1);
  };
  const goPrev = () => {
    if (index === 0) return;
    tapLight();
    setDirection('prev');
    onIndexChange(index - 1);
  };

  // Keyboard: arrows to move, S to save.
  const handlers = useRef({ goNext, goPrev, current, onToggleSaved });
  handlers.current = { goNext, goPrev, current, onToggleSaved };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return;
      if (document.querySelector('dialog[open]')) return;
      const h = handlers.current;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        h.goNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        h.goPrev();
      } else if (e.key.toLowerCase() === 's' && h.current) {
        tapDouble();
        h.onToggleSaved(h.current);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button, a')) return;
    drag.current = { x: e.clientX, y: e.clientY, id: e.pointerId, horizontal: null };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (d.horizontal === null && Math.hypot(dx, dy) > 8) {
      d.horizontal = Math.abs(dx) > Math.abs(dy);
      if (d.horizontal) (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
    if (d.horizontal) setDragX(dx);
  };
  const endDrag = () => {
    const dx = dragX;
    drag.current = null;
    setDragX(0);
    if (dx <= -SWIPE_THRESHOLD) goNext();
    else if (dx >= SWIPE_THRESHOLD) goPrev();
  };

  const firstName = names[0].trim() || 'Player 1';
  const secondName = names[1].trim() || 'Player 2';
  const whoFirst = index % 2 === 0 ? firstName : secondName;
  const progress = Math.min(index + 1, total) / Math.max(total, 1);

  return (
    <section aria-label="Question deck" className="mx-auto w-full max-w-xl">
      {/* Progress */}
      <div className="mb-5 flex items-center gap-3">
        <div
          className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-800"
          role="progressbar"
          aria-label="Deck progress"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={Math.min(index + 1, total)}
        >
          <div
            className="h-full rounded-full bg-rose-500 transition-[width] duration-500 ease-out"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <span className="text-xs font-semibold tabular-nums text-slate-500 dark:text-slate-400" aria-live="polite">
          {atEnd ? `${total} / ${total}` : `${index + 1} / ${total}`}
        </span>
      </div>

      {/* Card stack */}
      <div className="relative">
        <div aria-hidden className="absolute inset-x-6 -bottom-3 top-3 rounded-[2rem] bg-white/50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/40 rotate-[1.5deg]" />
        <div aria-hidden className="absolute inset-x-3 -bottom-1.5 top-1.5 rounded-[2rem] bg-white/70 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/50 -rotate-1" />

        {current ? (
          <article
            key={index}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            className={`relative flex min-h-[22rem] sm:min-h-[24rem] flex-col rounded-[2rem] border border-white/80 dark:border-slate-700/60 bg-gradient-to-br ${style.card} p-7 sm:p-9 shadow-xl shadow-slate-900/5 dark:shadow-black/30 touch-pan-y select-none ${
              direction === 'next' ? 'animate-card-in-right' : 'animate-card-in-left'
            }`}
            style={{
              transform: dragX ? `translateX(${dragX}px) rotate(${dragX / 40}deg)` : undefined,
              transition: dragX ? 'none' : 'transform 250ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${style.chip}`}>
                {current.category || getVibe(vibe).label}
              </span>
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Q{index + 1}
              </span>
            </div>

            <p className="my-auto py-8 font-serif text-[1.65rem] leading-snug sm:text-[2rem] text-slate-900 dark:text-slate-50 text-balance">
              {current.text}
            </p>

            <button
              type="button"
              onClick={onEditNames}
              className="self-start text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
            >
              <span className="font-semibold text-slate-700 dark:text-slate-200">{whoFirst}</span> answers first
            </button>
          </article>
        ) : (
          <article
            key="end"
            className="relative flex min-h-[22rem] sm:min-h-[24rem] flex-col items-center justify-center rounded-[2rem] border border-white/80 dark:border-slate-700/60 bg-gradient-to-br from-rose-50 via-white to-amber-50 dark:from-rose-950/40 dark:via-slate-900 dark:to-slate-900 p-8 text-center shadow-xl animate-card-in-right"
          >
            <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300">
              <Layers className="h-7 w-7" aria-hidden />
            </span>
            <h2 className="font-serif text-3xl text-slate-900 dark:text-slate-50">That's the deck</h2>
            <p className="mt-2 max-w-xs text-slate-600 dark:text-slate-400">
              {answeredCount} of {total} answered. Ready for another round?
            </p>
            <div className="mt-7 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Button size="lg" onClick={onDealMore} isLoading={isLoading}>
                {!isLoading && <Sparkles className="h-5 w-5" aria-hidden />}
                Deal 20 more
              </Button>
              <Button size="lg" variant="secondary" onClick={onChangeVibe}>
                Change vibe
              </Button>
            </div>
          </article>
        )}
      </div>

      {/* Controls */}
      <div className="mt-8 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={goPrev}
          disabled={index === 0}
          aria-label="Previous question"
          className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 shadow-sm transition hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </button>

        {current && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                tapDouble();
                onToggleSaved(current);
              }}
              aria-pressed={isSaved(current)}
              aria-label={isSaved(current) ? 'Remove from saved' : 'Save question'}
              className="inline-flex h-12 w-12 items-center justify-center rounded-full transition hover:bg-rose-50 dark:hover:bg-rose-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
            >
              <Heart
                className={`h-6 w-6 transition-all ${isSaved(current) ? 'fill-rose-500 text-rose-500 animate-heart-bounce' : 'text-slate-400 dark:text-slate-500'}`}
                aria-hidden
              />
            </button>
            <button
              type="button"
              onClick={skipDisliked}
              aria-label="Not for us: skip and show fewer like this"
              title="Not for us"
              className="inline-flex h-12 w-12 items-center justify-center rounded-full text-slate-400 dark:text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
            >
              <ThumbsDown className="h-5 w-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => onShare(current)}
              aria-label="Share question"
              className="inline-flex h-12 w-12 items-center justify-center rounded-full text-slate-400 dark:text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
            >
              <Share2 className="h-5 w-5" aria-hidden />
            </button>
          </div>
        )}

        {atEnd ? (
          <span className="h-12 w-12" aria-hidden />
        ) : (
          <Button onClick={goNext} size="lg" className="px-6!" aria-label="Next question">
            Next
            <ChevronRight className="h-5 w-5 -mr-1" aria-hidden />
          </Button>
        )}
      </div>

      <p className="mt-6 text-center text-xs text-slate-400 dark:text-slate-500 hidden sm:block">
        Tip: use ← → to move and S to save. Hearts and thumbs-downs shape future decks.
      </p>
      <p className="mt-6 text-center text-xs text-slate-400 dark:text-slate-500 sm:hidden">Swipe the card to move. Hearts and thumbs-downs shape future decks.</p>
    </section>
  );
};
