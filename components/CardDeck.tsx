import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, type PanInfo } from 'framer-motion';
import { Heart, Share2, ChevronLeft, ChevronRight, CheckCircle2, Quote } from 'lucide-react';
import { tapLight, tapDouble, tapShort } from '../utils/haptics';

interface CardDeckProps {
  questions: string[];
  favorites: string[];
  answeredMap: Record<string, boolean>;
  onToggleFavorite: (question: string) => void;
  onToggleAnswered: (question: string) => void;
  onShare: (question: string) => void;
  currentIndex: number;
  onIndexChange: (index: number) => void;
}

const SWIPE_THRESHOLD = 100;
const SWIPE_VELOCITY = 500;

export const CardDeck: React.FC<CardDeckProps> = ({
  questions,
  favorites,
  answeredMap,
  onToggleFavorite,
  onToggleAnswered,
  onShare,
  currentIndex,
  onIndexChange,
}) => {
  const [direction, setDirection] = useState(0);

  const goNext = useCallback(() => {
    if (currentIndex < questions.length - 1) {
      tapLight();
      setDirection(1);
      onIndexChange(currentIndex + 1);
    }
  }, [currentIndex, questions.length, onIndexChange]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      tapLight();
      setDirection(-1);
      onIndexChange(currentIndex - 1);
    }
  }, [currentIndex, onIndexChange]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goNext, goPrev]);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const { offset, velocity } = info;
    if (Math.abs(offset.x) > SWIPE_THRESHOLD || Math.abs(velocity.x) > SWIPE_VELOCITY) {
      if (offset.x > 0) goPrev();
      else goNext();
    }
  };

  const question = questions[currentIndex];
  const isFavorite = favorites.includes(question);
  const isAnswered = !!answeredMap[question];

  const variants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 300 : -300,
      opacity: 0,
      scale: 0.9,
      rotateZ: dir > 0 ? 8 : -8,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      rotateZ: 0,
      transition: { type: 'spring', stiffness: 300, damping: 30 },
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -300 : 300,
      opacity: 0,
      scale: 0.9,
      rotateZ: dir > 0 ? -8 : 8,
      transition: { type: 'spring', stiffness: 300, damping: 30 },
    }),
  };

  return (
    <div className="flex flex-col items-center w-full max-w-lg mx-auto">
      {/* Card stack area */}
      <div className="relative w-full" style={{ minHeight: '340px' }}>
        {/* Background stack cards */}
        {[2, 1].map((offset) => {
          const idx = currentIndex + offset;
          if (idx >= questions.length) return null;
          return (
            <div
              key={`stack-${offset}`}
              className="absolute inset-0 rounded-3xl border border-amber-100/50 dark:border-stone-700/50 bg-white/60 dark:bg-stone-800/40"
              style={{
                transform: `translateY(${offset * 8}px) scale(${1 - offset * 0.04})`,
                zIndex: 10 - offset,
              }}
            />
          );
        })}

        {/* Active card */}
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.7}
            onDragEnd={handleDragEnd}
            className={`relative z-20 rounded-3xl p-8 md:p-10 shadow-lg cursor-grab active:cursor-grabbing select-none border transition-colors duration-300 ${
              isAnswered
                ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700'
                : 'bg-white dark:bg-stone-800/90 border-amber-100 dark:border-stone-700 shadow-amber-100/30 dark:shadow-amber-900/10'
            }`}
            style={{ minHeight: '300px', touchAction: 'pan-y' }}
          >
            <div className="flex items-start justify-between mb-6">
              {isAnswered ? (
                <CheckCircle2 className="w-7 h-7 text-emerald-500" />
              ) : (
                <Quote className="w-7 h-7 text-amber-200 dark:text-amber-800" />
              )}
              <span className={`text-xs font-semibold uppercase tracking-wider ${isAnswered ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-400 dark:text-amber-600'}`}>
                {isAnswered ? 'Answered' : `${currentIndex + 1} of ${questions.length}`}
              </span>
            </div>

            <p className={`text-xl md:text-2xl font-card leading-relaxed font-medium ${isAnswered ? 'text-stone-500 dark:text-stone-400' : 'text-stone-800 dark:text-stone-100'}`}>
              {question}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Controls toolbar */}
      <div className="flex items-center justify-center gap-3 mt-8 w-full">
        <button
          onClick={goPrev}
          disabled={currentIndex === 0}
          className="p-3 rounded-full bg-white dark:bg-stone-800 border border-amber-100 dark:border-stone-700 shadow-sm hover:shadow-md transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-amber-50 dark:hover:bg-stone-700"
          aria-label="Previous question"
        >
          <ChevronLeft className="w-5 h-5 text-stone-600 dark:text-stone-300" />
        </button>

        <button
          onClick={() => { tapLight(); onToggleAnswered(question); }}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${
            isAnswered
              ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300'
              : 'bg-white dark:bg-stone-800 border-amber-100 dark:border-stone-700 text-stone-500 dark:text-stone-400 hover:bg-amber-50 dark:hover:bg-stone-700'
          }`}
        >
          {isAnswered ? 'Answered' : 'Mark Done'}
        </button>

        <button
          onClick={() => { tapDouble(); onToggleFavorite(question); }}
          className="p-3 rounded-full bg-white dark:bg-stone-800 border border-amber-100 dark:border-stone-700 shadow-sm hover:shadow-md transition-all hover:bg-amber-50 dark:hover:bg-stone-700"
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          <Heart
            className={`w-5 h-5 transition-all duration-300 ${
              isFavorite
                ? 'fill-amber-500 text-amber-500 animate-heart-bounce'
                : 'text-stone-400 dark:text-stone-500 hover:text-amber-400'
            }`}
          />
        </button>

        <button
          onClick={() => { tapShort(); onShare(question); }}
          className="p-3 rounded-full bg-white dark:bg-stone-800 border border-amber-100 dark:border-stone-700 shadow-sm hover:shadow-md transition-all hover:bg-amber-50 dark:hover:bg-stone-700"
          aria-label="Share question"
        >
          <Share2 className="w-5 h-5 text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 transition-colors" />
        </button>

        <button
          onClick={goNext}
          disabled={currentIndex === questions.length - 1}
          className="p-3 rounded-full bg-white dark:bg-stone-800 border border-amber-100 dark:border-stone-700 shadow-sm hover:shadow-md transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-amber-50 dark:hover:bg-stone-700"
          aria-label="Next question"
        >
          <ChevronRight className="w-5 h-5 text-stone-600 dark:text-stone-300" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-xs mt-4">
        <div className="h-1 bg-amber-100 dark:bg-stone-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};
