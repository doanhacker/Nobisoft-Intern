import type { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { pipeline } from 'stream/promises';
import sharp from 'sharp';
import {
  MAX_IMAGE_PIXELS,
  MAX_RESIZE_DIMENSION,
  MIN_RESIZE_DIMENSION,
} from '../../../config/image.js';

const STORAGE_DIR = process.env.STORAGE_DIR || './storage';
const ALLOWED_SUBFOLDERS = ['index', 'search'];

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
};

function parseResizeDimension(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return undefined;
  const num = Number(value);
  if (
    !Number.isInteger(num) ||
    num < MIN_RESIZE_DIMENSION ||
    num > MAX_RESIZE_DIMENSION
  ) return undefined;
  return num;
}

// GET /images/:subfolder/:filename

export async function serveImage(req: Request, res: Response) {
  try {
    const subfolder = req.params.subfolder as string;
    const filename = req.params.filename as string;

    if (!subfolder || !ALLOWED_SUBFOLDERS.includes(subfolder)) {
      res.status(400).json({ success: false, message: 'Subfolder không hợp lệ' });
      return;
    }

    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      res.status(400).json({ success: false, message: 'Tên file không hợp lệ' });
      return;
    }

    const filePath = path.resolve(STORAGE_DIR, 'images', subfolder, filename);

    const resolvedStorageDir = path.resolve(STORAGE_DIR, 'images');
    if (!filePath.startsWith(resolvedStorageDir)) {
      res.status(400).json({ success: false, message: 'Đường dẫn không hợp lệ' });
      return;
    }

    if (!fs.existsSync(filePath)) {
      res.status(404).json({ success: false, message: 'Ảnh không tồn tại' });
      return;
    }

    // Xác định Content-Type
    const ext = path.extname(filename).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // Parse resize params
    const width = parseResizeDimension(req.query.w);
    const height = parseResizeDimension(req.query.h);
    const hasInvalidWidth = req.query.w !== undefined && width === undefined;
    const hasInvalidHeight = req.query.h !== undefined && height === undefined;

    if (hasInvalidWidth || hasInvalidHeight) {
      res.status(400).json({
        success: false,
        message: `Kích thước resize phải là số nguyên từ ${MIN_RESIZE_DIMENSION} đến ${MAX_RESIZE_DIMENSION}`,
      });
      return;
    }

    // Set cache headers
    res.setHeader('Cache-Control', 'public, max-age=3600');

    if (width || height) {
      const resizedImage = sharp(filePath, { limitInputPixels: MAX_IMAGE_PIXELS })
        .autoOrient()
        .resize({
          width: width || undefined,
          height: height || undefined,
          fit: 'cover',
          withoutEnlargement: true,
        });

      res.setHeader('Content-Type', contentType);
      await pipeline(resizedImage, res);
    } else {
      // Trả ảnh gốc — stream trực tiếp, không load vào memory
      res.setHeader('Content-Type', contentType);
      const stream = fs.createReadStream(filePath);
      await pipeline(stream, res);
    }
  } catch (error) {
    console.error('Error serving image:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Lỗi xử lý ảnh' });
    } else {
      res.destroy();
    }
  }
}
