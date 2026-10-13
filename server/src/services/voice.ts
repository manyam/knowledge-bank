import { config } from '../config.js';
import { getActiveModels } from './ollama.js';

export interface TranslateVoiceResult {
  originalText: string;
  refinedText: string;
  model: string;
}

export async function translateAndRefineVoice(
  spokenText: string,
  targetLanguage: string = 'English'
): Promise<TranslateVoiceResult> {
  const cleanInput = spokenText.trim();
  if (!cleanInput) {
    throw new Error('Spoken text cannot be empty');
  }

  const { chatModel } = getActiveModels();

  const prompt = `You are an AI voice transcription translator and research query refiner.
A user spoke the following message into their microphone:
"""${cleanInput}"""

Instructions:
1. If the speech is in a language other than ${targetLanguage}, translate it into natural ${targetLanguage}.
2. If it is already in ${targetLanguage}, correct any obvious speech recognition phonetic mistakes, remove conversational filler words (e.g. "um", "uh", "like", "you know"), and format it as a clear research question or instruction.
3. Keep the user's original intent completely intact.
4. Return ONLY the final translated/refined query text without any markdown quotes, explanations, or introductory text.`;

  try {
    const res = await fetch(`${config.ollamaBaseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: chatModel,
        prompt,
        stream: false,
        options: {
          temperature: 0.1,
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`[Voice Translate] Ollama error (${res.status}): ${errText}`);
      // Fallback: return the original spoken text if model call fails
      return {
        originalText: cleanInput,
        refinedText: cleanInput,
        model: chatModel,
      };
    }

    const data = (await res.json()) as { response?: string };
    const refined = (data.response || '').trim();

    return {
      originalText: cleanInput,
      refinedText: refined || cleanInput,
      model: chatModel,
    };
  } catch (err: any) {
    console.error('[Voice Translate Error]:', err);
    // Fallback gracefully to original text
    return {
      originalText: cleanInput,
      refinedText: cleanInput,
      model: chatModel,
    };
  }
}
