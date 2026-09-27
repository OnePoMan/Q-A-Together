import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

/** Native <dialog> modal: focus trapping, Escape and backdrop handled by the browser. */
export const Modal: React.FC<ModalProps> = ({ open, onClose, title, children }) => {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = `modal-${title.replace(/\W+/g, '-').toLowerCase()}`;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={e => {
        if (e.target === ref.current) onClose();
      }}
      aria-labelledby={titleId}
      className="m-auto w-[min(28rem,calc(100vw-2rem))] max-h-[calc(100dvh-2rem)] rounded-3xl bg-white dark:bg-slate-900 p-0 text-slate-900 dark:text-slate-100 shadow-2xl backdrop:bg-slate-950/50 backdrop:backdrop-blur-sm"
    >
      <div className="p-6 sm:p-7">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 id={titleId} className="font-serif text-2xl">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        {open && children}
      </div>
    </dialog>
  );
};
