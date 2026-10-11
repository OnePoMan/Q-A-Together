import type { Question } from '../shared/vibes';

/** Unique, non-empty categories, sorted alphabetically. */
export const categoriesOf = (questions: readonly Question[]): string[] =>
  [...new Set(questions.map(q => q.category).filter(c => c.trim() !== ''))].sort((a, b) => a.localeCompare(b));

/** Case-insensitive substring match on text and category, combined with an optional exact category. */
export const filterQuestions = (questions: readonly Question[], query: string, category: string | null): Question[] => {
  const needle = query.trim().toLowerCase();
  return questions.filter(q => {
    if (category !== null && q.category !== category) return false;
    if (!needle) return true;
    return q.text.toLowerCase().includes(needle) || q.category.toLowerCase().includes(needle);
  });
};
