import multer from 'multer';
import type { Request } from 'express';

import crypto from 'crypto';
import path from 'path';
import fs from 'fs';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 5;

const STORAGE_DIR = process.env.STORAGE_DIR || './storage';
const INDEX_DIR = path.join(STORAGE_DIR, 'images', 'index');

if (!fs.existsSync(INDEX_DIR)) {
  fs.mkdirSync(INDEX_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, INDEX_DIR);
  },
  filename: (_req, file, cb) => {
    const id = crypto.randomUUID();
    const ext = file.mimetype.split('/')[1];
    cb(null, `${id}.${ext}`);
  }
});

function fileFilter(_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File "${file.originalname}" không hợp lệ. Chỉ chấp nhận: jpg, png, webp`));
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILES,
  },
});

// Upload 1 ảnh
export const uploadSingle = upload.single('image');

// Upload nhiều ảnh
export const uploadMultiple = upload.array('images', MAX_FILES);
