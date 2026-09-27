import { useCallback, useEffect, useRef, useState } from 'react';
import type { Question, VibeId } from '../shared/vibes';

export interface RoomDeck {
  vibe: VibeId;
  questions: Question[];
  index: number;
  label?: string;
}

interface RoomState extends RoomDeck {
  code: string;
  version: number;
}

const POLL_MS = 3000;
/** Matches the server's per-room cap. */
const MAX_ROOM_QUESTIONS = 60;

const forRoom = (deck: RoomDeck): RoomDeck => {
  const questions = deck.questions.slice(0, MAX_ROOM_QUESTIONS);
  return { ...deck, questions, index: Math.min(deck.index, questions.length) };
};
const ROOM_KEY = 'qa-room';

class RoomError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
  }
}

async function roomCall(body: Record<string, unknown>): Promise<RoomState | { unchanged: true; version: number }> {
  let response: Response;
  try {
    response = await fetch('/api/room', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new RoomError("Couldn't reach the room service.", 'network');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new RoomError(data.message ?? 'Room error.', data.error ?? 'failed');
  return data;
}

const readStoredCode = (): string | null => {
  try {
    return sessionStorage.getItem(ROOM_KEY);
  } catch {
    return null;
  }
};
const storeCode = (code: string | null) => {
  try {
    if (code) sessionStorage.setItem(ROOM_KEY, code);
    else sessionStorage.removeItem(ROOM_KEY);
  } catch {
    // storage unavailable
  }
};

/**
 * Keeps one deck in sync between phones through /api/room. Remote changes are
 * delivered through `onRemoteDeck`; local changes are pushed with `pushIndex`
 * and `pushDeck`.
 */
export function useRoom(onRemoteDeck: (deck: RoomDeck) => void, onEnded: (message: string) => void) {
  const [code, setCode] = useState<string | null>(readStoredCode);
  const [busy, setBusy] = useState(false);
  const version = useRef(0);
  const callbacks = useRef({ onRemoteDeck, onEnded });
  callbacks.current = { onRemoteDeck, onEnded };

  const apply = useCallback((room: RoomState) => {
    if (room.version <= version.current) return;
    version.current = room.version;
    callbacks.current.onRemoteDeck({ vibe: room.vibe, questions: room.questions, index: room.index, label: room.label });
  }, []);

  const leave = useCallback(() => {
    storeCode(null);
    setCode(null);
    version.current = 0;
  }, []);

  const handleError = useCallback(
    (error: unknown) => {
      if (error instanceof RoomError && (error.code === 'room_not_found' || error.code === 'bad_code')) {
        leave();
        callbacks.current.onEnded(error.message);
        return true;
      }
      return false;
    },
    [leave],
  );

  // Poll while in a room and the page is visible.
  useEffect(() => {
    if (!code) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;

    const tick = async () => {
      if (stopped) return;
      if (document.visibilityState === 'visible') {
        try {
          const result = await roomCall({ action: 'get', code, version: version.current });
          if (!('unchanged' in result)) apply(result);
        } catch (error) {
          if (handleError(error)) return;
        }
      }
      timer = setTimeout(tick, POLL_MS);
    };
    tick();
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        clearTimeout(timer);
        tick();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [code, apply, handleError]);

  const create = useCallback(async (deck: RoomDeck) => {
    setBusy(true);
    try {
      const room = (await roomCall({ action: 'create', ...forRoom(deck) })) as RoomState;
      version.current = room.version;
      storeCode(room.code);
      setCode(room.code);
      return room.code;
    } finally {
      setBusy(false);
    }
  }, []);

  const join = useCallback(
    async (rawCode: string) => {
      setBusy(true);
      try {
        const joinCode = rawCode.trim().toUpperCase();
        const room = (await roomCall({ action: 'get', code: joinCode })) as RoomState;
        version.current = 0;
        apply(room);
        storeCode(room.code);
        setCode(room.code);
      } finally {
        setBusy(false);
      }
    },
    [apply],
  );

  const push = useCallback(
    async (body: Record<string, unknown>) => {
      if (!code) return;
      try {
        const room = (await roomCall({ action: 'update', code, ...body })) as RoomState;
        version.current = Math.max(version.current, room.version);
      } catch (error) {
        handleError(error);
      }
    },
    [code, handleError],
  );

  const pushIndex = useCallback((index: number) => push({ index }), [push]);
  const pushDeck = useCallback(
    (deck: RoomDeck) => {
      const { vibe, label, questions } = forRoom(deck);
      return push({ vibe, label, questions });
    },
    [push],
  );

  return { code, busy, create, join, leave, pushIndex, pushDeck };
}

export { RoomError };
