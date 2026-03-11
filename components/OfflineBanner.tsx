import React from 'react';
import { WifiOff } from 'lucide-react';

export const OfflineBanner: React.FC = () => (
  <div className="bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-700 px-4 py-2 flex items-center justify-center gap-2 text-sm text-amber-700 dark:text-amber-300">
    <WifiOff className="w-4 h-4" />
    <span>You're offline — showing cached questions</span>
  </div>
);
