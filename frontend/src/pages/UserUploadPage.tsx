import * as React from 'react'
import { useCallback, useRef } from 'react'
import {
  UploadCloud,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Images,
  Search,
  Sparkles,
  FolderOpen,
  Info,
  StopCircle,
} from 'lucide-react'
import { uploadUserImages } from '@/services/userUploadService'
import type { UploadPhaseProgress, IndexingPhaseProgress, BatchIndexingStatus, UserUploadResult } from '@/services/userUploadService'
import { useUploadContext } from '@/context/UploadContext'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'

// ============================================================
// Constants
// ============================================================

const MAX_FILES = 1000
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB per file
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']

// ============================================================
// HowItWorks Banner
// ============================================================

function HowItWorksBanner() {
  const steps = [
    {
      icon: <UploadCloud className="size-5" />,
      title: 'Tải ảnh lên',
      desc: 'Chọn hoặc kéo thả ảnh từ thiết bị của bạn',
      color: 'text-blue-500 bg-blue-500/10',
    },
    {
      icon: <Sparkles className="size-5" />,
      title: 'AI phân tích',
      desc: 'Hệ thống tự động nhận diện nội dung trong ảnh',
      color: 'text-violet-500 bg-violet-500/10',
    },
    {
      icon: <Search className="size-5" />,
      title: 'Tìm kiếm dễ dàng',
      desc: 'Tìm lại ảnh bằng mô tả văn bản hoặc ảnh tương tự',
      color: 'text-emerald-500 bg-emerald-500/10',
    },
  ]

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Info className="size-4 text-primary" />
        Tại sao cần tải ảnh lên?
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {steps.map((step, i) => (
          <div key={i} className="flex items-start gap-3">
            <div
              className={cn(
                'flex items-center justify-center size-9 rounded-xl shrink-0',
                step.color,
              )}
            >
              {step.icon}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{step.title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// UploadDropZone
// ============================================================

interface UploadDropZoneProps {
  onFilesSelected: (files: File[]) => void
  disabled: boolean
  fileCount: number
}

function UploadDropZone({ onFilesSelected, disabled, fileCount }: UploadDropZoneProps) {
  const [isDragActive, setIsDragActive] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const toast = useToast()

  const validateAndFilter = (files: File[]): File[] => {
    const valid: File[] = []
    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error(`"${file.name}" không đúng định dạng (chỉ JPG, PNG, WebP, AVIF)`)
        continue
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`"${file.name}" vượt quá 10MB`)
        continue
      }
      valid.push(file)
    }
    return valid
  }

  // ── Clipboard paste ─────────────────────────────────────────
  React.useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (disabled) return
      const items = e.clipboardData?.items
      if (!items) return
      const imageFiles: File[] = []
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile()
          if (file) imageFiles.push(file)
        }
      }
      if (imageFiles.length > 0) {
        const valid = validateAndFilter(imageFiles)
        if (valid.length > 0) onFilesSelected(valid)
      }
    }
    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled])

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (!disabled) setIsDragActive(true)
    },
    [disabled],
  )

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)
  }, [])

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (!disabled) setIsDragActive(true)
    },
    [disabled],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragActive(false)
      if (disabled) return
      const valid = validateAndFilter(Array.from(e.dataTransfer.files))
      if (valid.length > 0) onFilesSelected(valid)
    },
    [onFilesSelected, disabled],
  )

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        const valid = validateAndFilter(Array.from(e.target.files))
        if (valid.length > 0) onFilesSelected(valid)
      }
      if (fileInputRef.current) fileInputRef.current.value = ''
    },
    [onFilesSelected],
  )

  const isFull = fileCount >= MAX_FILES

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={() => !disabled && !isFull && fileInputRef.current?.click()}
      className={cn(
        'relative flex flex-col items-center justify-center p-10 sm:p-14 border-2 border-dashed rounded-2xl transition-all duration-300 select-none',
        disabled || isFull
          ? 'opacity-50 cursor-not-allowed border-border/50 bg-muted/10'
          : isDragActive
            ? 'border-primary bg-primary/5 scale-[1.01] cursor-copy shadow-[0_0_40px_oklch(0.52_0.22_268/0.15)]'
            : 'border-border hover:border-primary/60 hover:bg-muted/20 cursor-pointer',
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ALLOWED_TYPES.join(',')}
        onChange={handleInput}
        className="hidden"
        disabled={disabled || isFull}
        id="user-upload-input"
      />

      <div
        className={cn(
          'flex items-center justify-center size-16 sm:size-20 rounded-2xl mb-5 transition-all duration-300',
          isDragActive ? 'bg-primary/20 text-primary scale-110' : 'bg-muted/60 text-muted-foreground',
        )}
      >
        <UploadCloud className="size-8 sm:size-10" strokeWidth={1.5} />
      </div>

      <p className="font-bold text-base sm:text-lg text-foreground mb-1 text-center">
        {isDragActive ? 'Thả ảnh vào đây!' : 'Kéo & thả ảnh vào đây'}
      </p>
      <p className="text-sm text-muted-foreground text-center mb-3">
        hoặc{' '}
        <span className="text-primary font-semibold underline-offset-2 hover:underline">
          bấm để chọn ảnh
        </span>{' '}
        từ thiết bị
      </p>
      <p className="text-xs text-muted-foreground/60 flex items-center gap-1.5 mb-4">
        <kbd className="inline-flex items-center rounded border border-border/60 bg-muted px-1.5 py-0.5 font-mono text-[10px]">Ctrl+V</kbd>
        để dán ảnh từ clipboard
      </p>

      <div className="flex flex-wrap gap-2 justify-center">
        {['JPG, PNG, WebP, AVIF', `Tối đa ${MAX_FILES.toLocaleString()} ảnh`, 'Mỗi ảnh < 10MB'].map((tag) => (
          <span
            key={tag}
            className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-muted/80 text-muted-foreground border border-border/50"
          >
            {tag}
          </span>
        ))}
      </div>

      {isFull && (
        <p className="mt-4 text-xs text-amber-600 font-medium">
          Đã đạt tối đa {MAX_FILES.toLocaleString()} ảnh.
        </p>
      )}
    </div>
  )
}

