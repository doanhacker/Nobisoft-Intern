import { prisma } from '../../../config/prisma.js';
import {
  getTrashRetentionDays,
  IMAGE_OPERATION_BATCH_SIZE,
  PERMANENT_DELETE_CONCURRENCY,
} from '../../../config/image-operation.js';
import {
  deleteImageVector,
  setImageVectorsDeleted,
} from '../../../services/qdrant.service.js';
import { endOfHoChiMinhDay, startOfHoChiMinhDay } from '../../../utils/date.util.js';
import { resolveImageUrl } from '../../../utils/image-url.util.js';
import { deleteImageFromDisk } from '../../../utils/storage.util.js';
import type {
  ImageListQuery,
  TrashImageListQuery,
} from '../validators/admin/image.validate.js';
import type { MyImageListQuery } from '../validators/client/my-image.validate.js';

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

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
  const retentionDays = getTrashRetentionDays();
  const now = Date.now();
  const activeTrashCutoff = new Date(now - retentionDays * MILLISECONDS_PER_DAY);
  const where: Record<string, unknown> = {
    deletedAt: { gt: activeTrashCutoff },
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
    images: images.map((image) => {
      const deletedAt = image.deletedAt!;
      const permanentDeleteAt = new Date(
        deletedAt.getTime() + retentionDays * MILLISECONDS_PER_DAY,
      );
      const remainingDays = Math.max(
        1,
        Math.ceil((permanentDeleteAt.getTime() - now) / MILLISECONDS_PER_DAY),
      );

      return {
        ...withImageUrl(image),
        deletedAt,
        permanentDeleteAt,
        remainingDays,
      };
    }),
    total,
  };
}

interface UpdateImageDeletionStateResult {
  changed: number;
  failedIds: string[];
}

function createBatches<T>(items: T[], batchSize: number): T[][] {
  const batches: T[][] = [];
  for (let index = 0; index < items.length; index += batchSize) {
    batches.push(items.slice(index, index + batchSize));
  }
  return batches;
}

async function updateImageDeletionState(
  imageIds: string[],
  deleted: boolean,
): Promise<UpdateImageDeletionStateResult> {
  let changed = 0;
  const failedIds: string[] = [];

  for (const batch of createBatches(imageIds, IMAGE_OPERATION_BATCH_SIZE)) {
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

interface PermanentDeleteCandidate {
  id: string;
  path: string;
}

async function permanentlyDeleteImage(image: PermanentDeleteCandidate): Promise<string> {
  await deleteImageFromDisk(image.path);
  await deleteImageVector(image.id);

  const result = await prisma.image.deleteMany({
    where: {
      id: image.id,
      deletedAt: { not: null },
    },
  });

  if (result.count === 0) {
    throw new Error(`Image ${image.id} is no longer in trash`);
  }

  return image.id;
}

export async function permanentlyDeleteImages(imageIds: string[]) {
  const images = await prisma.image.findMany({
    where: {
      id: { in: imageIds },
      deletedAt: { not: null },
    },
    select: {
      id: true,
      path: true,
    },
  });

  const candidateIds = new Set(images.map((image) => image.id));
  const skippedIds = imageIds.filter((imageId) => !candidateIds.has(imageId));
  const deletedIds: string[] = [];
  const failedIds: string[] = [];

  for (const batch of createBatches(images, PERMANENT_DELETE_CONCURRENCY)) {
    const results = await Promise.allSettled(batch.map(permanentlyDeleteImage));

    results.forEach((result, index) => {
      const image = batch[index];
      if (!image) return;

      if (result.status === 'fulfilled') {
        deletedIds.push(result.value);
      } else {
        failedIds.push(image.id);
        console.error(`Failed to permanently delete image ${image.id}:`, result.reason);
      }
    });
  }

  return {
    requested: imageIds.length,
    deleted: deletedIds.length,
    deletedIds,
    failedIds,
    skippedIds,
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
