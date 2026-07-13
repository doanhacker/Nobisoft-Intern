import type { AiEmbedImageResponse, AiProcessImageResponse } from '../types/ai.type.js';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL;
const AI_TIMEOUT_MS = 30_000;

if (!AI_SERVICE_URL) {
  throw new Error('AI_SERVICE_URL is required');
}

// POST /api/process-image 
export async function processImage(imageBuffer: Buffer, filename: string, mimetype: string): Promise<AiProcessImageResponse> {
  const formData = new FormData();
  formData.append('image', new Blob([new Uint8Array(imageBuffer)], { type: mimetype }), filename);

  const response = await fetchWithTimeout(`${AI_SERVICE_URL}/api/process-image`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`AI process-image failed: ${response.status} ${response.statusText}`);
  }

  const json = await response.json();
  if (json.success && json.data) {
    json.data.processDurationMs = json.processing_time_ms;
  }
  return json as AiProcessImageResponse;
}

// POST /api/embed-image
export async function embedImage(
  imageBuffer: Buffer,
  filename: string,
  mimetype: string,
): Promise<AiEmbedImageResponse> {
  const formData = new FormData();
  formData.append('image', new Blob([new Uint8Array(imageBuffer)], { type: mimetype }), filename);

  const response = await fetchWithTimeout(`${AI_SERVICE_URL}/api/embed-image`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`AI embed-image failed: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<AiEmbedImageResponse>;
}

// Fetch with timeout
async function fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(`AI service timeout (${AI_TIMEOUT_MS}ms): ${url}`);
    }
    throw new Error(`AI service unreachable: ${url}`);
  } finally {
    clearTimeout(timeoutId);
  }
}
