import React from 'react';
import { WifiOff } from 'lucide-react';

export const OfflineBanner: React.FC = () => (
  <div
    role="status"
    className="bg-amber-50 dark:bg-amber-500/10 border-b border-amber-200 dark:border-amber-500/20 px-4 py-2 flex items-center justify-center gap-2 text-sm text-amber-800 dark:text-amber-200"
  >
    <WifiOff className="w-4 h-4 shrink-0" aria-hidden />
    <span>You're offline. New decks come from saved and built-in questions.</span>
  </div>
);
