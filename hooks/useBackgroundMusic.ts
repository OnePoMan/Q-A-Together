import { useState, useEffect, useRef, useCallback } from 'react';

const STORAGE_KEY_ON = 'qa-music-on';
const STORAGE_KEY_VOL = 'qa-music-volume';

export function useBackgroundMusic(src: string) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_ON) === 'true';
    } catch {
      return false;
    }
  });
  const [volume, setVolumeState] = useState(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY_VOL);
      return v ? parseFloat(v) : 0.3;
    } catch {
      return 0.3;
    }
  });

  useEffect(() => {
    const audio = new Audio(src);
    audio.loop = true;
    audio.volume = volume;
    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, [src]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.play().catch(() => {
        // Autoplay blocked — will retry on next user interaction
        setIsPlaying(false);
      });
    } else {
      audio.pause();
    }

    try { localStorage.setItem(STORAGE_KEY_ON, String(isPlaying)); } catch {}
  }, [isPlaying]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
    try { localStorage.setItem(STORAGE_KEY_VOL, String(volume)); } catch {}
  }, [volume]);

  const toggle = useCallback(() => setIsPlaying(prev => !prev), []);
  const setVolume = useCallback((v: number) => setVolumeState(Math.max(0, Math.min(1, v))), []);

  return { isPlaying, toggle, volume, setVolume };
}
