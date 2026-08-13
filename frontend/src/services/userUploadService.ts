import axiosClient from './axiosClient'

// ============================================================
// User Image Upload Service
// POST /upload  (field: "images", tối đa 20 file / 20MB mỗi chunk)
// GET  /upload/batch/:batchId  — polling indexing status
// Auth: Bearer token (handled by axiosClient interceptor)
// ============================================================

const CHUNK_SIZE = 20 // max files per POST /upload call
const CHUNK_MAX_BYTES = 20 * 1024 * 1024 // 20MB max per call
const POLL_INTERVAL_MS = 4_000 // poll every 4 seconds
const POLL_TIMEOUT_MS = 5 * 60 * 1000 // stop polling after 5 minutes

// ─── Types ─────────────────────────────────────────────────

export interface UserUploadResult {
  filename: string
  success: boolean
  /** UUID assigned by backend — present when success = true */
  id?: string
  /** Relative storage path — present when success = true */
  path?: string
  /** Error message — present when success = false */
  error?: string
}

interface ChunkApiResponse {
  success: boolean
  message: string
  data: {
    /** batchId created/reused for this upload session */
    batchId: string
    results: UserUploadResult[]
  }
}

export type BatchIndexingStatus = 'UPLOADING' | 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

interface BatchStatusResponse {
  success: boolean
  data: {
    batchId: string
    status: BatchIndexingStatus
    totalImages: number
    successCount: number
    failedCount: number
    totalDurationMs: number | null
    createdAt: string
  }
}

// ─── Progress callbacks ─────────────────────────────────────

/** Fired after each chunk is uploaded (phase 1: uploading) */
export interface UploadPhaseProgress {
  /** 0–100 overall upload percentage */
  uploadPercent: number
  /** chunks finished so far */
  chunksUploaded: number
  /** total chunks to send */
  totalChunks: number
}

/** Fired once after ALL chunks have been uploaded successfully */
export interface AllChunksCompleteEvent {
  /** All upload results aggregated from every chunk */
  allResults: UserUploadResult[]
  /** The batchId assigned by the backend */
  batchId: string
}

/** Fired on each poll tick (phase 2: indexing) */
export interface IndexingPhaseProgress {
  /** 0–100 indexing percentage (processedImages / totalImages) */
  indexingPercent: number
  processedImages: number
  totalImages: number
  status: BatchIndexingStatus
}

export interface UploadCallbacks {
  onUploadProgress?: (e: UploadPhaseProgress) => void
  /**
   * Called ONCE after the last chunk upload completes.
   * This is the correct place to display per-image results,
   * ensuring partial/intermediate results are never shown.
   */
  onAllChunksComplete?: (e: AllChunksCompleteEvent) => void
  onIndexingProgress?: (e: IndexingPhaseProgress) => void
}

// ─── Helpers ───────────────────────────────────────────────

/**
 * Split `files` into chunks where each chunk has ≤ CHUNK_SIZE files
 * and ≤ CHUNK_MAX_BYTES total size.
 */
function splitIntoChunks(files: File[]): File[][] {
  const chunks: File[][] = []
  let current: File[] = []
  let currentBytes = 0

  for (const file of files) {
    const wouldExceedCount = current.length >= CHUNK_SIZE
    const wouldExceedBytes = currentBytes + file.size > CHUNK_MAX_BYTES

    if (current.length > 0 && (wouldExceedCount || wouldExceedBytes)) {
      chunks.push(current)
      current = []
      currentBytes = 0
    }

    current.push(file)
    currentBytes += file.size
  }

  if (current.length > 0) chunks.push(current)
  return chunks
}

// ─── Polling helper ─────────────────────────────────────────

/**
 * Poll `GET /upload/batch/:batchId` every POLL_INTERVAL_MS until COMPLETED/FAILED.
 * Exported so UploadContext can resume polling after the user navigates away and returns.
 */
export async function resumeIndexingPoll(
  batchId: string,
  onProgress?: (e: IndexingPhaseProgress) => void,
  signal?: AbortSignal,
): Promise<BatchIndexingStatus> {
  const deadline = Date.now() + POLL_TIMEOUT_MS

  while (Date.now() < deadline) {
    if (signal?.aborted) break

    await new Promise<void>((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))

    if (signal?.aborted) break

    const { data } = await axiosClient.get<BatchStatusResponse>(`/upload/batch/${batchId}`, {
      signal,
      timeout: 10_000,
    })

    const { status, successCount, failedCount, totalImages } = data.data
    // processedImages = tất cả ảnh đã có kết quả (thành công + thất bại)
    const processedImages = (successCount ?? 0) + (failedCount ?? 0)
    const indexingPercent =
      totalImages > 0 ? Math.round((processedImages / totalImages) * 100) : 0

    onProgress?.({ indexingPercent, processedImages, totalImages: totalImages ?? 0, status })

    if (status === 'COMPLETED' || status === 'FAILED') {
      return status
    }
  }

  // Timed out or aborted — treat as unknown completion
  return 'COMPLETED'
}

