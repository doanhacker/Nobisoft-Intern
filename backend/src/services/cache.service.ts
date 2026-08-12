import { createHash } from 'crypto';
import { redis } from '../config/redis.js';

const TRANSLATION_PREFIX = 'ollama:translate:';
const EMBEDDING_PREFIX = 'ai:embed-text:';
const CACHE_TTL_SECONDS = 86400; // 24 hours

function hashKey(input: string): string {
  return createHash('sha256').update(input.toLowerCase().trim()).digest('hex');
}

// Ollama translation cache

export async function getCachedTranslation(input: string): Promise<string | null> {
  try {
    const key = TRANSLATION_PREFIX + hashKey(input);
    const cached = await redis.get(key);
    if (cached) {
      console.log('[Cache] HIT translation:', JSON.stringify(input));
    }
    return cached;
  } catch {
    return null;
  }
}

export async function setCachedTranslation(input: string, result: string): Promise<void> {
  try {
    const key = TRANSLATION_PREFIX + hashKey(input);
    await redis.set(key, result, 'EX', CACHE_TTL_SECONDS);
  } catch {
    // Cache write failure is non-critical
  }
}

// AI text embedding cache

export async function getCachedEmbedding(text: string): Promise<number[] | null> {
  try {
    const key = EMBEDDING_PREFIX + hashKey(text);
    const cached = await redis.get(key);
    if (cached) {
      console.log('[Cache] HIT embedding:', JSON.stringify(text));
      return JSON.parse(cached) as number[];
    }
    return null;
  } catch {
    return null;
  }
}

export async function setCachedEmbedding(text: string, embedding: number[]): Promise<void> {
  try {
    const key = EMBEDDING_PREFIX + hashKey(text);
    await redis.set(key, JSON.stringify(embedding), 'EX', CACHE_TTL_SECONDS);
  } catch {
    // Cache write failure is non-critical
  }
}
