import React from 'react';
import { Flame } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

interface AgeGateDialogProps {
  open: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export const AgeGateDialog: React.FC<AgeGateDialogProps> = ({ open, onConfirm, onClose }) => (
  <Modal open={open} onClose={onClose} title="Spicy is 18+">
    <div className="mb-5 flex items-start gap-3">
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-300">
        <Flame className="h-5 w-5" aria-hidden />
      </span>
      <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        This vibe mixes flirty, suggestive and sexually explicit questions for consenting adult partners. Only continue if
        you are both 18 or older.
      </p>
    </div>
    <p className="mb-6 text-xs text-slate-500 dark:text-slate-400">
      Explicit cards are written into the app and never sent to the AI. You can lock this vibe again in Settings.
    </p>
    <div className="flex flex-col gap-3 sm:flex-row-reverse">
      <Button onClick={onConfirm}>
        We're both 18+
      </Button>
      <Button variant="secondary" onClick={onClose}>
        Not now
      </Button>
    </div>
  </Modal>
);
