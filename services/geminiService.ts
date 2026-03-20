import type { Mood, Topic } from '../types';

const CACHE_KEY = 'qa-cached-questions';
const MAX_CACHE = 200;

/**
 * Generates questions via the serverless API proxy.
 */
export const generateQuestions = async (
  previouslyAsked: string[] = [],
  mood: Mood = 'random',
  topics: Topic[] = [],
): Promise<string[]> => {
  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ previouslyAsked, mood, topics }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.details || errorData.error || `API error: ${response.status}`);
  }

  const data = await response.json();
  const questions: string[] = data.questions;

  // Cache questions for offline use
  try {
    const existing = JSON.parse(localStorage.getItem(CACHE_KEY) || '[]') as string[];
    const updated = [...new Set([...existing, ...questions])].slice(-MAX_CACHE);
    localStorage.setItem(CACHE_KEY, JSON.stringify(updated));
  } catch {
    // localStorage unavailable
  }

  return questions;
};

/**
 * Returns cached questions for offline fallback.
 */
export const getCachedQuestions = (count: number, exclude: string[]): string[] => {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || '[]') as string[];
    const available = cached.filter(q => !exclude.includes(q));
    // Shuffle and take requested count
    const shuffled = available.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  } catch {
    return [];
  }
};
