import { Dices, HeartHandshake, Lightbulb, PartyPopper, Split, Zap, type LucideIcon } from 'lucide-react';
import type { VibeId } from '../shared/vibes';

export interface VibeStyle {
  icon: LucideIcon;
  /** Icon tile on the picker. */
  tile: string;
  /** Selected ring on the picker. */
  ring: string;
  /** Question card background. */
  card: string;
  /** Category chip. */
  chip: string;
}

// Full class strings so Tailwind can see them at build time.
export const VIBE_STYLES: Record<VibeId, VibeStyle> = {
  mix: {
    icon: Dices,
    tile: 'bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300',
    ring: 'ring-rose-400 dark:ring-rose-400/70',
    card: 'from-rose-50 via-white to-orange-50 dark:from-rose-950/50 dark:via-slate-900 dark:to-slate-900',
    chip: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-200',
  },
  playful: {
    icon: PartyPopper,
    tile: 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300',
    ring: 'ring-amber-400 dark:ring-amber-400/70',
    card: 'from-amber-50 via-white to-yellow-50 dark:from-amber-950/40 dark:via-slate-900 dark:to-slate-900',
    chip: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200',
  },
  'big-ideas': {
    icon: Lightbulb,
    tile: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300',
    ring: 'ring-indigo-400 dark:ring-indigo-400/70',
    card: 'from-indigo-50 via-white to-violet-50 dark:from-indigo-950/50 dark:via-slate-900 dark:to-slate-900',
    chip: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-200',
  },
  us: {
    icon: HeartHandshake,
    tile: 'bg-fuchsia-100 text-fuchsia-600 dark:bg-fuchsia-500/15 dark:text-fuchsia-300',
    ring: 'ring-fuchsia-400 dark:ring-fuchsia-400/70',
    card: 'from-fuchsia-50 via-white to-pink-50 dark:from-fuchsia-950/40 dark:via-slate-900 dark:to-slate-900',
    chip: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-200',
  },
  wyr: {
    icon: Split,
    tile: 'bg-teal-100 text-teal-600 dark:bg-teal-500/15 dark:text-teal-300',
    ring: 'ring-teal-400 dark:ring-teal-400/70',
    card: 'from-teal-50 via-white to-emerald-50 dark:from-teal-950/40 dark:via-slate-900 dark:to-slate-900',
    chip: 'bg-teal-100 text-teal-800 dark:bg-teal-500/15 dark:text-teal-200',
  },
  quickfire: {
    icon: Zap,
    tile: 'bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300',
    ring: 'ring-sky-400 dark:ring-sky-400/70',
    card: 'from-sky-50 via-white to-cyan-50 dark:from-sky-950/40 dark:via-slate-900 dark:to-slate-900',
    chip: 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-200',
  },
};
