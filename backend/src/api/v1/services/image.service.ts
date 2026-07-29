import { prisma } from '../../../config/prisma.js';
import { deleteImageVector } from '../../../services/qdrant.service.js';
import { deleteImageFromDisk } from '../../../utils/storage.util.js';
import { endOfHoChiMinhDay, startOfHoChiMinhDay } from '../../../utils/date.util.js';
import type { ImageListQuery } from '../validators/admin/image.validate.js';
import type { MyImageListQuery } from '../validators/client/my-image.validate.js';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';
const IMAGE_CLEANUP_MAX_ATTEMPTS = 3;
const IMAGE_CLEANUP_RETRY_DELAY_MS = 200;

interface ImageResource {
  id: string;
  path: string;
}

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function cleanupWithRetry(
  resourceName: string,
  imageId: string,
  operation: () => Promise<void>,
): Promise<boolean> {
  for (let attempt = 1; attempt <= IMAGE_CLEANUP_MAX_ATTEMPTS; attempt += 1) {
    try {
      await operation();
      return true;
    } catch (error) {
      console.error(
        `Failed to delete ${resourceName} for image ${imageId} `
        + `(attempt ${attempt}/${IMAGE_CLEANUP_MAX_ATTEMPTS}):`,
        error,
      );

      if (attempt < IMAGE_CLEANUP_MAX_ATTEMPTS) {
        await wait(IMAGE_CLEANUP_RETRY_DELAY_MS * attempt);
      }
    }
  }

  return false;
}

async function cleanupImageResources(image: ImageResource): Promise<void> {
  const [qdrantDeleted, fileDeleted] = await Promise.all([
    cleanupWithRetry('Qdrant vector', image.id, () => deleteImageVector(image.id)),
    cleanupWithRetry('stored file', image.id, () => deleteImageFromDisk(image.path)),
  ]);

  if (!qdrantDeleted || !fileDeleted) {
    console.error(
      `Image ${image.id} was deleted from PostgreSQL but external resource cleanup is incomplete`,
    );
  }
}

async function deleteImageRecordAndResources(image: ImageResource): Promise<void> {
  await prisma.image.delete({ where: { id: image.id } });
  await cleanupImageResources(image);
}

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
    imageIndex: {
      is: {
        status: 'SUCCESS',
      },
    },
  };

  if (fileFormat) {
    where.fileFormat = fileFormat;
  }

  if (fromDate || toDate) {
    const dateFilter: Record<string, Date> = {};
    if (fromDate) dateFilter.gte = startOfHoChiMinhDay(fromDate);
    if (toDate) dateFilter.lte = endOfHoChiMinhDay(toDate);
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

  await deleteImageRecordAndResources(image);

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
    if (fromDate) dateFilter.gte = startOfHoChiMinhDay(fromDate);
    if (toDate) dateFilter.lte = endOfHoChiMinhDay(toDate);
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

  await deleteImageRecordAndResources(image);

  return { found: true as const, owned: true as const };
}
