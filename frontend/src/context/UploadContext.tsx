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

export type UploadPhase = 'idle' | 'uploading' | 'indexing' | 'done' | 'error'

export interface UploadSession {
  phase: UploadPhase
  /** batchId from backend — needed to resume polling after navigation */
  batchId: string | null
  uploadPercent: number
  isCancelled: boolean
  indexingPercent: number
  processedImages: number
  totalImages: number
  indexingStatus: BatchIndexingStatus
  uploadResults: UserUploadResult[]
  finalStatus: BatchIndexingStatus
  /** Tổng số ảnh upload thành công trong session này */
  totalUploadedSession: number
  /** Số file đang được upload (để hiển thị trong UploadingCard) */
  totalFilesUploading: number
}

const DEFAULT_SESSION: UploadSession = {
  phase: 'idle',
  batchId: null,
  uploadPercent: 0,
  isCancelled: false,
  indexingPercent: 0,
  processedImages: 0,
  totalImages: 0,
  indexingStatus: 'PENDING',
  uploadResults: [],
  finalStatus: 'COMPLETED',
  totalUploadedSession: 0,
  totalFilesUploading: 0,
}

const SESSION_KEY = 'upload_session'

// ─── Persistence helpers ───────────────────────────────────

function readSession(): UploadSession {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return DEFAULT_SESSION
    return { ...DEFAULT_SESSION, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_SESSION
  }
}

function writeSession(session: UploadSession) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } catch {
    // Ignore storage errors (e.g. private mode quota)
  }
}

function clearStoredSession() {
  sessionStorage.removeItem(SESSION_KEY)
}

// ============================================================
// Context
// ============================================================

interface UploadContextValue {
  session: UploadSession
  updateSession: (patch: Partial<UploadSession>) => void
  clearSession: () => void
  abortControllerRef: React.MutableRefObject<AbortController | null>
}

export const UploadContext = React.createContext<UploadContextValue | undefined>(undefined)

// ============================================================
// Provider
// ============================================================

export function UploadProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<UploadSession>(readSession)
  const abortControllerRef = React.useRef<AbortController | null>(null)
  // Track whether we've already started a resume to avoid double-polling
  const isResumingRef = React.useRef(false)

  // Keep sessionStorage in sync whenever session changes
  React.useEffect(() => {
    if (session.phase === 'idle') {
      clearStoredSession()
    } else {
      writeSession(session)
    }
  }, [session])

  // ── Resume indexing if we restored a session mid-poll ───────
  React.useEffect(() => {
    if (
      session.phase === 'indexing' &&
      session.batchId &&
      !isResumingRef.current
    ) {
      isResumingRef.current = true

      const controller = new AbortController()
      abortControllerRef.current = controller

      resumeIndexingPoll(
        session.batchId,
        (e: IndexingPhaseProgress) => {
          setSession((prev) => ({
            ...prev,
            indexingPercent: e.indexingPercent,
            processedImages: e.processedImages,
            totalImages: e.totalImages,
            indexingStatus: e.status,
          }))
        },
        controller.signal,
      )
        .then((finalStatus) => {
          setSession((prev) => ({
            ...prev,
            phase: 'done',
            finalStatus,
          }))
        })
        .catch((err) => {
          if (err?.name === 'AbortError' || err?.code === 'ERR_CANCELED') return
          setSession((prev) => ({ ...prev, phase: 'error' }))
        })
        .finally(() => {
          isResumingRef.current = false
        })
    }

    // If user navigated away mid-upload (phase=uploading), treat as interrupted
    if (session.phase === 'uploading') {
      setSession((prev) => ({ ...prev, phase: 'error' }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only on mount

  const updateSession = React.useCallback((patch: Partial<UploadSession>) => {
    setSession((prev) => ({ ...prev, ...patch }))
  }, [])

  const clearSession = React.useCallback(() => {
    // Abort any running poll
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
    isResumingRef.current = false
    clearStoredSession()
    setSession(DEFAULT_SESSION)
  }, [])

  const value = React.useMemo<UploadContextValue>(
    () => ({ session, updateSession, clearSession, abortControllerRef }),
    [session, updateSession, clearSession],
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
