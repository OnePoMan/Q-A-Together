import { describe, expect, it } from 'vitest';
import { categoriesOf, filterQuestions } from '../lib/filterQuestions';

const qs = [
  { text: 'What made you smile today?', category: 'Fun' },
  { text: 'Favorite childhood memory?', category: 'Nostalgia' },
  { text: 'Where to travel next?', category: 'Fun' },
  { text: 'Legacy question', category: '' },
];

describe('categoriesOf', () => {
  it('returns unique, non-empty, sorted categories', () => {
    expect(categoriesOf(qs)).toEqual(['Fun', 'Nostalgia']);
  });
});

describe('filterQuestions', () => {
  it('returns everything with no filters', () => {
    expect(filterQuestions(qs, '', null)).toHaveLength(4);
    expect(filterQuestions(qs, '   ', null)).toHaveLength(4);
  });

  it('matches text case-insensitively', () => {
    expect(filterQuestions(qs, 'SMILE', null).map(q => q.text)).toEqual(['What made you smile today?']);
  });

  it('matches category text', () => {
    expect(filterQuestions(qs, 'nostal', null)).toHaveLength(1);
  });

  it('combines query with the category chip', () => {
    expect(filterQuestions(qs, 'travel', 'Fun')).toHaveLength(1);
    expect(filterQuestions(qs, 'travel', 'Nostalgia')).toHaveLength(0);
  });

  it('filters by category alone', () => {
    expect(filterQuestions(qs, '', 'Fun')).toHaveLength(2);
  });
});
