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
) {
  const expectedFormats = EXPECTED_FORMATS_BY_MIME_TYPE[declaredMimeType];
  if (!expectedFormats) {
    throw new InvalidImageContentError('Định dạng ảnh không được hỗ trợ');
  }

  try {
    const metadata = await sharp(input, {
      failOn: 'error',
      limitInputPixels: MAX_IMAGE_PIXELS,
    }).metadata();

    if (!metadata.format || !expectedFormats.includes(metadata.format)) {
      throw new InvalidImageContentError('Nội dung file không khớp với định dạng ảnh');
    }

    if (!metadata.width || !metadata.height) {
      throw new InvalidImageContentError('Không đọc được kích thước ảnh');
    }

    if (metadata.width * metadata.height > MAX_IMAGE_PIXELS) {
      throw new InvalidImageContentError('Ảnh vượt quá giới hạn 40 triệu pixel');
    }
  } catch (error) {
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
