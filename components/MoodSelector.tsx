import React, { useState } from 'react';
import { Mood, ALL_TOPICS, Topic } from '../types';
import { Button } from './Button';
import { Sparkles } from 'lucide-react';

interface MoodSelectorProps {
  onGenerate: (mood: Mood, topics: Topic[]) => void;
  isLoading: boolean;
}

const MOODS: { value: Mood; label: string; emoji: string }[] = [
  { value: 'random', label: 'Random', emoji: '\uD83C\uDFB2' },
  { value: 'silly', label: 'Silly', emoji: '\uD83D\uDE02' },
  { value: 'deep', label: 'Deep', emoji: '\uD83E\uDD14' },
  { value: 'romantic', label: 'Romantic', emoji: '\uD83D\uDC95' },
];

export const MoodSelector: React.FC<MoodSelectorProps> = ({ onGenerate, isLoading }) => {
  const [mood, setMood] = useState<Mood>('random');
  const [topics, setTopics] = useState<Topic[]>([...ALL_TOPICS]);

  const toggleTopic = (topic: Topic) => {
    setTopics(prev =>
      prev.includes(topic)
        ? prev.filter(t => t !== topic)
        : [...prev, topic]
    );
  };

  const handleGenerate = () => {
    if (topics.length === 0) return;
    onGenerate(mood, topics);
  };

  return (
    <div className="w-full max-w-lg mx-auto animate-fade-in-up">
      <div className="bg-white dark:bg-stone-800/90 rounded-3xl border border-amber-100 dark:border-stone-700 p-8 shadow-lg shadow-amber-100/20 dark:shadow-amber-900/10">
        {/* Mood section */}
        <div className="mb-8">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500 mb-4">
            Set the mood
          </h3>
          <div className="flex flex-wrap gap-2">
            {MOODS.map(({ value, label, emoji }) => (
              <button
                key={value}
                onClick={() => setMood(value)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                  mood === value
                    ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-200/50 dark:shadow-amber-900/30'
                    : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 border-amber-100 dark:border-stone-600 hover:border-amber-300 dark:hover:border-stone-500'
                }`}
              >
                <span className="mr-1.5">{emoji}</span>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Topics section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">
              Topics
            </h3>
            <button
              onClick={() => setTopics(topics.length === ALL_TOPICS.length ? [] : [...ALL_TOPICS])}
              className="text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 font-medium"
            >
              {topics.length === ALL_TOPICS.length ? 'Clear all' : 'Select all'}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {ALL_TOPICS.map((topic) => (
              <button
                key={topic}
                onClick={() => toggleTopic(topic)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                  topics.includes(topic)
                    ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700'
                    : 'bg-stone-50 dark:bg-stone-700 text-stone-400 dark:text-stone-500 border-stone-200 dark:border-stone-600 line-through'
                }`}
              >
                {topic}
              </button>
            ))}
          </div>
          {topics.length === 0 && (
            <p className="mt-2 text-xs text-red-500">Select at least one topic</p>
          )}
        </div>

        {/* Generate button */}
        <Button
          onClick={handleGenerate}
          isLoading={isLoading}
          disabled={topics.length === 0}
          className="w-full"
        >
          <Sparkles className="w-5 h-5 mr-2" />
          Generate Questions
        </Button>
      </div>
    </div>
  );
};
