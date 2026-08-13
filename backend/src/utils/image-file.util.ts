import sharp from 'sharp';
import { MAX_IMAGE_PIXELS } from '../config/image.js';

const EXPECTED_FORMATS_BY_MIME_TYPE: Record<string, string[]> = {
  'image/jpeg': ['jpeg'],
  'image/png': ['png'],
  'image/webp': ['webp'],
  'image/avif': ['avif', 'heif'],
};

export class InvalidImageContentError extends Error { }

export async function validateImageContent(
  input: Buffer | string,
  declaredMimeType: string,
  originalName?: string,
) {
  const expectedFormats = EXPECTED_FORMATS_BY_MIME_TYPE[declaredMimeType];
  if (!expectedFormats) {
    console.error('[validateImageContent] Unsupported MIME type:', {
      originalName,
      declaredMimeType,
      inputType: typeof input === 'string' ? 'path' : 'buffer',
      ...(typeof input === 'string' ? { filePath: input } : { bufferSize: input.length }),
    });
    throw new InvalidImageContentError('Định dạng ảnh không được hỗ trợ');
  }

  try {
    const metadata = await sharp(input, {
      failOn: 'error',
      limitInputPixels: MAX_IMAGE_PIXELS,
    }).metadata();

    if (!metadata.format || !expectedFormats.includes(metadata.format)) {
      console.error('[validateImageContent] Format mismatch:', {
        originalName,
        declaredMimeType,
        actualFormat: metadata.format,
        expectedFormats,
      });
      throw new InvalidImageContentError('Nội dung file không khớp với định dạng ảnh');
    }

    if (!metadata.width || !metadata.height) {
      throw new InvalidImageContentError('Không đọc được kích thước ảnh');
    }

    if (metadata.width * metadata.height > MAX_IMAGE_PIXELS) {
      throw new InvalidImageContentError('Ảnh vượt quá giới hạn 40 triệu pixel');
    }
  } catch (error) {
    console.error('[validateImageContent] Error processing image:', {
      originalName,
      declaredMimeType,
      inputType: typeof input === 'string' ? 'path' : 'buffer',
      ...(typeof input === 'string' ? { filePath: input } : { bufferSize: input.length }),
      error: error instanceof Error ? error.message : error,
    });

    if (error instanceof InvalidImageContentError) {
      throw error;
    }

    throw new InvalidImageContentError(
      error instanceof Error && error.message.includes('pixel limit')
        ? 'Ảnh vượt quá giới hạn 40 triệu pixel'
        : 'Nội dung file không phải ảnh hợp lệ',
    );
  }
}
