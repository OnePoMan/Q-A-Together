import React, { useEffect, useState } from 'react';
import { displayNames } from '../shared/brand';
import { Modal } from './Modal';
import { Button } from './Button';
import { MAX_ANSWER_LENGTH, type JournalEntry } from '../lib/journal';
import type { Question } from '../shared/vibes';

interface JournalDialogProps {
  question: Question | null;
  entry: JournalEntry | undefined;
  names: [string, string];
  onSave: (q: Question, answers: [string, string]) => void;
  onDelete: (q: Question) => void;
  onClose: () => void;
}

export const JournalDialog: React.FC<JournalDialogProps> = ({ question, entry, names, onSave, onDelete, onClose }) => {
  const [answers, setAnswers] = useState<[string, string]>(['', '']);

  useEffect(() => {
    if (question) setAnswers(entry ? [...entry.answers] : ['', '']);
  }, [question, entry]);

  const labels = displayNames(names);

  return (
    <Modal open={!!question} onClose={onClose} title="Remember this one">
      {question && (
        <form
          onSubmit={e => {
            e.preventDefault();
            onSave(question, [answers[0].trim(), answers[1].trim()]);
            onClose();
          }}
        >
          <p className="mb-5 font-serif text-lg leading-snug text-slate-800 dark:text-slate-100">{question.text}</p>
          {[0, 1].map(i => (
            <label key={i} className="mb-4 block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">{labels[i]}'s answer</span>
              <textarea
                value={answers[i]}
                maxLength={MAX_ANSWER_LENGTH}
                rows={3}
                placeholder="Jot it down so you remember..."
                onChange={e => {
                  const next: [string, string] = [...answers];
                  next[i] = e.target.value;
                  setAnswers(next);
                }}
                className="w-full resize-y rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </label>
          ))}
          <p className="mb-5 text-xs text-slate-500 dark:text-slate-400">Saved only on this phone. Find them later under Memories.</p>
          <div className="flex flex-col gap-3 sm:flex-row-reverse">
            <Button type="submit" disabled={!answers.some(a => a.trim())}>
              Save to Memories
            </Button>
            {entry && (
              <Button
                variant="secondary"
                onClick={() => {
                  onDelete(question);
                  onClose();
                }}
              >
                Delete memory
              </Button>
            )}
          </div>
        </form>
      )}
    </Modal>
  );
};
