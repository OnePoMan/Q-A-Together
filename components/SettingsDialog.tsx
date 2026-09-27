import React, { useEffect, useRef } from 'react';
import { DEFAULT_NAMES } from '../shared/brand';
import { Download, Lock, Monitor, Moon, RotateCcw, Sun, Trash, X } from 'lucide-react';
import type { ThemePreference } from '../hooks/useTheme';

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
  names: [string, string];
  onNamesChange: (names: [string, string]) => void;
  theme: ThemePreference;
  onThemeChange: (theme: ThemePreference) => void;
  historyCount: number;
  savedCount: number;
  onResetHistory: () => void;
  onClearSaved: () => void;
  onInstall: (() => Promise<void>) | null;
  adultUnlocked: boolean;
  onLockAdult: () => void;
}

const THEMES: { id: ThemePreference; label: string; icon: typeof Sun }[] = [
  { id: 'system', label: 'Auto', icon: Monitor },
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'dark', label: 'Dark', icon: Moon },
];

const inputClass =
  'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500';

export const SettingsDialog: React.FC<SettingsDialogProps> = ({
  open,
  onClose,
  names,
  onNamesChange,
  theme,
  onThemeChange,
  historyCount,
  savedCount,
  onResetHistory,
  onClearSaved,
  onInstall,
  adultUnlocked,
  onLockAdult,
}) => {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={e => {
        if (e.target === ref.current) onClose();
      }}
      aria-labelledby="settings-title"
      className="m-auto w-[min(28rem,calc(100vw-2rem))] max-h-[calc(100dvh-2rem)] rounded-3xl bg-white dark:bg-slate-900 p-0 text-slate-900 dark:text-slate-100 shadow-2xl backdrop:bg-slate-950/50 backdrop:backdrop-blur-sm"
    >
      <div className="p-6 sm:p-7">
        <div className="mb-6 flex items-center justify-between">
          <h2 id="settings-title" className="font-serif text-2xl">
            Settings
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <fieldset className="mb-6">
          <legend className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">Who's playing?</legend>
          <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">Used to take turns answering first. Stays on this device.</p>
          <div className="grid grid-cols-2 gap-3">
            {[0, 1].map(i => (
              <input
                key={i}
                type="text"
                value={names[i]}
                maxLength={24}
                autoComplete="off"
                placeholder={DEFAULT_NAMES[i]}
                aria-label={`Player ${i + 1} name`}
                onChange={e => {
                  const next: [string, string] = [...names];
                  next[i] = e.target.value;
                  onNamesChange(next);
                }}
                className={inputClass}
              />
            ))}
          </div>
        </fieldset>

        <fieldset className="mb-6">
          <legend className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">Appearance</legend>
          <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-1 rounded-2xl bg-slate-100 dark:bg-slate-800 p-1">
            {THEMES.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={theme === id}
                onClick={() => onThemeChange(id)}
                className={`inline-flex items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 ${
                  theme === id
                    ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {label}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="space-y-2">
          {onInstall && (
            <button
              type="button"
              onClick={onInstall}
              className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-200 hover:bg-rose-100 dark:hover:bg-rose-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
            >
              <Download className="h-4 w-4" aria-hidden />
              Install app on this device
            </button>
          )}
          {adultUnlocked && (
            <button
              type="button"
              onClick={onLockAdult}
              className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
            >
              <Lock className="h-4 w-4" aria-hidden />
              Lock the 18+ Spicy vibe
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (confirm('Forget which questions you have seen? New decks may include repeats of old questions.')) onResetHistory();
            }}
            disabled={historyCount === 0}
            className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
            Reset seen questions
            <span className="ml-auto text-xs text-slate-400 tabular-nums">{historyCount}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm('Remove all saved questions? This cannot be undone.')) onClearSaved();
            }}
            disabled={savedCount === 0}
            className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          >
            <Trash className="h-4 w-4" aria-hidden />
            Clear saved questions
            <span className="ml-auto text-xs text-slate-400 tabular-nums">{savedCount}</span>
          </button>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400 dark:text-slate-500">
          Names, saves and history stay on this device. To avoid repeats and match your taste, recently seen, saved and skipped questions are sent with each request to the question generator (Google Gemini). 18+ cards never leave the device except to sync a room you start.
        </p>
      </div>
    </dialog>
  );
};
