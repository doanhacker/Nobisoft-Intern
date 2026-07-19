import axiosClient from './axiosClient'

// ============================================================
// User Image Upload Service
// POST /upload  (field: "images", max 5 files/request, max 10MB/file)
// Auth: Bearer token (handled by axiosClient interceptor)
// ============================================================

const BATCH_SIZE = 5 // Hard limit enforced by backend Multer middleware

// ─── Types ────────────────────────────────────────────────────

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

interface BatchApiResponse {
  success: boolean
  message: string
  data: UserUploadResult[]
}

// ─── Batch progress callback ───────────────────────────────────

export interface BatchProgressEvent {
  /** 0-100 overall percentage */
  percent: number
  /** Which batch just finished (1-indexed) */
  batchIndex: number
  /** Total number of batches */
  totalBatches: number
  /** Results from the batch that just completed */
  batchResults: UserUploadResult[]
}

export type OnBatchProgress = (event: BatchProgressEvent) => void

// ─── Core function ─────────────────────────────────────────────

/**
 * Upload `files` to POST /upload in sequential batches of 5.
 *
 * - Each API call carries at most BATCH_SIZE (5) files.
 * - Calls are made one after another (sequential) to avoid overloading the server.
 * - After each batch `onBatchProgress` is called with the running total progress
 *   and the individual results so the UI can update in real time.
 * - Pass an `AbortSignal` to allow the user to cancel mid-flight.
 *
 * @throws {Error} if the request itself fails (network error, 401, 500, etc.)
 *                 Individual file failures are surfaced via `result.success = false`.
 */
export async function uploadUserImages(
  files: File[],
  onBatchProgress?: OnBatchProgress,
  signal?: AbortSignal,
): Promise<UserUploadResult[]> {
  // Split into chunks of BATCH_SIZE
  const chunks: File[][] = []
  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    chunks.push(files.slice(i, i + BATCH_SIZE))
  }

  const totalBatches = chunks.length
  const allResults: UserUploadResult[] = []

  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    // Respect cancellation between batches
    if (signal?.aborted) {
      break
    }

    const chunk = chunks[batchIndex]
    const formData = new FormData()
    for (const file of chunk) {
      formData.append('images', file)
    }

    const { data } = await axiosClient.post<BatchApiResponse>('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      signal,
      // Give large batches more time — 60s per batch
      timeout: 60_000,
    })

    const batchResults: UserUploadResult[] = data.data ?? []
    allResults.push(...batchResults)

    // Calculate overall progress: completed batches / total batches
    const percent = Math.round(((batchIndex + 1) / totalBatches) * 100)

    onBatchProgress?.({
      percent,
      batchIndex: batchIndex + 1,
      totalBatches,
      batchResults,
    })
  }

  return allResults
}
