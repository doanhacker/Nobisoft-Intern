import type { AiEmbedTextResponse } from '../types/ai.type.js';

const OLLAMA_URL = process.env.OLLAMA_URL;
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'gemma2:2b';
const OLLAMA_TIMEOUT_MS = 30_000;

if (!OLLAMA_URL) {
  throw new Error('OLLAMA_URL is required');
}

const TRANSLATE_SYSTEM_PROMPT = `You are an image search query translator for a CLIP-based visual search engine.

Task: Convert user input (any language) into a short, accurate English image description.

Rules:
1. Output ONLY the English description — no explanation, no quotes, no prefix
2. Remove filler words and meta-instructions ("tôi muốn tìm", "hãy tìm cho tôi", "I want to find")
3. Keep proper nouns EXACTLY as given — do NOT substitute or reinterpret names
   - "Ronaldo de Lima" → "Ronaldo de Lima", NOT "Cristiano Ronaldo"
   - "Son Tung MTP" → "Son Tung MTP"
4. Use the most visually recognizable and specific English term:
   - "giấy tờ tuỳ thân" → "ID card" (NOT "personal document")
   - "xe máy" → "motorcycle" (NOT "motorbike vehicle")
   - "bằng lái xe" → "driver license card"
   - "hoa sen" → "lotus flower"
5. Keep output under 15 words, use simple concrete nouns and adjectives
6. Include visual attributes when mentioned: color, count, action, setting, size
7. If input is already in English, clean and simplify it
8. Do NOT append "photo", "picture", "image", or "portrait" — describe only the subject`;

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
        keep_alive: -1,
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
