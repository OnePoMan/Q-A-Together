import React from 'react';

export interface QuestionResponse {
  questions: string[];
}

export interface QuestionCardProps {
  text: string;
  index: number;
  isFavorite: boolean;
  isAnswered: boolean;
  onToggleFavorite: () => void;
  onToggleAnswered: () => void;
  onShare: () => void;
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  variant?: 'primary' | 'secondary';
}
