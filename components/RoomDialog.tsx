import React, { useState } from 'react';
import { LogOut, Share2, Users } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

interface RoomDialogProps {
  open: boolean;
  onClose: () => void;
  code: string | null;
  busy: boolean;
  canCreate: boolean;
  onCreate: () => void;
  onJoin: (code: string) => void;
  onLeave: () => void;
  onShare: (url: string) => void;
}

export const roomLink = (code: string) => `${window.location.origin}/?room=${code}`;

export const RoomDialog: React.FC<RoomDialogProps> = ({ open, onClose, code, busy, canCreate, onCreate, onJoin, onLeave, onShare }) => {
  const [input, setInput] = useState('');

  return (
    <Modal open={open} onClose={onClose} title={code ? 'Playing together' : 'Play on two phones'}>
      {code ? (
        <div className="text-center">
          <p className="mb-3 text-sm text-slate-600 dark:text-slate-400">
            Your partner opens the link or enters this code. Both phones stay on the same card.
          </p>
          <p
            className="my-5 font-mono text-4xl font-bold tracking-[0.3em] text-slate-900 dark:text-white"
            aria-label={`Room code ${code.split('').join(' ')}`}
          >
            {code}
          </p>
          <div className="flex flex-col gap-3">
            <Button onClick={() => onShare(roomLink(code))}>
              <Share2 className="h-4 w-4" aria-hidden />
              Share invite link
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                onLeave();
                onClose();
              }}
            >
              <LogOut className="h-4 w-4" aria-hidden />
              Leave room
            </Button>
          </div>
          <p className="mt-5 text-xs text-slate-400 dark:text-slate-500">Rooms end after 3 hours without activity.</p>
        </div>
      ) : (
        <div>
          <p className="mb-5 text-sm text-slate-600 dark:text-slate-400">
            Each of you uses your own phone and sees the same question at the same time.
          </p>
          <Button onClick={onCreate} isLoading={busy} disabled={!canCreate} className="w-full">
            {!busy && <Users className="h-4 w-4" aria-hidden />}
            Start a room with this deck
          </Button>
          {!canCreate && <p className="mt-2 text-center text-xs text-slate-500">Deal a deck first, then start a room.</p>}

          <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wider text-slate-400">
            <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
            or join one
            <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
          </div>

          <form
            onSubmit={e => {
              e.preventDefault();
              if (input.trim()) onJoin(input);
            }}
            className="flex gap-2"
          >
            <input
              value={input}
              onChange={e => setInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
              placeholder="ROOM CODE"
              aria-label="Room code"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              inputMode="text"
              className="min-w-0 flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 font-mono text-lg tracking-widest uppercase placeholder:text-slate-400 placeholder:tracking-normal placeholder:font-sans placeholder:text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
            <Button type="submit" variant="secondary" disabled={input.length !== 6 || busy}>
              Join
            </Button>
          </form>
        </div>
      )}
    </Modal>
  );
};
