import React, { useState } from 'react';
import { QuestionCardProps } from '../types';
import { Quote, CheckCircle2, Heart } from 'lucide-react';

export const QuestionCard: React.FC<QuestionCardProps> = ({ 
  text, 
  index, 
  isFavorite, 
  onToggleFavorite 
}) => {
  const [isAnswered, setIsAnswered] = useState(false);
  
  // Stagger animation delay based on index
  const animationDelay = `${index * 100}ms`;

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite();
  };

  return (
    <div 
      onClick={() => setIsAnswered(!isAnswered)}
      className={`
        group relative p-8 rounded-2xl shadow-sm border transition-all duration-300 flex flex-col items-start h-full animate-fade-in-up cursor-pointer select-none
        ${isAnswered 
          ? 'bg-emerald-50 border-emerald-200' 
          : 'bg-white border-rose-100/50 hover:shadow-md hover:border-rose-200 hover:-translate-y-1'
        }
      `}
      style={{ animationDelay, animationFillMode: 'both' }}
      role="button"
      aria-pressed={isAnswered}
    >
      <div className="w-full flex justify-between items-start mb-4">
        {isAnswered ? (
          <CheckCircle2 className="w-8 h-8 text-emerald-500 transition-all duration-300 animate-in zoom-in" />
        ) : (
          <Quote className="w-8 h-8 text-rose-200 group-hover:text-rose-400 transition-colors" />
        )}

        <button
          onClick={handleFavoriteClick}
          className="p-2 -mr-2 -mt-2 rounded-full hover:bg-rose-50 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-200"
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          <Heart 
            className={`w-6 h-6 transition-all duration-300 ${
              isFavorite 
                ? 'fill-rose-500 text-rose-500 animate-heart-bounce' 
                : 'text-slate-300 hover:text-rose-400 hover:scale-110'
            }`} 
          />
        </button>
      </div>
      
      <p className={`text-lg md:text-xl font-serif leading-relaxed font-medium transition-colors duration-300 ${isAnswered ? 'text-slate-500' : 'text-slate-800'}`}>
        {text}
      </p>
      
      <div className="mt-auto pt-6 w-full flex justify-end">
        <span className={`text-xs font-semibold uppercase tracking-wider transition-colors duration-300 ${isAnswered ? 'text-emerald-600' : 'text-rose-300'}`}>
          {isAnswered ? 'Answered' : `Q ${index + 1}`}
        </span>
      </div>
    </div>
  );
};