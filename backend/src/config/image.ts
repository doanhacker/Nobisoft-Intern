export const ALLOWED_UPLOAD_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
] as const;

export const ALLOWED_SEARCH_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const MAX_IMAGE_FILE_SIZE_BYTES = 10 * 1024 * 1024;
export const MAX_IMAGE_FILES_PER_UPLOAD = 100;
export const MAX_IMAGE_PIXELS = 40_000_000;
export const MIN_RESIZE_DIMENSION = 16;
export const MAX_RESIZE_DIMENSION = 4_096;
