import { isVibeId, MAX_QUESTION_LENGTH, type Question, type VibeId } from '../shared/vibes.js';
import { HttpError, clientIp, readJsonPost, sendError, type ApiRequest, type ApiResponse } from '../server/http.js';
import { KEY_PREFIX, getStore, type Store } from '../server/store.js';

// Shared rooms let two phones follow the same deck. All actions are POST so the
// Origin check applies to every call, including polling.

export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O, 1/I/L
export const CODE_LENGTH = 6;
const ROOM_TTL = 3 * 60 * 60;
const MAX_ROOM_QUESTIONS = 60;
const CREATES_PER_HOUR = 10;
const MISSES_PER_10_MIN = 20;

export interface RoomState {
  code: string;
  vibe: VibeId;
  label?: string;
  questions: Question[];
  index: number;
  version: number;
  updatedAt: number;
}

const roomKey = (code: string) => `${KEY_PREFIX}room:${code}`;

export function generateCode(random: () => number = Math.random): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) code += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)];
  return code;
}

function parseCode(value: unknown): string {
  const code = typeof value === 'string' ? value.trim().toUpperCase() : '';
  if (code.length !== CODE_LENGTH || [...code].some(ch => !CODE_ALPHABET.includes(ch))) {
    throw new HttpError(400, 'bad_code', 'That room code does not look right.');
  }
  return code;
}

function parseQuestions(value: unknown): Question[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_ROOM_QUESTIONS) {
    throw new HttpError(400, 'bad_request', 'A room needs a deck of questions.');
  }
  const questions = value.flatMap(item => {
    const text = typeof item?.text === 'string' ? item.text.replace(/\s+/g, ' ').trim().slice(0, MAX_QUESTION_LENGTH) : '';
    const category = typeof item?.category === 'string' ? item.category.replace(/\s+/g, ' ').trim().slice(0, 40) : '';
    if (!text) return [];
    return [item?.local === true ? { text, category, local: true } : { text, category }];
  });
  if (questions.length === 0) throw new HttpError(400, 'bad_request', 'A room needs a deck of questions.');
  return questions;
}

function parseIndex(value: unknown, max: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > max) {
    throw new HttpError(400, 'bad_request', 'Invalid position.');
  }
  return value;
}

const parseLabel = (value: unknown) => (typeof value === 'string' ? value.trim().slice(0, 30) || undefined : undefined);

async function loadRoom(store: Store, code: string, ip: string): Promise<RoomState> {
  const raw = await store.get(roomKey(code));
  if (!raw) {
    // Throttle code guessing.
    const misses = await store.incr(`${KEY_PREFIX}room-miss:${ip}`, 600);
    if (misses > MISSES_PER_10_MIN) throw new HttpError(429, 'rate_limited', 'Too many wrong codes. Try again in a few minutes.');
    throw new HttpError(404, 'room_not_found', 'That room has ended or the code is wrong.');
  }
  return JSON.parse(raw) as RoomState;
}

const saveRoom = (store: Store, room: RoomState) => store.set(roomKey(room.code), JSON.stringify(room), ROOM_TTL);

export default async function handler(req: ApiRequest, res: ApiResponse) {
  try {
    const body = readJsonPost(req, res);
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      throw new HttpError(400, 'bad_request', 'Body must be a JSON object');
    }
    const input = body as Record<string, unknown>;
    const store = getStore();
    const ip = clientIp(req);

    switch (input.action) {
      case 'create': {
        const creates = await store.incr(`${KEY_PREFIX}room-create:${ip}`, 3600);
        if (creates > CREATES_PER_HOUR) throw new HttpError(429, 'rate_limited', 'Too many rooms. Try again later.');
        if (!isVibeId(input.vibe)) throw new HttpError(400, 'bad_request', 'Unknown vibe');

        const questions = parseQuestions(input.questions);
        const room: RoomState = {
          code: '',
          vibe: input.vibe,
          label: parseLabel(input.label),
          questions,
          index: input.index === undefined ? 0 : parseIndex(input.index, questions.length),
          version: 1,
          updatedAt: Date.now(),
        };
        for (let attempt = 0; attempt < 5 && !room.code; attempt++) {
          const code = generateCode();
          if (await store.set(roomKey(code), JSON.stringify({ ...room, code }), ROOM_TTL, true)) room.code = code;
        }
        if (!room.code) throw new HttpError(503, 'busy', 'Could not create a room. Try again.');
        return res.status(201).json(room);
      }

      case 'get': {
        const room = await loadRoom(store, parseCode(input.code), ip);
        if (typeof input.version === 'number' && input.version === room.version) {
          return res.status(200).json({ unchanged: true, version: room.version });
        }
        return res.status(200).json(room);
      }

      case 'update': {
        const room = await loadRoom(store, parseCode(input.code), ip);
        if (input.questions !== undefined) {
          room.questions = parseQuestions(input.questions);
          room.index = 0;
          if (isVibeId(input.vibe)) room.vibe = input.vibe;
          room.label = parseLabel(input.label);
        }
        if (input.index !== undefined) room.index = parseIndex(input.index, room.questions.length);
        room.version += 1;
        room.updatedAt = Date.now();
        await saveRoom(store, room);
        return res.status(200).json(room);
      }

      default:
        throw new HttpError(400, 'bad_request', 'Unknown action');
    }
  } catch (error) {
    if (error instanceof HttpError) return sendError(res, error);
    console.error('[room] failed:', error);
    return sendError(res, new HttpError(503, 'unavailable', 'Rooms are unavailable right now. Try again later.'));
  }
}
