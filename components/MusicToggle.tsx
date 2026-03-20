import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { tapShort } from '../utils/haptics';

interface MusicToggleProps {
  isPlaying: boolean;
  onToggle: () => void;
}

export const MusicToggle: React.FC<MusicToggleProps> = ({ isPlaying, onToggle }) => {
  const handleClick = () => {
    tapShort();
    onToggle();
  };

  return (
    <button
      onClick={handleClick}
      className="p-2 rounded-full text-stone-500 dark:text-stone-400 hover:bg-amber-50 dark:hover:bg-stone-800 transition-colors"
      aria-label={isPlaying ? 'Mute music' : 'Play music'}
    >
      {isPlaying ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
    </button>
  );
};