// ============================================================
// UploadingCard — Phase 1
// ============================================================

interface UploadingCardProps {
  totalFiles: number
  uploadPercent: number
  isCancelled: boolean
  onCancel: () => void
}

function UploadingCard({ totalFiles, uploadPercent, isCancelled, onCancel }: UploadingCardProps) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center size-8 rounded-full bg-primary/10">
            <Loader2 className="size-4 animate-spin text-primary" />
          </div>
          <div>
            <p className="font-semibold text-foreground text-sm">
              Đang tải {totalFiles.toLocaleString()} ảnh lên...
            </p>
            <p className="text-xs text-muted-foreground">Vui lòng không đóng trang</p>
          </div>
        </div>
        <Button
          id="user-upload-cancel"
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={isCancelled}
          className="text-destructive border-destructive/40 hover:bg-destructive/10 gap-1.5 shrink-0"
        >
          <StopCircle className="size-3.5" />
          {isCancelled ? 'Đang dừng...' : 'Huỷ'}
        </Button>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <UploadCloud className="size-3.5" />
            {isCancelled ? 'Đã huỷ — dừng sau lần gửi hiện tại' : 'Đang gửi ảnh lên máy chủ'}
          </span>
          <span className="font-semibold tabular-nums text-foreground">{uploadPercent}%</span>
        </div>
        <div className="h-2.5 bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500 ease-out',
              isCancelled ? 'bg-amber-500' : 'gradient-brand',
            )}
            style={{ width: `${uploadPercent}%` }}
          />
        </div>
      </div>
    </div>
  )
}

// ============================================================
// DoneCard — Summary after completion
// ============================================================

interface DoneCardProps {
  results: UserUploadResult[]
  finalStatus: BatchIndexingStatus
}

