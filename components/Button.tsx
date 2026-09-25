import React from 'react';
import { LoaderCircle } from 'lucide-react';
import type { ButtonProps } from '../types';

const base =
  'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97] select-none';

const variants = {
  primary:
    'bg-rose-500 text-white shadow-lg shadow-rose-500/25 hover:bg-rose-600 hover:shadow-xl hover:shadow-rose-500/30 focus-visible:ring-rose-500',
  secondary:
    'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 focus-visible:ring-slate-400',
  ghost: 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:ring-slate-400',
};

const sizes = {
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-8 py-4 text-base',
};

export const Button: React.FC<ButtonProps> = ({
  children,
  isLoading,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled,
  type = 'button',
  ...props
}) => (
  <button
    type={type}
    className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
    disabled={isLoading || disabled}
    aria-busy={isLoading || undefined}
    {...props}
  >
    {isLoading && <LoaderCircle className="w-5 h-5 animate-spin" aria-hidden />}
    {children}
  </button>
);
