import type { Question } from '../shared/vibes';

/** One remembered answer pair. Stored on this device only, never sent anywhere. */
export interface JournalEntry {
  question: Question;
  answers: [string, string];
  updatedAt: number;
}

export type Journal = Record<string, JournalEntry>;

export const MAX_ANSWER_LENGTH = 1000;
export const MAX_JOURNAL_ENTRIES = 1000;

export const hasAnswers = (entry: JournalEntry | undefined) => !!entry && entry.answers.some(a => a.trim());
