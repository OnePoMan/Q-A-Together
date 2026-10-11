import React from 'react';
import { BookHeart, BookOpen, Heart, Settings } from 'lucide-react';
import type { View } from '../types';

interface AppHeaderProps {
  view: View;
  onNavigate: (view: View) => void;
  roomCode: string | null;
  onOpenRoom: () => void;
  savedCount: number;
  /** True when a valid deck exists, so toggling a page off returns to play instead of home. */
  hasDeck: boolean;
  onOpenSettings: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ view, onNavigate, roomCode, onOpenRoom, savedCount, hasDeck, onOpenSettings }) => (
  <header className="sticky top-0 z-50 border-b border-rose-100/60 dark:border-slate-800/80 bg-white/75 dark:bg-slate-950/75 backdrop-blur-lg pt-[env(safe-area-inset-top)]">
    <div className="mx-auto flex h-16 phone:h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
      <button
        type="button"
        onClick={() => onNavigate('home')}
        className="flex items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
      >
        <span className="inline-flex h-8 w-8 phone:h-7 phone:w-7 items-center justify-center rounded-xl bg-rose-500 text-white shadow-md shadow-rose-500/30">
          <Heart className="h-4 w-4 fill-white" aria-hidden />
        </span>
        <span className="flex flex-col text-left leading-none">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-rose-500">Q&amp;A with</span>
          <span className="whitespace-nowrap font-serif text-lg sm:text-xl phone:text-base max-[360px]:text-sm font-semibold">Ethan &amp; Brianna</span>
        </span>
      </button>

      <nav className="flex items-center gap-1" aria-label="Main">
        {roomCode && (
          <button
            type="button"
            onClick={onOpenRoom}
            className="flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 font-mono text-xs font-bold tracking-wider text-emerald-700 dark:text-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
            aria-label={`In room ${roomCode}. Open room options`}
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden />
            {roomCode}
          </button>
        )}
        <button
          type="button"
          onClick={() => onNavigate(view === 'saved' ? (hasDeck ? 'play' : 'home') : 'saved')}
          aria-current={view === 'saved' ? 'page' : undefined}
          aria-label={savedCount > 0 ? `Saved (${savedCount})` : 'Saved'}
          className={`flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 ${
            view === 'saved'
              ? 'bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-200'
              : 'text-slate-600 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-slate-800'
          }`}
        >
          <BookHeart className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">Saved</span>
          {savedCount > 0 && (
            <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[11px] font-bold leading-none text-white tabular-nums">
              {savedCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => onNavigate(view === 'memories' ? (hasDeck ? 'play' : 'home') : 'memories')}
          aria-current={view === 'memories' ? 'page' : undefined}
          aria-label="Memories"
          className={`flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 ${
            view === 'memories'
              ? 'bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-200'
              : 'text-slate-600 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-slate-800'
          }`}
        >
          <BookOpen className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">Memories</span>
        </button>
        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="Settings"
          className="rounded-full p-2.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
        >
          <Settings className="h-5 w-5" aria-hidden />
        </button>
      </nav>
    </div>
  </header>
);
