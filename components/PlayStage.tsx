import React, { useEffect, useRef, useState } from 'react';
import { displayNames } from '../shared/brand';
import { ChevronLeft, ChevronRight, Heart, Layers, NotebookPen, Share2, Sparkles, ThumbsDown } from 'lucide-react';
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
  onOpenJournal: (q: Question) => void;
  hasJournal: (q: Question) => boolean;
  /** Phone layout: stretch to fill the remaining screen height. */
  fill?: boolean;
}

const SWIPE_THRESHOLD = 80;
const LEAVE_MS = 190;

const prefersReducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

type Leaving = null | 'next' | 'prev';

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
  onOpenJournal,
  hasJournal,
  fill = false,
}) => {
  const [direction, setDirection] = useState<'next' | 'prev'>('next');
  const [dragX, setDragX] = useState(0);
  const [leaving, setLeaving] = useState<Leaving>(null);
  const [burst, setBurst] = useState(0);
  const leaveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(leaveTimer.current), []);

  // Play a "deal" animation whenever a new deck arrives.
  const deckKey = `${questions.length}:${questions[0]?.text ?? ''}`;
  const [dealing, setDealing] = useState(true);
  useEffect(() => {
    setDealing(true);
    const timer = setTimeout(() => setDealing(false), 900);
    return () => clearTimeout(timer);
  }, [deckKey]);
  const drag = useRef<{ x: number; y: number; id: number; horizontal: boolean | null } | null>(null);

  const total = questions.length;
  const atEnd = index >= total;
  const current = atEnd ? null : questions[index];
  const style = VIBE_STYLES[vibe];

  /** Throws the current card off-screen, then moves to the next or previous one. */
  const leave = (dir: 'next' | 'prev', then: () => void) => {
    if (leaving) return;
    setDirection(dir);
    if (prefersReducedMotion()) return then();
    setLeaving(dir);
    leaveTimer.current = setTimeout(() => {
      setLeaving(null);
      then();
    }, LEAVE_MS);
  };

  const goNext = () => {
    if (atEnd) return;
    tapLight();
    leave('next', () => {
      if (current) onAnswered(current);
      onIndexChange(index + 1);
    });
  };
  const skipDisliked = () => {
    if (!current) return;
    tapLight();
    leave('next', () => {
      onDislike(current);
      onIndexChange(index + 1);
    });
  };
  const goPrev = () => {
    if (index === 0) return;
    tapLight();
    leave('prev', () => onIndexChange(index - 1));
  };
  const toggleSaved = (q: Question) => {
    tapDouble();
    if (!isSaved(q)) setBurst(b => b + 1);
    onToggleSaved(q);
  };

  // Keyboard: arrows to move, S to save.
  const handlers = useRef({ goNext, goPrev, current, toggleSaved });
  handlers.current = { goNext, goPrev, current, toggleSaved };
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
        h.toggleSaved(h.current);
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
  const dragging = dragX !== 0;
  const endDrag = () => {
    const dx = dragX;
    drag.current = null;
    setDragX(0);
    if (dx <= -SWIPE_THRESHOLD) goNext();
    else if (dx >= SWIPE_THRESHOLD) goPrev();
  };

  const [firstName, secondName] = displayNames(names);
  const whoFirst = index % 2 === 0 ? firstName : secondName;
  const progress = Math.min(index + 1, total) / Math.max(total, 1);

  return (
    <section aria-label="Question deck" className={`mx-auto w-full max-w-xl ${fill ? 'flex min-h-0 flex-1 flex-col' : ''}`}>
      {/* Progress */}
      <div className={`flex items-center gap-3 ${fill ? 'mb-3' : 'mb-5'}`}>
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
      <div className={`relative ${fill ? 'min-h-0 flex-1' : ''}`}>
        <div
          aria-hidden
          className={`absolute inset-x-6 -bottom-3 top-3 rounded-[2rem] bg-white/50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/40 rotate-[1.5deg] ${dealing ? 'animate-deal-in [animation-delay:120ms]' : ''}`}
        />
        <div
          aria-hidden
          className={`absolute inset-x-3 -bottom-1.5 top-1.5 rounded-[2rem] bg-white/70 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/50 -rotate-1 ${dealing ? 'animate-deal-in [animation-delay:60ms]' : ''}`}
        />

        {current ? (
          <article
            key={index}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            className={`relative flex ${fill ? 'h-full min-h-[16rem]' : 'min-h-[22rem] sm:min-h-[24rem]'} flex-col rounded-[2rem] border border-white/80 dark:border-slate-700/60 bg-gradient-to-br ${style.card} ${fill ? 'p-6' : 'p-7 sm:p-9'} shadow-xl shadow-slate-900/5 dark:shadow-black/30 touch-pan-y select-none will-change-transform ${
              dealing && index === 0 ? 'animate-deal-in' : direction === 'next' ? 'animate-card-in-right' : 'animate-card-in-left'
            } ${dragging ? 'cursor-grabbing shadow-2xl' : 'cursor-grab'}`}
            style={{
              transform: leaving
                ? `translateX(${leaving === 'next' ? '-120%' : '120%'}) rotate(${leaving === 'next' ? -14 : 14}deg)`
                : dragging
                  ? `perspective(1200px) translateX(${dragX}px) rotate(${dragX / 18}deg) rotateY(${dragX / 25}deg)`
                  : undefined,
              opacity: leaving ? 0 : 1,
              transition: leaving
                ? `transform ${LEAVE_MS}ms cubic-bezier(0.5, 0, 0.75, 0), opacity ${LEAVE_MS}ms ease-in`
                : dragging
                  ? 'none'
                  : 'transform 450ms cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
            {/* Swipe hints fade in while dragging */}
            <span
              aria-hidden
              className="pointer-events-none absolute right-6 top-1/2 -translate-y-1/2 rounded-full bg-slate-900/80 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white"
              style={{ opacity: Math.min(1, Math.max(0, -dragX - 20) / 60) }}
            >
              Next
            </span>
            {index > 0 && (
              <span
                aria-hidden
                className="pointer-events-none absolute left-6 top-1/2 -translate-y-1/2 rounded-full bg-slate-900/80 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white"
                style={{ opacity: Math.min(1, Math.max(0, dragX - 20) / 60) }}
              >
                Back
              </span>
            )}

            {/* Floating hearts when saved */}
            {burst > 0 && (
              <span key={burst} aria-hidden className="pointer-events-none absolute inset-x-0 bottom-10 flex justify-center">
                {[-60, -25, 5, 35, 65].map((x, i) => (
                  <Heart
                    key={i}
                    className="absolute h-5 w-5 fill-rose-400 text-rose-400 animate-heart-float"
                    style={{ left: `calc(50% + ${x}px)`, animationDelay: `${i * 60}ms` }}
                  />
                ))}
              </span>
            )}

            <div className="flex items-center justify-between gap-3">
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${style.chip}`}>
                {current.category || getVibe(vibe).label}
              </span>
              <div className="-mr-2 flex items-center gap-1">
                <span className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  Q{index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => onOpenJournal(current)}
                  aria-label={hasJournal(current) ? 'Edit your remembered answers' : 'Write down your answers'}
                  title="Remember your answers"
                  className="relative rounded-full p-2 text-slate-400 transition hover:bg-white/70 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                >
                  <NotebookPen className="h-[18px] w-[18px]" aria-hidden />
                  {hasJournal(current) && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500" aria-hidden />}
                </button>
              </div>
            </div>

            <p
              className={`my-auto font-serif leading-snug text-slate-900 dark:text-slate-50 text-balance ${
                fill ? 'py-4 text-[clamp(1.5rem,min(8vw,4.6dvh),2.6rem)]' : 'py-8 text-[1.65rem] sm:text-[2rem]'
              }`}
            >
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
            className={`relative flex ${fill ? 'h-full min-h-[16rem]' : 'min-h-[22rem] sm:min-h-[24rem]'} flex-col items-center justify-center rounded-[2rem] border border-white/80 dark:border-slate-700/60 bg-gradient-to-br from-rose-50 via-white to-amber-50 dark:from-rose-950/40 dark:via-slate-900 dark:to-slate-900 p-8 text-center shadow-xl animate-card-in-right`}
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
      <div className={`flex items-center justify-between gap-3 max-[360px]:gap-1 ${fill ? 'mt-4' : 'mt-8'}`}>
        <button
          type="button"
          onClick={goPrev}
          disabled={index === 0}
          aria-label="Previous question"
          className="inline-flex h-12 w-12 max-[360px]:h-10 max-[360px]:w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 shadow-sm transition hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </button>

        {current && (
          <div className="flex items-center gap-2 max-[360px]:gap-0.5">
            <button
              type="button"
              onClick={() => toggleSaved(current)}
              aria-pressed={isSaved(current)}
              aria-label={isSaved(current) ? 'Remove from saved' : 'Save question'}
              className="inline-flex h-12 w-12 max-[360px]:h-10 max-[360px]:w-10 shrink-0 items-center justify-center rounded-full transition hover:bg-rose-50 dark:hover:bg-rose-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
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
              className="inline-flex h-12 w-12 max-[360px]:h-10 max-[360px]:w-10 shrink-0 items-center justify-center rounded-full text-slate-400 dark:text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
            >
              <ThumbsDown className="h-5 w-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => onShare(current)}
              aria-label="Share question"
              className="inline-flex h-12 w-12 max-[360px]:h-10 max-[360px]:w-10 shrink-0 items-center justify-center rounded-full text-slate-400 dark:text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
            >
              <Share2 className="h-5 w-5" aria-hidden />
            </button>
          </div>
        )}

        {atEnd ? (
          <span className="h-12 w-12" aria-hidden />
        ) : (
          <Button onClick={goNext} size="lg" className="shrink-0 px-6! max-[360px]:px-4!" aria-label="Next question">
            Next
            <ChevronRight className="h-5 w-5 -mr-1" aria-hidden />
          </Button>
        )}
      </div>

      {!fill && (
        <>
          <p className="mt-6 text-center text-xs text-slate-400 dark:text-slate-500 hidden sm:block">
            Tip: use ← → to move and S to save. Hearts and thumbs-downs shape future decks.
          </p>
          <p className="mt-6 text-center text-xs text-slate-400 dark:text-slate-500 sm:hidden">
            Swipe the card to move. Hearts and thumbs-downs shape future decks.
          </p>
        </>
      )}
    </section>
  );
};
