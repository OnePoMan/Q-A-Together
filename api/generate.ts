import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const { previouslyAsked = [] } = req.body || {};

    // Cap to last 100 to stay within token limits
    const recentHistory = Array.isArray(previouslyAsked)
      ? previouslyAsked.slice(-100)
      : [];

    let prompt = `Generate 20 fun, lighthearted, and open-ended questions for a couple to ask each other.

  The goal is to spark entertaining conversation, not deep relationship analysis.
  Please include a diverse mix of topics such as:
  - Imaginative scenarios (e.g., "If we were characters in a video game...", "If you could instantly learn any skill...")
  - Just-for-fun hypotheticals (e.g., "How would we survive a zombie apocalypse?", "If animals could talk, which would be the rudest?")
  - Playful "Would you rather" style questions
  - Random questions about life, the universe, and personal quirks.

  Avoid strictly relationship-focused questions (like "What is your favorite memory of us?").
  Avoid negative or heavy topics.
  Return the result as a simple JSON array of strings.`;

    if (recentHistory.length > 0) {
      prompt += `\n\nIMPORTANT: The following questions have already been asked. DO NOT generate any of these or anything very similar to them:\n${JSON.stringify(recentHistory)}`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        temperature: 0.9,
      },
    });

    const rawText = response.text;
    if (!rawText) {
      return res.status(500).json({ error: 'No content generated' });
    }

    const questions: string[] = JSON.parse(rawText);
    return res.status(200).json({ questions });
  } catch (error) {
    console.error('Error generating questions:', error);
    return res.status(500).json({ error: 'Failed to generate questions' });
  }
}
