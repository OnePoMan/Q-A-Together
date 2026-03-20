import { useState, useEffect, useCallback, useRef } from 'react';
import type { RoomState } from '../types';

const POLL_INTERVAL = 2000;

export function useRoom() {
  const [room, setRoom] = useState<RoomState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const fetchRoom = useCallback(async (code: string): Promise<RoomState | null> => {
    const res = await fetch(`/api/room?code=${encodeURIComponent(code)}`);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Room error: ${res.status}`);
    }
    return res.json();
  }, []);

  const startPolling = useCallback((code: string) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const data = await fetchRoom(code);
        if (data) setRoom(data);
      } catch {
        // Silently ignore poll errors
      }
    }, POLL_INTERVAL);
  }, [fetchRoom, stopPolling]);

  const createRoom = useCallback(async (questions: string[], mood: string, topics: string[]) => {
    setError(null);
    try {
      const res = await fetch('/api/room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions, mood, topics }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to create room');
      }
      const roomData: RoomState = await res.json();
      setRoom(roomData);
      setIsConnected(true);
      startPolling(roomData.code);
      return roomData;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create room';
      setError(msg);
      return null;
    }
  }, [startPolling]);

  const joinRoom = useCallback(async (code: string) => {
    setError(null);
    try {
      const roomData = await fetchRoom(code.toUpperCase());
      if (roomData) {
        setRoom(roomData);
        setIsConnected(true);
        startPolling(roomData.code);
      }
      return roomData;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Room not found';
      setError(msg);
      return null;
    }
  }, [fetchRoom, startPolling]);

  const updateIndex = useCallback(async (index: number) => {
    if (!room) return;
    setRoom(prev => prev ? { ...prev, currentIndex: index } : prev);
    try {
      await fetch(`/api/room?code=${encodeURIComponent(room.code)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentIndex: index }),
      });
    } catch {
      // Best effort sync
    }
  }, [room]);

  const leaveRoom = useCallback(() => {
    stopPolling();
    setRoom(null);
    setIsConnected(false);
    setError(null);
  }, [stopPolling]);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  return {
    room,
    isConnected,
    error,
    createRoom,
    joinRoom,
    updateIndex,
    leaveRoom,
  };
}
