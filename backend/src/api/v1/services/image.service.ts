import { prisma } from '../../../config/prisma.js';
import { deleteImageVector } from '../../../services/qdrant.service.js';
import { deleteImageFromDisk } from '../../../utils/storage.util.js';
import type { ImageListQuery } from '../validators/admin/image.validate.js';

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

  return { images, total };
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

  return image;
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
