import { describe, expect, it } from 'vitest';
import { checkSingleAsk } from '../shared/singleAsk';
import { ALL_STARTER_QUESTIONS, getStarterQuestions } from '../data/starterDeck';
import { SPICY_EXPLICIT } from '../data/spicyDeck';
import { ALL_EXAMPLES } from '../server/prompt';
import { MAX_QUESTION_LENGTH, normalizeQuestion } from '../shared/vibes';

describe('checkSingleAsk', () => {
  it.each([
    'You can only talk in song for the rest of the day. How do you adapt and what are the songs you are most likely to sing?',
    'What is your favorite season, and why?',
    'Mountains or ocean? Defend it in ten words or fewer.',
    'What would you order? What would I order?',
    'Which decade would you visit and would you stay there?',
    'Pick a superpower and explain how you would use it.',
    'Which animal would you talk to, and what would you ask first?',
  ])('rejects two-part question: %s', text => {
    expect(checkSingleAsk(text).ok).toBe(false);
  });

  it.each([
    'You can only communicate in song lyrics today. Which song gets the most use?',
    'Would you rather pause time for 10 minutes a day or rewind 10 seconds whenever you want?',
    'Rank these breakfast foods: pancakes, bagels, omelettes, cereal, leftover pizza.',
    'Finish the sentence: The most overrated thing about vacations is...',
    'What would you do if you were invisible and could go anywhere?',
    'Guess my answer: what would I order at a diner at 2am?',
    'Every person gets one guaranteed "yes" in their lifetime. When would you use yours?',
  ])('accepts single ask: %s', text => {
    expect(checkSingleAsk(text).ok).toBe(true);
  });
});

describe('bundled decks', () => {
  const all = [...ALL_STARTER_QUESTIONS, ...SPICY_EXPLICIT];

  it('every card and prompt example asks exactly one thing', () => {
    const failures = [...all.map(q => q.text), ...ALL_EXAMPLES]
      .map(text => ({ text, ...checkSingleAsk(text) }))
      .filter(r => !r.ok);
    expect(failures).toEqual([]);
  });

  it('has no duplicates and respects the length limit', () => {
    const keys = all.map(q => normalizeQuestion(q.text));
    expect(new Set(keys).size).toBe(keys.length);
    for (const q of all) expect(q.text.length).toBeLessThanOrEqual(MAX_QUESTION_LENGTH);
  });

  it('keeps Spicy out of Surprise Me', () => {
    const spicy = new Set(getStarterQuestions('spicy').map(q => q.text));
    expect(getStarterQuestions('mix').some(q => spicy.has(q.text))).toBe(false);
  });

  it('has a deep enough explicit deck', () => {
    expect(SPICY_EXPLICIT.length).toBeGreaterThanOrEqual(50);
  });
});
