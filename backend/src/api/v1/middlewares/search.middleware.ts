import multer from 'multer';
import type { Request } from 'express';
import {
  ALLOWED_SEARCH_IMAGE_MIME_TYPES,
  MAX_IMAGE_FILE_SIZE_BYTES,
} from '../../../config/image.js';

function fileFilter(_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  if ((ALLOWED_SEARCH_IMAGE_MIME_TYPES as readonly string[]).includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File "${file.originalname}" không hợp lệ. Chỉ chấp nhận: jpg, png, webp`));
  }
}

const searchUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    fileSize: MAX_IMAGE_FILE_SIZE_BYTES,
  },
});

export const uploadSearchImageMemory = searchUpload.single('image');
