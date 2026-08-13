import type { AiEmbedTextResponse } from '../types/ai.type.js';
import { getCachedTranslation, setCachedTranslation } from './cache.service.js';

const OLLAMA_URL = process.env.OLLAMA_URL;
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'gemma2:2b';
const OLLAMA_TIMEOUT_MS = 30_000;

if (!OLLAMA_URL) {
  throw new Error('OLLAMA_URL is required');
}

const TRANSLATE_SYSTEM_PROMPT = `You are an image search query translator for a CLIP-based visual search engine.

Task: Convert user input (any language) into a short, accurate English noun phrase that a visual AI model can understand.

Rules:
1. Output ONLY the bare noun phrase of the visual subject and its attributes (e.g., "red car", "running dog on beach"). Output must be a noun phrase, never a full sentence.
2. Remove filler words and meta-instructions ("tôi muốn tìm", "hãy tìm cho tôi", "I want to find")
3. Auto-correct obvious typos before translating:
   - "con chos" → "con chó" → "dog"
   - "xw máy" → "xe máy" → "motorcycle"
4. Resolve abstract/cultural concepts into their concrete visual form:
   - "quốc hoa Việt Nam" → "lotus flower" (Vietnam's national flower)
   - "quốc hoa Nhật Bản" → "cherry blossom" (Japan's national flower)
   - "quốc phục Việt Nam" → "ao dai dress" (Vietnam's national costume)
   - "quốc phục Nhật Bản" → "kimono" (Japan's national costume)
   - "thủ đô Pháp" → "Paris city"
   - "kỳ quan thế giới" → "world wonder landmark"
5. Keep proper nouns EXACTLY as given — preserve person names as-is:
   - "Ronaldo de Lima" → "Ronaldo de Lima"
   - "Son Tung MTP" → "Son Tung MTP"
6. For well-known person names, prepend their role or identity to help visual recognition:
   - "Haaland" → "soccer player Haaland"
   - "Messi" → "soccer player Messi"
   - "Elon Musk" → "businessman Elon Musk"
   - "Son Tung MTP" → "singer Son Tung MTP"
   - "Trump" → "politician Donald Trump"
   If the name is not well-known, keep it as-is.
7. Use the most visually specific English term:
   - "giấy tờ tuỳ thân" → "ID card"
   - "bằng lái xe" → "driver license card"
   - "xe máy" → "motorcycle"
   - "hoa sen" → "lotus flower"
8. Keep output under 15 words, use simple concrete nouns and adjectives
9. Include visual attributes when mentioned: color, count, action, setting, size
10. If input is already in English, clean and simplify it

Examples:
Input: "tôi muốn tìm hình ảnh con chó"
Output: dog

Input: "cho tôi xem ảnh phong cảnh hoàng hôn"
Output: sunset landscape

Input: "red sports car on highway"
Output: red sports car on highway

Input: "Haaland"
Output: soccer player Haaland`;


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
 * Hậu xử lý output từ LLM: xóa các từ thừa mà model nhỏ hay sinh ra.
 * Chạy regex rất nhanh, đảm bảo query luôn sạch 100% cho CLIP.
 */
function sanitizeTranslatedQuery(raw: string): string {
  let query = raw
    .replace(/^["'`]+|["'`]+$/g, '')                                      // Xóa quotes bao quanh
    .replace(/\b(a|an|the|photo|picture|image|portrait|photograph)\b/gi, '') // Xóa articles & từ thừa
    .replace(/\bof\b/gi, '')                                               // Xóa "of" thừa
    .replace(/\s+/g, ' ')                                                  // Gộp khoảng trắng
    .trim();

  // Nếu regex xóa hết → trả về raw đã trim
  return query || raw.trim();
}

/**
 * Gọi Ollama API để chuyển đổi prompt tiếng Việt/bất kỳ ngôn ngữ nào
 * thành mô tả tiếng Anh ngắn gọn, tối ưu cho CLIP-based search.
 */
export async function translatePrompt(userInput: string): Promise<string> {
  // Check cache first
  const cached = await getCachedTranslation(userInput);
  if (cached) {
    return cached;
  }

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
    const rawResponse = json.response?.trim();

    if (!rawResponse) {
      throw new OllamaServiceError('Ollama returned empty response');
    }

    const sanitized = sanitizeTranslatedQuery(rawResponse);

    console.log('[Ollama] Input:', JSON.stringify(userInput));
    console.log('[Ollama] Raw response:', JSON.stringify(rawResponse));
    console.log('[Ollama] Sanitized:', JSON.stringify(sanitized));

    // Save to cache
    await setCachedTranslation(userInput, sanitized);

    return sanitized;
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
