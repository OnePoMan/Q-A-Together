import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Redis } from '@upstash/redis';

const ROOM_TTL = 7200; // 2 hours

function getRedis(): Redis | null {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const redis = getRedis();
  if (!redis) {
    return res.status(503).json({ error: 'Room service not configured. Set KV_REST_API_URL and KV_REST_API_TOKEN env vars.' });
  }

  const { method } = req;
  const code = (req.query.code as string || '').toUpperCase();

  try {
    if (method === 'POST') {
      // Create room
      const { questions, mood, topics } = req.body || {};
      if (!Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({ error: 'Questions array required' });
      }

      let roomCode = generateCode();
      // Ensure uniqueness
      let attempts = 0;
      while (await redis.exists(`room:${roomCode}`) && attempts < 10) {
        roomCode = generateCode();
        attempts++;
      }

      const roomState = {
        code: roomCode,
        questions,
        currentIndex: 0,
        mood: mood || 'random',
        topics: topics || [],
        createdAt: Date.now(),
      };

      await redis.set(`room:${roomCode}`, JSON.stringify(roomState), { ex: ROOM_TTL });
      return res.status(201).json(roomState);
    }

    if (!code) {
      return res.status(400).json({ error: 'Room code required' });
    }

    if (method === 'GET') {
      const data = await redis.get(`room:${code}`);
      if (!data) {
        return res.status(404).json({ error: 'Room not found or expired' });
      }
      const room = typeof data === 'string' ? JSON.parse(data) : data;
      return res.status(200).json(room);
    }

    if (method === 'PATCH') {
      const data = await redis.get(`room:${code}`);
      if (!data) {
        return res.status(404).json({ error: 'Room not found or expired' });
      }
      const room = typeof data === 'string' ? JSON.parse(data) : data;
      const updates = req.body || {};

      // Only allow updating specific fields
      if (typeof updates.currentIndex === 'number') {
        room.currentIndex = updates.currentIndex;
      }

      await redis.set(`room:${code}`, JSON.stringify(room), { ex: ROOM_TTL });
      return res.status(200).json(room);
    }

    if (method === 'DELETE') {
      await redis.del(`room:${code}`);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Room API error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: 'Room operation failed', details: message });
  }
}