// ─── Core function ──────────────────────────────────────────

/**
 * Full two-phase upload flow:
 *
 * **Phase 1 — Upload**: Files are split into chunks (≤ 20 files, ≤ 20MB each)
 * and POSTed sequentially. The server returns a `batchId` on the first call;
 * subsequent calls reuse it. The last chunk is flagged with `isLastChunk=true`.
 *
 * **Phase 2 — Indexing**: After all chunks are sent, `GET /upload/batch/:batchId`
 * is polled every 4 s until the server reports `COMPLETED` or `FAILED` (max 5 min).
 *
 * Both phases fire progress callbacks so the UI can show user-friendly progress
 * without exposing any internal batch/chunk concepts.
 *
 * The `onAllChunksComplete` callback fires exactly once after the last chunk,
 * providing all aggregated results — never partial/intermediate results.
 *
 * @throws {Error} on network/server errors. Individual file failures are surfaced
 *                 in `onAllChunksComplete` with `success = false`.
 */
export async function uploadUserImages(
  files: File[],
  callbacks?: UploadCallbacks,
  signal?: AbortSignal,
): Promise<{ results: UserUploadResult[]; finalStatus: BatchIndexingStatus }> {
  const chunks = splitIntoChunks(files)
  const totalChunks = chunks.length
  // Accumulate results internally — never expose partial results
  const allResults: UserUploadResult[] = []
  let batchId: string | null = null

  // ── Phase 1: Upload ───────────────────────────────────────
  for (let i = 0; i < totalChunks; i++) {
    if (signal?.aborted) break

    const chunk = chunks[i]
    const isLastChunk = i === totalChunks - 1

    const formData = new FormData()
    for (const file of chunk) {
      formData.append('images', file)
    }
    if (batchId) {
      formData.append('batchId', batchId)
    }
    if (isLastChunk) {
      formData.append('isLastChunk', 'true')
    }

    try {
      const { data } = await axiosClient.post<ChunkApiResponse>('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        signal,
        timeout: 60_000,
      })

      // Capture batchId from first response — immutable for the rest of this batch
      if (!batchId && data.data?.batchId) {
        batchId = data.data.batchId
      }

      const chunkResults: UserUploadResult[] = Array.isArray(data.data?.results)
        ? data.data.results
        : []
      // Accumulate internally — do NOT expose partial results via callbacks
      allResults.push(...chunkResults)

      const uploadPercent = Math.round(((i + 1) / totalChunks) * 100)
      // Fire progress (no uploadedResults — prevents premature display)
      callbacks?.onUploadProgress?.({
        uploadPercent,
        chunksUploaded: i + 1,
        totalChunks,
      })

      // After the LAST chunk: flush all aggregated results at once
      if (isLastChunk && batchId) {
        callbacks?.onAllChunksComplete?.({
          allResults,
          batchId,
        })
      }
    } catch (error: any) {
      const failedResultMessage = error?.response?.data?.message || error?.message || 'Upload thất bại'

      // If a chunk fails, keep the batch alive for subsequent chunks only when
      // we already have a valid batchId from an earlier successful request.
      const failedChunkResults: UserUploadResult[] = chunk.map((file) => ({
        filename: file.name,
        success: false,
        error: failedResultMessage,
      }))
      allResults.push(...failedChunkResults)

      const uploadPercent = Math.round(((i + 1) / totalChunks) * 100)
      callbacks?.onUploadProgress?.({
        uploadPercent,
        chunksUploaded: i + 1,
        totalChunks,
      })

      if (isLastChunk && batchId) {
        callbacks?.onAllChunksComplete?.({
          allResults,
          batchId,
        })
      }

      if (!batchId && !isLastChunk) {
        break
      }
    }
  }

  // ── Phase 2: Indexing polling ─────────────────────────────
  let finalStatus: BatchIndexingStatus = 'COMPLETED'

  if (batchId && !signal?.aborted) {
    // Fire initial progress so UI transitions to indexing phase right away
    callbacks?.onIndexingProgress?.({
      indexingPercent: 0,
      processedImages: 0,
      totalImages: files.length,
      status: 'PENDING',
    })

    finalStatus = await resumeIndexingPoll(batchId, callbacks?.onIndexingProgress, signal)
  }

  return { results: allResults, finalStatus }
}
