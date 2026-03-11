import React from 'react';
import { QuestionCardProps } from '../types';
import { Quote, CheckCircle2, Heart, Share2 } from 'lucide-react';
import { tapLight, tapDouble } from '../utils/haptics';

export const QuestionCard: React.FC<QuestionCardProps> = ({
  text,
  index,
  isFavorite,
  isAnswered,
  onToggleFavorite,
  onToggleAnswered,
  onShare,
}) => {
  const animationDelay = `${index * 100}ms`;

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    tapDouble();
    onToggleFavorite();
  };

  const handleShareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onShare();
  };

  const handleCardClick = () => {
    tapLight();
    onToggleAnswered();
  };

  return (
    <div
      onClick={handleCardClick}
      className={`
        group relative p-8 rounded-2xl shadow-sm border transition-all duration-300 flex flex-col items-start h-full animate-fade-in-up cursor-pointer select-none
        ${isAnswered
          ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700'
          : 'bg-white dark:bg-slate-800 border-rose-100/50 dark:border-slate-700 hover:shadow-md hover:border-rose-200 dark:hover:border-slate-600 hover:-translate-y-1'
        }
      `}
      style={{ animationDelay, animationFillMode: 'both' }}
      role="button"
      aria-pressed={isAnswered}
    >
      <div className="w-full flex justify-between items-start mb-4">
        {isAnswered ? (
          <CheckCircle2 className="w-8 h-8 text-emerald-500 transition-all duration-300" />
        ) : (
          <Quote className="w-8 h-8 text-rose-200 dark:text-rose-800 group-hover:text-rose-400 dark:group-hover:text-rose-600 transition-colors" />
        )}

        <div className="flex items-center space-x-1 -mr-2 -mt-2">
          <button
            onClick={handleShareClick}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-200 dark:focus:ring-slate-600"
            aria-label="Share question"
          >
            <Share2 className="w-5 h-5 text-slate-300 dark:text-slate-500 hover:text-slate-500 dark:hover:text-slate-300 transition-colors" />
          </button>
          <button
            onClick={handleFavoriteClick}
            className="p-2 rounded-full hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-200 dark:focus:ring-rose-800"
            aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            <Heart
              className={`w-6 h-6 transition-all duration-300 ${
                isFavorite
                  ? 'fill-rose-500 text-rose-500 animate-heart-bounce'
                  : 'text-slate-300 dark:text-slate-500 hover:text-rose-400 hover:scale-110'
              }`}
            />
          </button>
        </div>
      </div>

      <p className={`text-lg md:text-xl font-serif leading-relaxed font-medium transition-colors duration-300 ${isAnswered ? 'text-slate-500 dark:text-slate-400' : 'text-slate-800 dark:text-slate-200'}`}>
        {text}
      </p>

      <div className="mt-auto pt-6 w-full flex justify-end">
        <span className={`text-xs font-semibold uppercase tracking-wider transition-colors duration-300 ${isAnswered ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-300 dark:text-rose-700'}`}>
          {isAnswered ? 'Answered' : `Q ${index + 1}`}
        </span>
      </div>
    </div>
  );
};
