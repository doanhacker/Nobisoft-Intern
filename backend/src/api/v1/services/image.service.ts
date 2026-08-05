import { prisma } from '../../../config/prisma.js';
import { setImageVectorsDeleted } from '../../../services/qdrant.service.js';
import { endOfHoChiMinhDay, startOfHoChiMinhDay } from '../../../utils/date.util.js';
import { resolveImageUrl } from '../../../utils/image-url.util.js';
import type {
  ImageListQuery,
  TrashImageListQuery,
} from '../validators/admin/image.validate.js';
import type { MyImageListQuery } from '../validators/client/my-image.validate.js';

function withImageUrl<T extends { path: string }>(image: T): Omit<T, 'path'> & { imageUrl: string } {
  const { path, ...rest } = image;
  return { ...rest, imageUrl: resolveImageUrl(path) };
}

function applyImageListFilters(
  where: Record<string, unknown>,
  query: ImageListQuery | MyImageListQuery,
  dateField: 'createdAt' | 'deletedAt',
) {
  if (query.fileFormat) {
    where.fileFormat = query.fileFormat;
  }

  if (query.fromDate || query.toDate) {
    const dateFilter: Record<string, Date> = {};
    if (query.fromDate) dateFilter.gte = startOfHoChiMinhDay(query.fromDate);
    if (query.toDate) dateFilter.lte = endOfHoChiMinhDay(query.toDate);
    where[dateField] = dateFilter;
  }
}

export async function getIndexedImages(query: ImageListQuery) {
  const { page, limit } = query;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {
    deletedAt: null,
    imageIndex: {
      is: {
        status: 'SUCCESS',
      },
    },
  };

  applyImageListFilters(where, query, 'createdAt');

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
  const image = await prisma.image.findFirst({
    where: { id, deletedAt: null },
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

export async function getDeletedImages(query: TrashImageListQuery) {
  const { page, limit } = query;
  const skip = (page - 1) * limit;
  const where: Record<string, unknown> = {
    deletedAt: { not: null },
    imageIndex: {
      is: {
        status: 'SUCCESS',
      },
    },
  };

  const [images, total] = await Promise.all([
    prisma.image.findMany({
      where,
      skip,
      take: limit,
      orderBy: { deletedAt: 'desc' },
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

  return {
    images: images.map((image) => ({
      ...withImageUrl(image),
      deletedAt: image.deletedAt!,
    })),
    total,
  };
}

export async function softDeleteImages(imageIds: string[]) {
  const requested = imageIds.length;
  const activeImages = await prisma.image.findMany({
    where: {
      id: { in: imageIds },
      deletedAt: null,
    },
    select: { id: true },
  });
  const activeImageIds = activeImages.map((image) => image.id);

  if (activeImageIds.length === 0) {
    return { requested, deleted: 0 };
  }

  await setImageVectorsDeleted(activeImageIds, true);

  try {
    const result = await prisma.image.updateMany({
      where: {
        id: { in: activeImageIds },
        deletedAt: null,
      },
      data: { deletedAt: new Date() },
    });

    return { requested, deleted: result.count };
  } catch (error) {
    await setImageVectorsDeleted(activeImageIds, false).catch((rollbackError) => {
      console.error('Failed to rollback Qdrant soft-delete payload:', rollbackError);
    });
    throw error;
  }
}

export async function restoreImages(imageIds: string[]) {
  const requested = imageIds.length;
  const deletedImages = await prisma.image.findMany({
    where: {
      id: { in: imageIds },
      deletedAt: { not: null },
    },
    select: { id: true },
  });
  const deletedImageIds = deletedImages.map((image) => image.id);

  if (deletedImageIds.length === 0) {
    return { requested, restored: 0 };
  }

  await setImageVectorsDeleted(deletedImageIds, false);

  try {
    const result = await prisma.image.updateMany({
      where: {
        id: { in: deletedImageIds },
        deletedAt: { not: null },
      },
      data: { deletedAt: null },
    });

    return { requested, restored: result.count };
  } catch (error) {
    await setImageVectorsDeleted(deletedImageIds, true).catch((rollbackError) => {
      console.error('Failed to rollback Qdrant restore payload:', rollbackError);
    });
    throw error;
  }
}

// ─── User's own images ───

export async function getUserImages(userId: string, query: MyImageListQuery) {
  const { page, limit } = query;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {
    deletedAt: null,
    imageIndex: {
      is: {
        status: 'SUCCESS',
        batch: { uploadedBy: userId },
      },
    },
  };

  applyImageListFilters(where, query, 'createdAt');

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
  const image = await prisma.image.findFirst({
    where: { id: imageId, deletedAt: null },
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

  await softDeleteImages([image.id]);

  return { found: true as const, owned: true as const };
}
