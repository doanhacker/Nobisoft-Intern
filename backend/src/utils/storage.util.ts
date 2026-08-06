import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { imageSize } from 'image-size';

const STORAGE_DIR = process.env.STORAGE_DIR || './storage';

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

function getExtension(mimetype: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  };
  return map[mimetype] || 'jpg';
}

export interface SavedFile {
  id: string;
  path: string;
  absolutePath: string;
  width: number;
  height: number;
  fileSize: number;
  fileFormat: string;
}

export async function saveImageToDisk(
  buffer: Buffer,
  mimetype: string,
  subfolder: 'index' | 'search',
): Promise<SavedFile> {
  const targetDir = path.join(STORAGE_DIR, 'images', subfolder);
  await ensureDir(targetDir);

  const id = crypto.randomUUID();
  const ext = getExtension(mimetype);
  const filename = `${id}.${ext}`;
  const absolutePath = path.resolve(targetDir, filename);
  const relativePath = `/images/${subfolder}/${filename}`;

  await fs.writeFile(absolutePath, buffer);

  const dimensions = imageSize(buffer);

  return {
    id,
    path: relativePath,
    absolutePath,
    width: dimensions.width || 0,
    height: dimensions.height || 0,
    fileSize: buffer.length,
    fileFormat: ext,
  };
}

export async function deleteImageFromDisk(relativePath: string): Promise<void> {
  const absolutePath = resolveStoredImagePath(relativePath);
  try {
    await fs.unlink(absolutePath);
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) {
      throw error;
    }
  }
}

export function readImageFromDisk(relativePath: string): Promise<Buffer> {
  return fs.readFile(resolveStoredImagePath(relativePath));
}

function resolveStoredImagePath(relativePath: string): string {
  const normalizedPath = relativePath.replace(/\\/g, '/');

  let pathInsideStorage: string;
  if (normalizedPath.startsWith('storage/')) {
    // Format cũ: "storage/images/index/xxx.jpg"
    pathInsideStorage = normalizedPath.slice('storage/'.length);
  } else if (normalizedPath.startsWith('/images/')) {
    // Format mới: "/images/index/xxx.jpg"
    pathInsideStorage = normalizedPath.slice(1); // → "images/index/xxx.jpg"
  } else if (path.isAbsolute(relativePath)) {
    return relativePath;
  } else {
    pathInsideStorage = normalizedPath;
  }

  return path.resolve(STORAGE_DIR, pathInsideStorage);
}
