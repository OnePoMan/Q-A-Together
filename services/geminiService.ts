import { GoogleGenAI, Type } from "@google/genai";

const apiKey = process.env.API_KEY || '';

// Initialize the client with the API key
const ai = new GoogleGenAI({ apiKey });

/**
 * Generates a list of questions using the Gemini API.
 * @param previouslyAsked - A list of questions to exclude to prevent repeats.
 * @returns An array of generated question strings.
 */
export const generateQuestions = async (previouslyAsked: string[] = []): Promise<string[]> => {
  if (!apiKey) {
    throw new Error("API Key not found in environment variables.");
  }

  // Construct the prompt
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

  if (previouslyAsked.length > 0) {
    prompt += `\n\nIMPORTANT: The following questions have already been asked. DO NOT generate any of these or anything very similar to them:\n${JSON.stringify(previouslyAsked)}`;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING,
          },
        },
        // We want creative questions
        temperature: 0.9, 
      },
    });

    const rawText = response.text;
    if (!rawText) {
      throw new Error("No content generated from Gemini.");
    }

    // The responseSchema ensures we get a JSON array directly
    const questions: string[] = JSON.parse(rawText);
    
    return questions;

  } catch (error) {
    console.error("Error generating questions:", error);
    throw error;
  }
};