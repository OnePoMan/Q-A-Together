import { describe, expect, it } from 'vitest';
import { hasAnswers, type JournalEntry } from '../lib/journal';

const entry = (answers: [string, string]): JournalEntry => ({
  question: { text: 'Q?', category: 'C' },
  answers,
  updatedAt: 1,
});

describe('hasAnswers', () => {
  it('is false for undefined', () => {
    expect(hasAnswers(undefined)).toBe(false);
  });
  it('is false when both answers are empty', () => {
    expect(hasAnswers(entry(['', '']))).toBe(false);
  });
  it('is false when answers are whitespace only', () => {
    expect(hasAnswers(entry([' \n\t', '   ']))).toBe(false);
  });
  it('is true when either answer has content', () => {
    expect(hasAnswers(entry(['hi', '']))).toBe(true);
    expect(hasAnswers(entry(['', 'hi']))).toBe(true);
    expect(hasAnswers(entry(['a', 'b']))).toBe(true);
  });
  it('is true for content surrounded by whitespace', () => {
    expect(hasAnswers(entry(['  x  ', '']))).toBe(true);
  });
});
