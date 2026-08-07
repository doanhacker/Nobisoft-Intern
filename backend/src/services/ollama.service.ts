import type { AiEmbedTextResponse } from '../types/ai.type.js';

const OLLAMA_URL = process.env.OLLAMA_URL;
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'gemma2:2b';
const OLLAMA_TIMEOUT_MS = 30_000;

if (!OLLAMA_URL) {
  throw new Error('OLLAMA_URL is required');
}

const TRANSLATE_SYSTEM_PROMPT = `You are an image search query translator. Your ONLY job is to convert the user's input into a short English image description for CLIP-based visual search.

Rules:
- Output ONLY the English description, nothing else
- Remove filler words, opinions, and meta-instructions (e.g. "I want to find", "please search for")
- Extract the core visual subject and its key attributes (color, count, action, setting)
- Keep it under 15 words
- Use simple, concrete nouns and adjectives
- If input is already in English, just clean and simplify it`;

interface OllamaGenerateResponse {
  model: string;
  response: string;
  done: boolean;
}

export class OllamaServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OllamaServiceError';
  }
}

/**
 * Gọi Ollama API để chuyển đổi prompt tiếng Việt/bất kỳ ngôn ngữ nào
 * thành mô tả tiếng Anh ngắn gọn, tối ưu cho CLIP-based search.
 */
export async function translatePrompt(userInput: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);

  try {
    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: userInput,
        system: TRANSLATE_SYSTEM_PROMPT,
        stream: false,
        options: {
          temperature: 0.1,
          top_p: 0.9,
          num_predict: 30,
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new OllamaServiceError(
        `Ollama generate failed: ${response.status} ${response.statusText}`,
      );
    }

    const json = (await response.json()) as OllamaGenerateResponse;
    const translated = json.response?.trim();

    if (!translated) {
      throw new OllamaServiceError('Ollama returned empty response');
    }

    return translated;
  } catch (error) {
    if (error instanceof OllamaServiceError) {
      throw error;
    }
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new OllamaServiceError(`Ollama service timeout (${OLLAMA_TIMEOUT_MS}ms)`);
    }
    throw new OllamaServiceError(`Ollama service unreachable: ${OLLAMA_URL}`);
  } finally {
    clearTimeout(timeoutId);
  }
}
