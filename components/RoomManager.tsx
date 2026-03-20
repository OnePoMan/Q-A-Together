import React, { useState } from 'react';
import { Button } from './Button';
import { Users, Copy, ArrowRight, X } from 'lucide-react';
import { tapShort } from '../utils/haptics';

interface RoomManagerProps {
  onCreateRoom: () => void;
  onJoinRoom: (code: string) => void;
  isCreating: boolean;
  roomCode: string | null;
  roomError: string | null;
  onClose: () => void;
}

export const RoomManager: React.FC<RoomManagerProps> = ({
  onCreateRoom,
  onJoinRoom,
  isCreating,
  roomCode,
  roomError,
  onClose,
}) => {
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCopyCode = async () => {
    if (!roomCode) return;
    tapShort();
    const shareUrl = `${window.location.origin}?room=${roomCode}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Q&A Together', text: `Join my Q&A room: ${roomCode}`, url: shareUrl });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // cancelled
    }
  };

  const handleJoin = () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length === 4) {
      onJoinRoom(code);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-stone-800 rounded-3xl border border-amber-100 dark:border-stone-700 shadow-2xl w-full max-w-sm p-8 animate-fade-in-up relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
        >
          <X className="w-4 h-4 text-stone-400" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-full bg-amber-50 dark:bg-amber-900/30">
            <Users className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <h2 className="text-xl font-serif font-semibold text-stone-800 dark:text-stone-100">Play Together</h2>
        </div>

        {roomCode ? (
          /* Room created — show code */
          <div className="text-center">
            <p className="text-sm text-stone-500 dark:text-stone-400 mb-4">Share this code with your partner:</p>
            <div className="text-4xl font-mono font-bold tracking-[0.3em] text-amber-600 dark:text-amber-400 mb-4">
              {roomCode}
            </div>
            <button
              onClick={handleCopyCode}
              className="inline-flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 font-medium"
            >
              <Copy className="w-4 h-4" />
              {copied ? 'Copied!' : 'Share link'}
            </button>
            <p className="mt-4 text-xs text-stone-400 dark:text-stone-500">Waiting for your partner to join...</p>
          </div>
        ) : (
          /* Create or Join */
          <div className="space-y-6">
            <div>
              <Button onClick={onCreateRoom} isLoading={isCreating} className="w-full">
                Create Room
              </Button>
              <p className="text-xs text-stone-400 dark:text-stone-500 text-center mt-2">
                Start a new session and invite your partner
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-stone-200 dark:bg-stone-700" />
              <span className="text-xs text-stone-400 dark:text-stone-500 uppercase tracking-wider">or</span>
              <div className="flex-1 h-px bg-stone-200 dark:bg-stone-700" />
            </div>

            <div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 4))}
                  placeholder="CODE"
                  maxLength={4}
                  className="flex-1 px-4 py-3 rounded-xl border border-amber-100 dark:border-stone-600 bg-white dark:bg-stone-900 text-center text-lg font-mono font-bold tracking-[0.2em] text-stone-800 dark:text-stone-100 placeholder:text-stone-300 dark:placeholder:text-stone-600 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <button
                  onClick={handleJoin}
                  disabled={joinCode.length !== 4}
                  className="p-3 rounded-xl bg-amber-500 text-white hover:bg-amber-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-stone-400 dark:text-stone-500 text-center mt-2">
                Enter a room code to join
              </p>
            </div>
          </div>
        )}

        {roomError && (
          <p className="mt-4 text-sm text-red-500 text-center">{roomError}</p>
        )}
      </div>
    </div>
  );
};
