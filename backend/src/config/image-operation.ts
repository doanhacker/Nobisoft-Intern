export const MAX_BULK_IMAGE_IDS = 10_000;
export const IMAGE_OPERATION_BATCH_SIZE = 250;
export const MAX_PERMANENT_DELETE_IMAGE_IDS = 500;
export const PERMANENT_DELETE_CONCURRENCY = 10;
export const DEFAULT_TRASH_RETENTION_DAYS = 30;
export const DEFAULT_TRASH_CLEANUP_INTERVAL_HOURS = 24;
export const TRASH_CLEANUP_MAX_BATCHES = 20;

function getPositiveInteger(value: string | undefined, fallback: number): number {
  const parsedValue = Number(value);
  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
}

export function getTrashRetentionDays(): number {
  return getPositiveInteger(process.env.TRASH_RETENTION_DAYS, DEFAULT_TRASH_RETENTION_DAYS);
}

export function getTrashCleanupIntervalHours(): number {
  return getPositiveInteger(
    process.env.TRASH_CLEANUP_INTERVAL_HOURS,
    DEFAULT_TRASH_CLEANUP_INTERVAL_HOURS,
  );
}
