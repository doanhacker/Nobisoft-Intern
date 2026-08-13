import * as React from 'react'
import {
  resumeIndexingPoll,
  type BatchIndexingStatus,
  type IndexingPhaseProgress,
  type UserUploadResult,
} from '@/services/userUploadService'

// ============================================================
// Types
// ============================================================

export type ActiveBatchPhase = 'uploading' | 'indexing' | 'done' | 'error'

/** State of the batch currently being uploaded/indexed */
export interface ActiveBatch {
  /** Phase of the currently active batch */
  phase: ActiveBatchPhase
  /** batchId assigned by backend (null until first chunk responds) */
  batchId: string | null
  /** 0–100 upload progress */
  uploadPercent: number
  /** Whether user clicked cancel */
  isCancelled: boolean
  /** Total files being uploaded in this batch */
  totalFilesUploading: number
  /**
   * Results only available after ALL chunks complete.
   * Empty array while upload is still in progress.
   */
  finalResults: UserUploadResult[]
}

/** A completed (or still-indexing) batch entry in the history list */
export interface BatchHistoryItem {
  /** Unique identifier from backend */
  batchId: string
  /** Current indexing status from backend polling */
  indexingStatus: BatchIndexingStatus
  /** Total images submitted to this batch */
  totalImages: number
  /** Images successfully processed by backend indexing */
  indexedCount: number
  /** Files that failed to upload (success: false from upload API) */
  failedUploadFiles: UserUploadResult[]
  /** ISO timestamp when upload of this batch started */
  startedAt: string
  /** ISO timestamp when indexing completed (COMPLETED or FAILED) */
  completedAt?: string
  /** AbortController signal key — used to identify the controller in the map */
  controllerKey: string
}

// Persisted subset of context state (no AbortControllers — not serialisable)
interface PersistedState {
  activeBatch: ActiveBatch | null
  batchHistory: BatchHistoryItem[]
  totalUploadedSession: number
}

// ─── Defaults ──────────────────────────────────────────────

const DEFAULT_STATE: PersistedState = {
  activeBatch: null,
  batchHistory: [],
  totalUploadedSession: 0,
}

const SESSION_KEY = 'upload_session_v2'

// ─── Persistence helpers ───────────────────────────────────

function readState(): PersistedState {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return DEFAULT_STATE
    const parsed = JSON.parse(raw) as Partial<PersistedState>
    return {
      activeBatch: parsed.activeBatch ?? null,
      batchHistory: parsed.batchHistory ?? [],
      totalUploadedSession: parsed.totalUploadedSession ?? 0,
    }
  } catch {
    return DEFAULT_STATE
  }
}

function writeState(state: PersistedState) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(state))
  } catch {
    // Ignore storage errors (e.g. private mode quota)
  }
}

function clearStoredState() {
  sessionStorage.removeItem(SESSION_KEY)
}

// ============================================================
// Context
// ============================================================

interface UploadContextValue {
  activeBatch: ActiveBatch | null
  batchHistory: BatchHistoryItem[]
  totalUploadedSession: number
  /** Start a new upload batch */
  startBatch: (totalFiles: number) => void
  /** Update the currently active batch */
  updateActiveBatch: (patch: Partial<ActiveBatch>) => void
  /**
   * Transition active batch into history after all chunks complete.
   * Starts background indexing polling for this batch.
   */
  promoteBatchToHistory: (opts: {
    batchId: string
    finalResults: UserUploadResult[]
    totalImages: number
  }) => void
  /** Mark active batch upload as done (phase: done/error) */
  finishActiveBatch: (phase: 'done' | 'error') => void
  /** Cancel the active batch upload */
  cancelActiveBatch: () => void
  /** Clear all history and reset state */
  clearAll: () => void
  /** AbortController for the currently active batch upload */
  activeBatchControllerRef: React.MutableRefObject<AbortController | null>
}

export const UploadContext = React.createContext<UploadContextValue | undefined>(undefined)

// ============================================================
// Provider
// ============================================================

