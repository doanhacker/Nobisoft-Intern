import { permanentlyDeleteImages } from '../api/v1/services/image.service.js';
import {
  getTrashCleanupIntervalHours,
  getTrashRetentionDays,
  MAX_PERMANENT_DELETE_IMAGE_IDS,
  TRASH_CLEANUP_MAX_BATCHES,
} from '../config/image-operation.js';
import { prisma } from '../config/prisma.js';

const MILLISECONDS_PER_HOUR = 60 * 60 * 1000;
const MILLISECONDS_PER_DAY = 24 * MILLISECONDS_PER_HOUR;

function isTrashCleanupEnabled(): boolean {
  return process.env.TRASH_AUTO_CLEANUP_ENABLED?.toLowerCase() !== 'false';
}

export async function runTrashCleanup(): Promise<void> {
  const retentionDays = getTrashRetentionDays();
  const expiredBefore = new Date(Date.now() - retentionDays * MILLISECONDS_PER_DAY);
  let lastImageId: string | undefined;
  let totalDeleted = 0;
  let totalFailed = 0;

  for (let batchNumber = 0; batchNumber < TRASH_CLEANUP_MAX_BATCHES; batchNumber += 1) {
    const expiredImages = await prisma.image.findMany({
      where: {
        deletedAt: { lte: expiredBefore },
        ...(lastImageId ? { id: { gt: lastImageId } } : {}),
      },
      select: { id: true },
      orderBy: { id: 'asc' },
      take: MAX_PERMANENT_DELETE_IMAGE_IDS,
    });

    if (expiredImages.length === 0) break;

    lastImageId = expiredImages.at(-1)?.id;
    const result = await permanentlyDeleteImages(expiredImages.map((image) => image.id));
    totalDeleted += result.deleted;
    totalFailed += result.failedIds.length;

    if (expiredImages.length < MAX_PERMANENT_DELETE_IMAGE_IDS) break;
  }

  console.log(
    `Trash cleanup completed: deleted=${totalDeleted}, failed=${totalFailed}, retentionDays=${retentionDays}`,
  );
}

export function startTrashCleanupScheduler(): NodeJS.Timeout | null {
  if (!isTrashCleanupEnabled()) {
    console.log('Trash cleanup scheduler is disabled');
    return null;
  }

  const intervalHours = getTrashCleanupIntervalHours();
  let isRunning = false;

  const executeCleanup = async () => {
    if (isRunning) {
      console.warn('Trash cleanup skipped because the previous run is still active');
      return;
    }

    isRunning = true;
    try {
      await runTrashCleanup();
    } catch (error) {
      console.error('Trash cleanup failed:', error);
    } finally {
      isRunning = false;
    }
  };

  void executeCleanup();
  const timer = setInterval(() => void executeCleanup(), intervalHours * MILLISECONDS_PER_HOUR);
  timer.unref();

  console.log(`Trash cleanup scheduler started: every ${intervalHours} hour(s)`);
  return timer;
}
