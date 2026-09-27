import type React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'md' | 'lg';
}

export type View = 'home' | 'play' | 'saved';
export type PlayLayout = 'card' | 'list';
