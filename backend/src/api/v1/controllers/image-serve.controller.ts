import type { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';

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

// Giới hạn resize để tránh abuse
const MAX_DIMENSION = 4096;
const MIN_DIMENSION = 16;

function parseResizeDimension(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const num = Number(value);
  if (!Number.isInteger(num) || num < MIN_DIMENSION || num > MAX_DIMENSION) return undefined;
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

    // Set cache headers
    res.setHeader('Cache-Control', 'public, max-age=86400');

    if (width || height) {
      const resizedBuffer = await sharp(filePath)
        .resize({
          width: width || undefined,
          height: height || undefined,
          fit: 'cover',
          withoutEnlargement: true,
        })
        .toBuffer();

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Length', resizedBuffer.length);
      res.send(resizedBuffer);
    } else {
      // Trả ảnh gốc — stream trực tiếp, không load vào memory
      res.setHeader('Content-Type', contentType);
      const stream = fs.createReadStream(filePath);
      stream.pipe(res);
    }
  } catch (error) {
    console.error('Error serving image:', error);
    res.status(500).json({ success: false, message: 'Lỗi xử lý ảnh' });
  }
}
