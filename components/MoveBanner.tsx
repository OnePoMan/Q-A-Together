import React from 'react';
import { ArrowRight } from 'lucide-react';
import { APP_URL, OLD_HOSTNAME } from '../shared/brand';
import { buildTransferLink } from '../lib/transfer';

/** Shown only on the old address, with a one-tap move of this device's data. */
export const MoveBanner: React.FC = () => {
  if (window.location.hostname !== OLD_HOSTNAME) return null;
  return (
    <div className="border-b border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 px-4 py-3 text-sm text-rose-900 dark:text-rose-100">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-center gap-2 text-center sm:flex-row sm:gap-4">
        <span>We have a new home: {APP_URL.replace('https://', '')}</span>
        <a
          href="#move"
          onClick={e => {
            e.preventDefault();
            window.location.href = buildTransferLink(APP_URL);
          }}
          className="inline-flex items-center gap-1.5 rounded-full bg-rose-500 px-4 py-1.5 font-semibold text-white hover:bg-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2"
        >
          Move my saved questions
          <ArrowRight className="h-4 w-4" aria-hidden />
        </a>
      </div>
    </div>
  );
};
