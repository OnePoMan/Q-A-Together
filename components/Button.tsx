import React from 'react';
import { ButtonProps } from '../types';
import { Loader2 } from 'lucide-react';

export const Button: React.FC<ButtonProps> = ({
  children,
  isLoading,
  variant = 'primary',
  className = '',
  ...props
}) => {
  const baseStyles = "inline-flex items-center justify-center rounded-full px-8 py-3 font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 shadow-lg hover:shadow-xl";

  const variants = {
    primary: "bg-rose-500 text-white hover:bg-rose-600 focus:ring-rose-500",
    secondary: "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 focus:ring-slate-200 dark:focus:ring-slate-600",
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
      {children}
    </button>
  );
};
