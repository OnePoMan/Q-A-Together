import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from '@google/genai';

const PRIMARY_MODEL = 'gemini-3-flash-preview';
const FALLBACK_MODEL = 'gemini-3.1-flash-lite-preview';

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

    let prompt = `Generate 20 creative, intellectually stimulating, and entertaining questions for a couple to ask each other.

Each question should be surprising, specific, and spark genuine debate or storytelling -- not something easily answered in one word. Aim for questions that make people pause, laugh, or say "oh, that's a good one."

Draw from a WIDE variety of categories. Each batch should include questions from at least 8 of these categories, and no more than 3 from any single one:

- Thought experiments & philosophy-lite (e.g., "If you could know the absolute truth to one question about the universe, but you could never share the answer, what would you ask?")
- Creative dilemmas with no right answer (e.g., "You can either have a pause button for your own life or a rewind button, but only one -- which do you pick and why?")
- Absurd hypotheticals played straight (e.g., "Every bird on Earth now works for you. What's your first order of business?")
- Unexpected 'would you rather' scenarios (e.g., "Would you rather have your life narrated out loud by Morgan Freeman 24/7 or have a permanent laugh track that plays whenever something happens to you?")
- Taste, culture & guilty pleasures (e.g., "What's a hill you'd die on that literally nobody else cares about?")
- Time, memory & alternate lives (e.g., "If you could spend a year living in any decade of the past -- but you'd have no modern technology -- which decade and where?")
- Superpowers & sci-fi premises (e.g., "You wake up and discover you can fluently speak to one species of animal. Which do you choose and what do you do first?")
- Strategy & survival (e.g., "You have 24 hours to hide a giraffe from the FBI. What's your plan?")
- Self-knowledge & quirks (e.g., "What's something you're embarrassingly competitive about?")
- Food, travel & sensory experiences (e.g., "If you could teleport to any restaurant in the world right now, where are we going and what are we ordering?")
- Collaborative imagination (e.g., "If we had to open a business together by next month with a $500 budget, what are we launching?")
- Rapid-fire judgment calls (e.g., "Rank these in order of how much you'd panic: lost wallet, dead phone, spider on your shoulder, surprise public speaking")

QUALITY GUIDELINES:
- Favor specificity over vagueness. "What's a weird food combo you secretly love?" beats "What's your favorite food?"
- Mix question lengths -- some punchy one-liners, some with a fun setup.
- Vary the sentence structure: don't start every question with "If you could..."
- Questions should feel fresh and modern, not like a generic icebreaker list.
- Keep everything lighthearted and positive. No heavy, dark, or anxiety-inducing topics.

Return the result as a JSON array of 20 strings.`;

    if (recentHistory.length > 0) {
      prompt += `\n\nIMPORTANT: The following questions have already been asked. DO NOT generate any of these or anything very similar to them:\n${JSON.stringify(recentHistory)}`;
    }

    const config = {
      responseMimeType: 'application/json' as const,
      responseSchema: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
      temperature: 0.95,
    };

    let response;
    try {
      response = await ai.models.generateContent({
        model: PRIMARY_MODEL,
        contents: prompt,
        config,
      });
    } catch (primaryError: unknown) {
      const status = (primaryError as { status?: number }).status;
      if (status === 429 || status === 503) {
        console.warn(`${PRIMARY_MODEL} returned ${status}, falling back to ${FALLBACK_MODEL}`);
        response = await ai.models.generateContent({
          model: FALLBACK_MODEL,
          contents: prompt,
          config,
        });
      } else {
        throw primaryError;
      }
    }

    const rawText = response.text;
    if (!rawText) {
      return res.status(500).json({ error: 'No content generated' });
    }

    const questions: string[] = JSON.parse(rawText);
    return res.status(200).json({ questions });
  } catch (error) {
    console.error('Error generating questions:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: 'Failed to generate questions', details: message });
  }
}
