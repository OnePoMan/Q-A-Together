// Shared between the client and the serverless API. Keep this file free of
// browser- or Node-only APIs.

export type VibeId = 'mix' | 'playful' | 'big-ideas' | 'us' | 'deep' | 'wyr' | 'quickfire' | 'spicy';

export interface Vibe {
  id: VibeId;
  label: string;
  tagline: string;
  /** Adults-only: hidden behind an 18+ confirmation and never mixed into other vibes. */
  adult?: boolean;
}

export const VIBES: readonly Vibe[] = [
  { id: 'mix', label: 'Surprise Me', tagline: 'A little of everything' },
  { id: 'playful', label: 'Playful', tagline: 'Absurd, silly, laugh-out-loud' },
  { id: 'big-ideas', label: 'Big Ideas', tagline: 'Thought experiments & what-ifs' },
  { id: 'us', label: 'Just Us', tagline: 'Memories, dreams & each other' },
  { id: 'deep', label: 'Deep Talk', tagline: 'Honest, reflective, meaningful' },
  { id: 'wyr', label: 'Would You Rather', tagline: 'Impossible choices' },
  { id: 'quickfire', label: 'Quick Fire', tagline: 'Fast answers for road trips' },
  { id: 'spicy', label: 'Spicy', tagline: 'Flirty to explicit. 18+ only', adult: true },
];

export const DEFAULT_VIBE: VibeId = 'mix';

export const isVibeId = (value: unknown): value is VibeId =>
  typeof value === 'string' && VIBES.some(v => v.id === value);

export const getVibe = (id: VibeId): Vibe => VIBES.find(v => v.id === id) ?? VIBES[0];

export interface Question {
  text: string;
  category: string;
  /** Hand-written 18+ card: never sent to the AI (not even as history or feedback). */
  local?: boolean;
}

export const BATCH_SIZE = 20;
/** Extra questions requested per AI call and banked for later decks, to stretch the daily quota. */
export const BANK_EXTRA = 10;
/** Max liked/disliked examples the client sends to steer generation. */
export const MAX_FEEDBACK_SENT = 8;
export const MAX_QUESTION_LENGTH = 280;
/** How many previously asked questions the client sends for de-duplication. */
export const MAX_HISTORY_SENT = 80;

/** Lowercase, strip punctuation and collapse whitespace so near-identical questions compare equal. */
export const normalizeQuestion = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[^\p{L}\p{N}' ]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
