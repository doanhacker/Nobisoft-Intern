import { prisma } from '../../../config/prisma.js';
import { deleteImageVector } from '../../../services/qdrant.service.js';
import { deleteImageFromDisk } from '../../../utils/storage.util.js';
import type { ImageListQuery } from '../validators/client/image.validate.js';
import type { MyImageListQuery } from '../validators/client/my-image.validate.js';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

function resolveImageUrl(imagePath: string): string {
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  // "storage/images/index/xxx.jpg" → "http://localhost:8000/storage/images/index/xxx.jpg"
  const cleanPath = imagePath.replace(/\\/g, '/').replace(/^\//, '');
  return `${BACKEND_URL}/${cleanPath}`;
}

function withImageUrl<T extends { path: string }>(image: T): Omit<T, 'path'> & { imageUrl: string } {
  const { path, ...rest } = image;
  return { ...rest, imageUrl: resolveImageUrl(path) };
}

export async function getIndexedImages(query: ImageListQuery) {
  const { page, limit, fileFormat, fromDate, toDate } = query;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {
    imageIndex: { isNot: null },
  };

  if (fileFormat) {
    where.fileFormat = fileFormat;
  }

  if (fromDate || toDate) {
    const dateFilter: Record<string, Date> = {};
    if (fromDate) dateFilter.gte = fromDate;
    if (toDate) dateFilter.lte = toDate;
    where.createdAt = dateFilter;
  }

  const [images, total] = await Promise.all([
    prisma.image.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        imageIndex: {
          include: {
            ocrLines: {
              take: 3,
              select: {
                rawText: true,
                confidenceScore: true,
              },
            },
          },
        },
      },
    }),
    prisma.image.count({ where }),
  ]);

  return { images: images.map(withImageUrl), total };
}

export async function getImageDetail(id: string) {
  const image = await prisma.image.findUnique({
    where: { id },
    include: {
      imageIndex: {
        include: {
          ocrLines: true,
        },
      },
    },
  });

  return image ? withImageUrl(image) : null;
}

export async function deleteImage(id: string) {
  const image = await prisma.image.findUnique({
    where: { id },
    select: { id: true, path: true },
  });

  if (!image) {
    return null;
  }

  // 1. Xoá khỏi PostgreSQL
  await prisma.image.delete({ where: { id } });

  // 2. Xoá vector khỏi Qdrant
  try {
    await deleteImageVector(id);
  } catch {
    console.warn(`Qdrant delete failed for image ${id}, may not exist`);
  }

  // 3. Xoá file khỏi disk
  await deleteImageFromDisk(image.path);

  return image;
}

// ─── User's own images ───

export async function getUserImages(userId: string, query: MyImageListQuery) {
  const { page, limit, fileFormat, fromDate, toDate } = query;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {
    imageIndex: {
      is: {
        batch: { uploadedBy: userId },
      },
    },
  };

  if (fileFormat) {
    where.fileFormat = fileFormat;
  }

  if (fromDate || toDate) {
    const dateFilter: Record<string, Date> = {};
    if (fromDate) dateFilter.gte = fromDate;
    if (toDate) dateFilter.lte = toDate;
    where.createdAt = dateFilter;
  }

  const [images, total] = await Promise.all([
    prisma.image.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        path: true,
        width: true,
        height: true,
        fileSize: true,
        fileFormat: true,
        createdAt: true,
      },
    }),
    prisma.image.count({ where }),
  ]);

  return { images: images.map(withImageUrl), total };
}

export async function deleteUserImage(userId: string, imageId: string) {
  // Kiểm tra ảnh có thuộc về user không (qua batch)
  const image = await prisma.image.findUnique({
    where: { id: imageId },
    include: {
      imageIndex: {
        include: {
          batch: {
            select: { uploadedBy: true },
          },
        },
      },
    },
  });

  if (!image) {
    return { found: false as const };
  }

  if (image.imageIndex?.batch?.uploadedBy !== userId) {
    return { found: true as const, owned: false as const };
  }

  // Xoá ảnh (reuse logic từ deleteImage)
  await prisma.image.delete({ where: { id: imageId } });

  try {
    await deleteImageVector(imageId);
  } catch {
    console.warn(`Qdrant delete failed for image ${imageId}, may not exist`);
  }

  await deleteImageFromDisk(image.path);

  return { found: true as const, owned: true as const };
}
