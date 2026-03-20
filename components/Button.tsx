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
    primary: "bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700 focus:ring-amber-400 shadow-amber-200/50 dark:shadow-amber-900/30",
    secondary: "bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 border border-amber-200 dark:border-stone-600 hover:bg-amber-50 dark:hover:bg-stone-700 focus:ring-amber-200 dark:focus:ring-stone-600",
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
