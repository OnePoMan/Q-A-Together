import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from '@google/genai';

const PRIMARY_MODEL = 'gemini-3-flash-preview';
const FALLBACK_MODEL = 'gemini-3.1-flash-lite-preview';

const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

const MOOD_INSTRUCTIONS: Record<string, string> = {
  silly: 'Make the questions extra silly, absurd, and laugh-out-loud funny. Lean into ridiculous scenarios and playful humor.',
  deep: 'Make the questions thought-provoking and philosophically rich. Favor questions that spark meaningful reflection and deep conversation.',
  romantic: 'Make the questions warm, intimate, and relationship-focused. Include questions about dreams together, memories, and what you love about each other.',
  random: '',
};

const TOPIC_TO_CATEGORY: Record<string, string> = {
  'Hypotheticals': '- Absurd hypotheticals played straight (e.g., "Every bird on Earth now works for you. What\'s your first order of business?")',
  'Would You Rather': '- Unexpected \'would you rather\' scenarios (e.g., "Would you rather have your life narrated by Morgan Freeman 24/7 or have a permanent laugh track?")',
  'Philosophy': '- Thought experiments & philosophy-lite (e.g., "If you could know the absolute truth to one question about the universe, but could never share the answer, what would you ask?")\n- Creative dilemmas with no right answer (e.g., "You can either have a pause button or a rewind button for your life, but only one -- which?")',
  'Food & Travel': '- Food, travel & sensory experiences (e.g., "If you could teleport to any restaurant in the world right now, where are we going?")',
  'Superpowers': '- Superpowers & sci-fi premises (e.g., "You wake up and can fluently speak to one species of animal. Which do you choose?")',
  'Strategy': '- Strategy & survival (e.g., "You have 24 hours to hide a giraffe from the FBI. What\'s your plan?")',
  'Self-Knowledge': '- Self-knowledge & quirks (e.g., "What\'s something you\'re embarrassingly competitive about?")\n- Taste, culture & guilty pleasures (e.g., "What\'s a hill you\'d die on that literally nobody else cares about?")',
  'Pop Culture': '- Time, memory & alternate lives (e.g., "If you could spend a year in any past decade with no modern tech -- which decade and where?")',
  'Collaborative': '- Collaborative imagination (e.g., "If we had to open a business together by next month with a $500 budget, what are we launching?")',
  'Rapid-Fire': '- Rapid-fire judgment calls (e.g., "Rank these by how much you\'d panic: lost wallet, dead phone, spider on shoulder, surprise public speaking")',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const { previouslyAsked = [], mood = 'random', topics = [] } = req.body || {};

    // Cap to last 100 to stay within token limits
    const recentHistory = Array.isArray(previouslyAsked)
      ? previouslyAsked.slice(-100)
      : [];

    // Build category list from selected topics (or all if none specified)
    const selectedTopics = Array.isArray(topics) && topics.length > 0
      ? topics
      : Object.keys(TOPIC_TO_CATEGORY);
    const categories = selectedTopics
      .map((t: string) => TOPIC_TO_CATEGORY[t])
      .filter(Boolean)
      .join('\n');

    const moodInstruction = MOOD_INSTRUCTIONS[mood] || '';

    let prompt = `Generate 20 creative, intellectually stimulating, and entertaining questions for a couple to ask each other.

Each question should be surprising, specific, and spark genuine debate or storytelling -- not something easily answered in one word. Aim for questions that make people pause, laugh, or say "oh, that's a good one."
${moodInstruction ? `\nTONE: ${moodInstruction}\n` : ''}
Draw from these categories, spreading questions evenly across them:

${categories}

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
