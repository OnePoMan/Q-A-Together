import React from 'react';
import { Lock } from 'lucide-react';
import { VIBES, type VibeId } from '../shared/vibes';
import { VIBE_STYLES } from './vibeMeta';

interface VibePickerProps {
  value: VibeId;
  onChange: (vibe: VibeId) => void;
  adultUnlocked: boolean;
}

export const VibePicker: React.FC<VibePickerProps> = ({ value, onChange, adultUnlocked }) => (
  <div role="radiogroup" aria-label="Choose a vibe" className="grid grid-cols-2 sm:grid-cols-4 gap-3">
    {VIBES.map(vibe => {
      const style = VIBE_STYLES[vibe.id];
      const Icon = style.icon;
      const selected = vibe.id === value;
      const locked = vibe.adult && !adultUnlocked;
      return (
        <button
          key={vibe.id}
          type="button"
          role="radio"
          aria-checked={selected}
          onClick={() => onChange(vibe.id)}
          className={`group relative flex flex-col items-start gap-2.5 rounded-2xl border p-3.5 sm:p-4 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 ${
            selected
              ? `bg-white dark:bg-slate-800 border-transparent ring-2 ${style.ring} shadow-lg -translate-y-0.5`
              : 'bg-white/60 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700/60 hover:bg-white dark:hover:bg-slate-800 hover:shadow-md hover:-translate-y-0.5'
          }`}
        >
          <span className={`inline-flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl ${style.tile}`}>
            <Icon className="h-5 w-5" aria-hidden />
          </span>
          {vibe.adult && (
            <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-slate-900/85 dark:bg-white/90 px-2 py-0.5 text-[10px] font-bold text-white dark:text-slate-900">
              {locked && <Lock className="h-2.5 w-2.5" aria-hidden />}
              18+
            </span>
          )}
          <span>
            <span className="block font-semibold text-slate-900 dark:text-slate-100">{vibe.label}</span>
            <span className="block text-xs leading-snug text-slate-500 dark:text-slate-400 mt-0.5">{vibe.tagline}</span>
          </span>
        </button>
      );
    })}
  </div>
);
