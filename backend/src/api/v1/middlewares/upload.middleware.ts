import multer from 'multer';
import type { NextFunction, Request, Response } from 'express';

import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import fsPromises from 'fs/promises';
import {
  ALLOWED_UPLOAD_MIME_TYPES,
  MAX_IMAGE_FILES_PER_UPLOAD,
  MAX_IMAGE_FILE_SIZE_BYTES,
} from '../../../config/image.js';
import type { ApiResponse } from '../../../types/apiResponse.js';
import { InvalidImageContentError, validateImageContent } from '../../../utils/image-file.util.js';

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
  if ((ALLOWED_UPLOAD_MIME_TYPES as readonly string[]).includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File "${file.originalname}" không hợp lệ. Chỉ chấp nhận: jpg, png, webp, avif`));
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_IMAGE_FILE_SIZE_BYTES,
    files: MAX_IMAGE_FILES_PER_UPLOAD,
  },
});

const uploadSingleHandler = upload.single('image');
const uploadMultipleHandler = upload.array('images', MAX_IMAGE_FILES_PER_UPLOAD);

function getUploadedFiles(req: Request) {
  if (req.file) return [req.file];
  return Array.isArray(req.files) ? req.files : [];
}

async function removeUploadedFiles(req: Request) {
  await Promise.all(
    getUploadedFiles(req).map((file) => fsPromises.unlink(file.path).catch(() => undefined)),
  );
}

function getUploadErrorMessage(error: unknown) {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return 'Mỗi ảnh không được vượt quá 10MB';
    }

    if (error.code === 'LIMIT_FILE_COUNT') {
      return `Mỗi lần chỉ được upload tối đa ${MAX_IMAGE_FILES_PER_UPLOAD} ảnh`;
    }

    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return 'Trường file upload không hợp lệ';
    }
  }

  return error instanceof Error ? error.message : 'Upload ảnh thất bại';
}

function createSecureUploadMiddleware(
  uploadHandler: ReturnType<typeof upload.single> | ReturnType<typeof upload.array>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    uploadHandler(req, res, (uploadError: unknown) => {
      void (async () => {
        try {
          if (uploadError) throw uploadError;

          for (const file of getUploadedFiles(req)) {
            await validateImageContent(file.path, file.mimetype);
          }

          next();
        } catch (error) {
          await removeUploadedFiles(req);
          const response: ApiResponse = {
            success: false,
            message: error instanceof InvalidImageContentError
              ? error.message
              : getUploadErrorMessage(error),
          };
          res.status(400).json(response);
        }
      })();
    });
  };
}

export const uploadSingle = createSecureUploadMiddleware(uploadSingleHandler);
export const uploadMultiple = createSecureUploadMiddleware(uploadMultipleHandler);
