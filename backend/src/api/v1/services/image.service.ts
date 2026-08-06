import { prisma } from '../../../config/prisma.js';
import { IMAGE_OPERATION_BATCH_SIZE } from '../../../config/image-operation.js';
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

interface UpdateImageDeletionStateResult {
  changed: number;
  failedIds: string[];
}

function createImageIdBatches(imageIds: string[]): string[][] {
  const batches: string[][] = [];
  for (let index = 0; index < imageIds.length; index += IMAGE_OPERATION_BATCH_SIZE) {
    batches.push(imageIds.slice(index, index + IMAGE_OPERATION_BATCH_SIZE));
  }
  return batches;
}

async function updateImageDeletionState(
  imageIds: string[],
  deleted: boolean,
): Promise<UpdateImageDeletionStateResult> {
  let changed = 0;
  const failedIds: string[] = [];

  for (const batch of createImageIdBatches(imageIds)) {
    let matchingIds: string[] = [];
    let qdrantUpdated = false;

    try {
      const matchingImages = await prisma.image.findMany({
        where: {
          id: { in: batch },
          deletedAt: deleted ? null : { not: null },
        },
        select: { id: true },
      });
      matchingIds = matchingImages.map((image) => image.id);

      if (matchingIds.length === 0) continue;

      await setImageVectorsDeleted(matchingIds, deleted);
      qdrantUpdated = true;

      const result = await prisma.image.updateMany({
        where: {
          id: { in: matchingIds },
          deletedAt: deleted ? null : { not: null },
        },
        data: { deletedAt: deleted ? new Date() : null },
      });
      changed += result.count;
    } catch (error) {
      const affectedIds = matchingIds.length > 0 ? matchingIds : batch;
      failedIds.push(...affectedIds);
      console.error(`Failed to ${deleted ? 'soft-delete' : 'restore'} image batch:`, error);

      if (qdrantUpdated) {
        await setImageVectorsDeleted(matchingIds, !deleted).catch((rollbackError) => {
          console.error('Failed to rollback Qdrant image batch payload:', rollbackError);
        });
      }
    }
  }

  return { changed, failedIds };
}

export async function softDeleteImages(imageIds: string[]) {
  const result = await updateImageDeletionState(imageIds, true);
  return {
    requested: imageIds.length,
    deleted: result.changed,
    failedIds: result.failedIds,
  };
}

export async function restoreImages(imageIds: string[]) {
  const result = await updateImageDeletionState(imageIds, false);
  return {
    requested: imageIds.length,
    restored: result.changed,
    failedIds: result.failedIds,
  };
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