function DoneCard({ results, finalStatus }: DoneCardProps) {
  const successCount = results.filter((r) => r.success).length
  const failCount = results.length - successCount
  const indexingFailed = finalStatus === 'FAILED'

  return (
    <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
      <div
        className={cn(
          'flex items-center gap-3 px-5 py-4 border-b border-border/50',
          indexingFailed ? 'bg-amber-500/5' : 'bg-emerald-500/5',
        )}
      >
        {indexingFailed ? (
          <AlertCircle className="size-5 text-amber-500 shrink-0" />
        ) : (
          <CheckCircle2 className="size-5 text-emerald-500 shrink-0" />
        )}
        <div className="flex-1">
          <h3 className="font-bold text-foreground text-sm">
            {indexingFailed ? 'Upload hoàn tất, có lỗi xử lý' : 'Hoàn tất! Ảnh đã sẵn sàng tìm kiếm'}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {indexingFailed
              ? 'Một số ảnh có thể chưa được tìm kiếm ngay. Vui lòng thử lại sau.'
              : 'Bạn có thể tìm lại ảnh bất kỳ lúc nào bằng mô tả hoặc ảnh tương tự.'}
          </p>
        </div>
      </div>

      <div className="flex divide-x divide-border/40">
        <div className="flex-1 flex flex-col items-center py-4">
          <span className="text-2xl font-black text-foreground tabular-nums">
            {successCount.toLocaleString()}
          </span>
          <span className="text-xs text-muted-foreground mt-0.5">ảnh đã tải lên</span>
        </div>
        {failCount > 0 && (
          <div className="flex-1 flex flex-col items-center py-4">
            <span className="text-2xl font-black text-destructive tabular-nums">
              {failCount.toLocaleString()}
            </span>
            <span className="text-xs text-muted-foreground mt-0.5">ảnh thất bại</span>
          </div>
        )}
        <div className="flex-1 flex flex-col items-center py-4">
          <span
            className={cn(
              'text-2xl font-black tabular-nums',
              indexingFailed ? 'text-amber-500' : 'text-emerald-500',
            )}
          >
            {indexingFailed ? '⚠' : '✓'}
          </span>
          <span className="text-xs text-muted-foreground mt-0.5">
            {indexingFailed ? 'Lỗi xử lý' : 'Đã lập chỉ mục'}
          </span>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// UserUploadPage
// ============================================================

export function UserUploadPage() {
  // ── Context (persisted state) ─────────────────────────────
  const { session, updateSession, clearSession, abortControllerRef } = useUploadContext()
  const {
    phase,
    uploadPercent,
    isCancelled,
    uploadResults,
    finalStatus,
    totalUploadedSession,
    totalFilesUploading,
  } = session

  // Local-only state (not worth persisting)
  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([])

  const toast = useToast()
  // Keep a stable ref to abortController for cancel
  const localAbortRef = useRef<AbortController | null>(null)

  // ── File selection ─────────────────────────────────────────

  const handleFilesSelected = (newFiles: File[]) => {
    setSelectedFiles((prev) => {
      const combined = [...prev, ...newFiles]
      const unique = combined.filter(
        (v, i, a) => a.findIndex((t) => t.name === v.name && t.size === v.size) === i,
      )
      if (unique.length > MAX_FILES) {
        toast.warning(`Chỉ hỗ trợ tối đa ${MAX_FILES.toLocaleString()} ảnh. Đã cắt bớt phần thừa.`)
        return unique.slice(0, MAX_FILES)
      }
      return unique
    })
  }

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const userCancelledRef = React.useRef(false)

  // ── Cancel (upload phase only) ─────────────────────────────

  const handleCancel = () => {
    userCancelledRef.current = true
    abortControllerRef.current?.abort()
    localAbortRef.current?.abort()
    updateSession({ isCancelled: true })
  }

  // ── Reset ─────────────────────────────────────────────────

  const handleReset = () => {
    clearSession()
    setSelectedFiles([])
  }

  // ── Upload ────────────────────────────────────────────────

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return

    userCancelledRef.current = false

    // If currently indexing a previous batch, abort its polling loop quietly so we can start fresh.
    if (isIndexing) {
      abortControllerRef.current?.abort()
    }

    const filesToUpload = [...selectedFiles]

    updateSession({
      phase: 'uploading',
      isCancelled: false,
      uploadPercent: 0,
      indexingPercent: 0,
      uploadResults: [],
      batchId: null,
      totalFilesUploading: filesToUpload.length,
    })
    setSelectedFiles([])

    const controller = new AbortController()
    abortControllerRef.current = controller
    localAbortRef.current = controller

    try {
      const { results, finalStatus: status } = await uploadUserImages(
        filesToUpload,
        {
          onUploadProgress: (e: UploadPhaseProgress) => {
            updateSession({ uploadPercent: e.uploadPercent })
          },
          onIndexingProgress: (e: IndexingPhaseProgress) => {
            updateSession({
              phase: 'indexing',
              indexingPercent: e.indexingPercent,
              processedImages: e.processedImages,
              totalImages: e.totalImages,
              indexingStatus: e.status,
            })
          },
        },
        controller.signal,
      )

      const successCount = results.filter((r) => r.success).length
      const failCount = results.length - successCount
      const wasUserCancelled = userCancelledRef.current

      updateSession({
        uploadResults: results,
        finalStatus: status,
        totalUploadedSession: totalUploadedSession + successCount,
        phase: 'done',
      })

      if (wasUserCancelled) {
        toast.warning(`Đã huỷ. ${successCount} ảnh đã được tải lên trước khi dừng.`)
      } else if (failCount === 0) {
        toast.success(`${successCount} ảnh đã được thêm vào thư viện thành công 🎉`)
      } else if (successCount === 0) {
        toast.error('Tất cả ảnh đều tải lên thất bại. Vui lòng thử lại.')
      } else {
        toast.warning(`${successCount} ảnh thành công, ${failCount} ảnh thất bại.`)
      }
    } catch (error: any) {
      if (error?.name === 'AbortError' || error?.code === 'ERR_CANCELED') {
        // handled via wasCancelled above
      } else {
        console.error('Upload error:', error)
        updateSession({ phase: 'error' })
        toast.error(error?.response?.data?.message || 'Có lỗi xảy ra. Vui lòng thử lại.')
      }
    }
  }

  // ── Derived ───────────────────────────────────────────────

  const isIdle = phase === 'idle'
  const isUploading = phase === 'uploading'
  const isIndexing = phase === 'indexing'
  const isDone = phase === 'done'
  const isError = phase === 'error'
  // Drop zone only disabled during active upload, not during background indexing
  const isDropZoneDisabled = isUploading

  // Toast when indexing completes in background (phase: indexing → done)
  const prevPhaseRef = React.useRef(phase)
  React.useEffect(() => {
    if (prevPhaseRef.current === 'indexing' && phase === 'done') {
      toast.success('Ảnh đã được phân tích xong và sẵn sàng tìm kiếm! 🌟', {
        description: `${uploadResults.filter((r) => r.success).length.toLocaleString()} ảnh đã được lập chỉ mục.`,
      })
    }
    prevPhaseRef.current = phase
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background">
      {/* Hero gradient backdrop */}
      <div
        className="absolute top-0 left-0 right-0 h-72 pointer-events-none -z-0 opacity-40"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% -10%, oklch(0.52 0.22 268 / 0.3), transparent)',
        }}
      />

      <div className="relative z-[1] max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
        {/* ── Page Header ── */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-2">
            <Images className="size-3.5" />
            Thư viện ảnh cá nhân
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">
            Tải ảnh lên để{' '}
            <span className="text-gradient-brand">tìm kiếm thông minh</span>
          </h1>
          <p className="text-base text-muted-foreground max-w-lg mx-auto leading-relaxed">
            Upload ảnh của bạn một lần, sau đó tìm lại bất kỳ lúc nào bằng cách mô tả hoặc dùng
            ảnh tương tự — AI sẽ làm phần còn lại.
          </p>
        </div>

        {/* ── Session stats ── */}
        {totalUploadedSession > 0 && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="size-4 text-emerald-500" />
            <span>
              Phiên này đã tải lên thành công{' '}
              <strong className="text-foreground">{totalUploadedSession.toLocaleString()}</strong> ảnh
            </span>
          </div>
        )}

        {/* ── How it works (idle only) ── */}
        {isIdle && <HowItWorksBanner />}

        {/* ── Background indexing indicator (minimal, non-blocking) ── */}
        {isIndexing && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-violet-500/20 bg-violet-500/5 text-sm">
            <Sparkles className="size-4 text-violet-500 animate-pulse shrink-0" />
            <p className="text-violet-700 dark:text-violet-300 text-xs font-medium flex-1">
              AI đang phân tích ảnh trong nền… Bạn có thể tiếp tục upload ảnh mới.
            </p>
          </div>
        )}

        {/* ── Drop zone (hidden only during active upload) ── */}
        {!isUploading && (
          <UploadDropZone
            onFilesSelected={handleFilesSelected}
            disabled={isDropZoneDisabled}
            fileCount={selectedFiles.length}
          />
        )}

        {/* ── Selected files preview ── */}
        {selectedFiles.length > 0 && !isUploading && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderOpen className="size-4 text-muted-foreground" />
                <h3 className="font-bold text-foreground text-sm">
                  Đã chọn{' '}
                  <span className="text-primary">{selectedFiles.length.toLocaleString()}</span> ảnh
                </h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedFiles([])}
                className="text-muted-foreground hover:text-destructive text-xs"
              >
                Xoá tất cả
              </Button>
            </div>

            {/* Thumbnail grid — cap at 60 previews */}
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-1.5">
              {selectedFiles.slice(0, 60).map((file, idx) => (
                <div
                  key={`${file.name}-${idx}`}
                  className="group relative aspect-square rounded-lg overflow-hidden border border-border/60 bg-muted/50 hover:border-primary/50 transition-colors"
                >
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="w-full h-full object-cover"
                    onLoad={(e) => URL.revokeObjectURL((e.target as HTMLImageElement).src)}
                  />
                  <button
                    onClick={() => handleRemoveFile(idx)}
                    className="absolute -top-1 -right-1 flex items-center justify-center size-4 rounded-full bg-background border border-border/60 text-muted-foreground hover:bg-destructive hover:text-white hover:border-destructive transition-all opacity-0 group-hover:opacity-100 shadow-sm"
                    aria-label={`Xoá ${file.name}`}
                  >
                    <X className="size-2.5" />
                  </button>
                </div>
              ))}
              {selectedFiles.length > 60 && (
                <div className="aspect-square rounded-lg bg-muted/60 border border-border/50 flex items-center justify-center">
                  <span className="text-xs font-semibold text-muted-foreground text-center leading-tight">
                    +{(selectedFiles.length - 60).toLocaleString()}
                    <br />
                    ảnh
                  </span>
                </div>
              )}
            </div>

            {/* Upload action */}
            <div className="flex flex-col items-center gap-3 pt-2">
              <Button
                id="user-upload-submit"
                variant="brand"
                size="lg"
                onClick={handleUpload}
                className="w-full sm:w-auto min-w-[260px] text-base"
              >
                <UploadCloud className="size-4 mr-2" />
                Tải {selectedFiles.length.toLocaleString()} ảnh lên thư viện
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Ảnh sẽ được AI phân tích tự động sau khi tải lên
              </p>
            </div>
          </div>
        )}

        {/* ── Phase 1: Uploading ── */}
        {isUploading && (
          <UploadingCard
            totalFiles={totalFilesUploading}
            uploadPercent={uploadPercent}
            isCancelled={isCancelled}
            onCancel={handleCancel}
          />
        )}

        {/* ── Phase 2: Indexing — hidden (runs in background) ── */}
        {/* IndexingCard intentionally removed — user sees a minimal banner above instead. */}

        {/* ── Error state ── */}
        {isError && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 flex items-center gap-4">
            <AlertCircle className="size-6 text-destructive shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-foreground text-sm">Đã xảy ra lỗi</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Vui lòng kiểm tra kết nối mạng và thử lại.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleReset}>
              Thử lại
            </Button>
          </div>
        )}

        {/* ── Done: summary + next actions ── */}
        {isDone && (
          <div className="space-y-4">
            <DoneCard results={uploadResults} finalStatus={finalStatus} />

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <Button variant="outline" onClick={handleReset} className="w-full sm:w-auto">
                <UploadCloud className="size-4 mr-2" />
                Tải thêm ảnh
              </Button>
              <Button variant="brand" asChild className="w-full sm:w-auto">
                <a href="/search">
                  <Search className="size-4 mr-2" />
                  Đến trang Tìm kiếm
                </a>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
