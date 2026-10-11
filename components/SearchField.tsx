import React from 'react';
import { Search } from 'lucide-react';

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
}

export const SearchField: React.FC<SearchFieldProps> = ({ value, onChange, label, placeholder = 'Search' }) => (
  <div className="relative">
    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
    <input
      type="search"
      value={value}
      onChange={e => onChange(e.target.value)}
      aria-label={label}
      placeholder={placeholder}
      className="w-full rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/70 py-2.5 pl-11 pr-4 text-base text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
    />
  </div>
);