export function UploadProvider({ children }: { children: React.ReactNode }) {
  const restored = readState()

  const [activeBatch, setActiveBatch] = React.useState<ActiveBatch | null>(restored.activeBatch)
  const [batchHistory, setBatchHistory] = React.useState<BatchHistoryItem[]>(
    restored.batchHistory,
  )
  const [totalUploadedSession, setTotalUploadedSession] = React.useState(
    restored.totalUploadedSession,
  )

  // Each batch gets its own AbortController, keyed by controllerKey.
  // We keep them in a Map so they can run concurrently.
  const controllerMapRef = React.useRef<Map<string, AbortController>>(new Map())

  // Ref for the active batch's upload controller (upload phase only)
  const activeBatchControllerRef = React.useRef<AbortController | null>(null)

  // ── Persist state changes ──────────────────────────────────
  React.useEffect(() => {
    const state: PersistedState = { activeBatch, batchHistory, totalUploadedSession }
    if (!activeBatch && batchHistory.length === 0 && totalUploadedSession === 0) {
      clearStoredState()
    } else {
      writeState(state)
    }
  }, [activeBatch, batchHistory, totalUploadedSession])

  // ── Resume polling for in-progress batches on mount ────────
  React.useEffect(() => {
    // If we mounted with an uploading active batch, it means the page was
    // refreshed mid-upload — mark it as error since we can't resume.
    if (activeBatch?.phase === 'uploading') {
      setActiveBatch((prev) => (prev ? { ...prev, phase: 'error' } : null))
    }

    // Resume polling for any batch in history that's still in-progress
    const inProgress = restored.batchHistory.filter(
      (b) => b.indexingStatus === 'PENDING' || b.indexingStatus === 'PROCESSING' || b.indexingStatus === 'UPLOADING',
    )

    for (const batch of inProgress) {
      const controller = new AbortController()
      controllerMapRef.current.set(batch.controllerKey, controller)
      startPollingForBatch(batch.batchId, batch.controllerKey, controller.signal)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // only on mount

  // ─── Internal polling starter ─────────────────────────────

  function startPollingForBatch(batchId: string, controllerKey: string, signal: AbortSignal) {
    resumeIndexingPoll(
      batchId,
      (e: IndexingPhaseProgress) => {
        setBatchHistory((prev) =>
          prev.map((b) =>
            b.batchId === batchId
              ? { ...b, indexingStatus: e.status, indexedCount: e.processedImages }
              : b,
          ),
        )
      },
      signal,
    )
      .then((finalStatus) => {
        setBatchHistory((prev) =>
          prev.map((b) =>
            b.batchId === batchId
              ? {
                  ...b,
                  indexingStatus: finalStatus,
                  completedAt: new Date().toISOString(),
                }
              : b,
          ),
        )
        // Clean up controller
        controllerMapRef.current.delete(controllerKey)
      })
      .catch((err) => {
        if (err?.name === 'AbortError' || err?.code === 'ERR_CANCELED') return
        setBatchHistory((prev) =>
          prev.map((b) =>
            b.batchId === batchId ? { ...b, indexingStatus: 'FAILED' } : b,
          ),
        )
        controllerMapRef.current.delete(controllerKey)
      })
  }

  // ─── Context actions ───────────────────────────────────────

  const startBatch = React.useCallback((totalFiles: number) => {
    // Create new upload controller for this batch
    const controller = new AbortController()
    activeBatchControllerRef.current = controller

    setActiveBatch({
      phase: 'uploading',
      batchId: null,
      uploadPercent: 0,
      isCancelled: false,
      totalFilesUploading: totalFiles,
      finalResults: [],
    })
  }, [])

  const updateActiveBatch = React.useCallback((patch: Partial<ActiveBatch>) => {
    setActiveBatch((prev) => (prev ? { ...prev, ...patch } : null))
  }, [])

  const promoteBatchToHistory = React.useCallback(
    (opts: { batchId: string; finalResults: UserUploadResult[]; totalImages: number }) => {
      const { batchId, finalResults, totalImages } = opts

      const failedUploadFiles = finalResults.filter((r) => !r.success)
      const successCount = finalResults.filter((r) => r.success).length

      const controllerKey = `poll-${batchId}-${Date.now()}`
      const controller = new AbortController()
      controllerMapRef.current.set(controllerKey, controller)

      const historyItem: BatchHistoryItem = {
        batchId,
        indexingStatus: 'PENDING',
        totalImages,
        indexedCount: 0,
        failedUploadFiles,
        startedAt: new Date().toISOString(),
        controllerKey,
      }

      setBatchHistory((prev) => [historyItem, ...prev])
      setTotalUploadedSession((prev) => prev + successCount)

      // Update active batch with final results & transition to indexing
      setActiveBatch((prev) =>
        prev ? { ...prev, phase: 'indexing', batchId, finalResults } : null,
      )

      // Start polling independently — this controller is NOT tied to activeBatchControllerRef
      startPollingForBatch(batchId, controllerKey, controller.signal)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const finishActiveBatch = React.useCallback((phase: 'done' | 'error') => {
    setActiveBatch((prev) => (prev ? { ...prev, phase } : null))
  }, [])

  const cancelActiveBatch = React.useCallback(() => {
    activeBatchControllerRef.current?.abort()
    activeBatchControllerRef.current = null
    setActiveBatch((prev) => (prev ? { ...prev, isCancelled: true } : null))
  }, [])

  const clearAll = React.useCallback(() => {
    // Abort active upload
    activeBatchControllerRef.current?.abort()
    activeBatchControllerRef.current = null

    // Abort all indexing polls
    for (const controller of controllerMapRef.current.values()) {
      controller.abort()
    }
    controllerMapRef.current.clear()

    clearStoredState()
    setActiveBatch(null)
    setBatchHistory([])
    setTotalUploadedSession(0)
  }, [])

  const value = React.useMemo<UploadContextValue>(
    () => ({
      activeBatch,
      batchHistory,
      totalUploadedSession,
      startBatch,
      updateActiveBatch,
      promoteBatchToHistory,
      finishActiveBatch,
      cancelActiveBatch,
      clearAll,
      activeBatchControllerRef,
    }),
    [
      activeBatch,
      batchHistory,
      totalUploadedSession,
      startBatch,
      updateActiveBatch,
      promoteBatchToHistory,
      finishActiveBatch,
      cancelActiveBatch,
      clearAll,
    ],
  )

  return <UploadContext.Provider value={value}>{children}</UploadContext.Provider>
}

// ============================================================
// Hook
// ============================================================

export function useUploadContext(): UploadContextValue {
  const ctx = React.useContext(UploadContext)
  if (!ctx) throw new Error('useUploadContext must be used within <UploadProvider>')
  return ctx
}
