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

export type Mood = 'random' | 'silly' | 'deep' | 'romantic';

export interface GenerateOptions {
  mood: Mood;
  topics: string[];
}

export const ALL_TOPICS = [
  'Hypotheticals',
  'Would You Rather',
  'Philosophy',
  'Food & Travel',
  'Superpowers',
  'Strategy',
  'Self-Knowledge',
  'Pop Culture',
  'Collaborative',
  'Rapid-Fire',
] as const;

export type Topic = (typeof ALL_TOPICS)[number];

export interface RoomState {
  code: string;
  questions: string[];
  currentIndex: number;
  mood: string;
  topics: string[];
  createdAt: number;
}
