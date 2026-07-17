import * as React from 'react'
import { useCallback, useRef, useState } from 'react'
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
import type { UserUploadResult, BatchProgressEvent } from '@/services/userUploadService'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'

// ============================================================
// Constants
// ============================================================

const MAX_FILES = 1000
const BATCH_SIZE = 5
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']

// ============================================================
// Helpers
// ============================================================




function calcTotalBatches(count: number) {
  return Math.ceil(count / BATCH_SIZE)
}

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
  const [isDragActive, setIsDragActive] = useState(false)
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

      {/* Icon */}
      <div
        className={cn(
          'flex items-center justify-center size-16 sm:size-20 rounded-2xl mb-5 transition-all duration-300',
          isDragActive
            ? 'bg-primary/20 text-primary scale-110'
            : 'bg-muted/60 text-muted-foreground',
        )}
      >
        <UploadCloud className="size-8 sm:size-10" strokeWidth={1.5} />
      </div>

      {/* Text */}
      <p className="font-bold text-base sm:text-lg text-foreground mb-1 text-center">
        {isDragActive ? 'Thả ảnh vào đây!' : 'Kéo & thả ảnh vào đây'}
      </p>
      <p className="text-sm text-muted-foreground text-center mb-4">
        hoặc{' '}
        <span className="text-primary font-semibold underline-offset-2 hover:underline">
          bấm để chọn ảnh
        </span>{' '}
        từ thiết bị
      </p>

      {/* Constraints */}
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
// UploadProgress — batch progress bar with status text
// ============================================================

interface UploadProgressProps {
  batchIndex: number
  totalBatches: number
  percent: number
  isCancelled: boolean
}

function UploadProgress({ batchIndex, totalBatches, percent, isCancelled }: UploadProgressProps) {
  const isDone = percent === 100

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {isCancelled
            ? '⛔ Đã huỷ — dừng sau batch hiện tại'
            : isDone
              ? '✅ Hoàn tất tất cả batch'
              : `Đang xử lý batch ${batchIndex} / ${totalBatches}`}
        </span>
        <span className="font-semibold tabular-nums">{percent}%</span>
      </div>
      <div className="h-2.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500 ease-out',
            isCancelled
              ? 'bg-amber-500'
              : isDone
                ? 'bg-emerald-500'
                : 'gradient-brand',
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

// ============================================================
// LiveResultList — accumulates results in real time
// ============================================================

interface LiveResultListProps {
  results: UserUploadResult[]
}

function LiveResultList({ results }: LiveResultListProps) {
  if (results.length === 0) return null

  const successCount = results.filter((r) => r.success).length
  const failCount = results.length - successCount

  return (
    <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/50 bg-muted/20">
        <h3 className="font-bold text-foreground flex items-center gap-2 text-sm">
          <CheckCircle2 className="size-4 text-emerald-500" />
          Kết quả ({results.length} ảnh đã xử lý)
        </h3>
        <div className="flex gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
            {successCount} thành công
          </span>
          {failCount > 0 && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-500/10 text-red-600 border border-red-500/20">
              {failCount} thất bại
            </span>
          )}
        </div>
      </div>

      {/* List — latest results at top */}
      <div className="divide-y divide-border/40 max-h-64 overflow-y-auto">
        {[...results].reverse().map((result, idx) => (
          <div key={idx} className="flex items-center gap-3 px-5 py-2.5 text-sm">
            {result.success ? (
              <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
            ) : (
              <AlertCircle className="size-4 text-destructive shrink-0" />
            )}
            <span className="flex-1 font-medium text-foreground truncate" title={result.filename}>
              {result.filename}
            </span>
            {result.success ? (
              <span className="text-xs text-muted-foreground whitespace-nowrap">Đã thêm ✓</span>
            ) : (
              <span
                className="text-xs text-destructive truncate max-w-[180px]"
                title={result.error}
              >
                {result.error || 'Lỗi không xác định'}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// UserUploadPage
// ============================================================

export function UserUploadPage() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isCancelled, setIsCancelled] = useState(false)

  // Progress state
  const [batchIndex, setBatchIndex] = useState(0)
  const [totalBatches, setTotalBatches] = useState(0)
  const [percent, setPercent] = useState(0)

  // Results accumulate in real-time
  const [liveResults, setLiveResults] = useState<UserUploadResult[]>([])
  const [totalUploaded, setTotalUploaded] = useState(0)

  const abortControllerRef = useRef<AbortController | null>(null)
  const toast = useToast()

  // ── File selection ────────────────────────────────────────

  const handleFilesSelected = (newFiles: File[]) => {
    // Reset results when picking fresh files (only if not mid-upload)
    if (!isUploading && liveResults.length > 0) setLiveResults([])

    setSelectedFiles((prev) => {
      const combined = [...prev, ...newFiles]
      // Deduplicate by name + size
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

  // ── Cancel ────────────────────────────────────────────────

  const handleCancel = () => {
    abortControllerRef.current?.abort()
    setIsCancelled(true)
  }

  // ── Upload ────────────────────────────────────────────────

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return

    const batches = calcTotalBatches(selectedFiles.length)
    setIsUploading(true)
    setIsCancelled(false)
    setPercent(0)
    setBatchIndex(0)
    setTotalBatches(batches)
    setLiveResults([])

    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      const allResults = await uploadUserImages(
        selectedFiles,
        (event: BatchProgressEvent) => {
          setBatchIndex(event.batchIndex)
          setPercent(event.percent)
          setLiveResults((prev) => [...prev, ...event.batchResults])
        },
        controller.signal,
      )

      const successCount = allResults.filter((r) => r.success).length
      const failCount = allResults.length - successCount
      const wasCancelled = controller.signal.aborted

      setTotalUploaded((n) => n + successCount)
      setSelectedFiles([])

      if (wasCancelled) {
        toast.warning(`Đã huỷ. ${successCount} ảnh đã được upload thành công trước khi dừng.`)
      } else if (failCount === 0) {
        toast.success(`${successCount} ảnh đã được thêm vào thư viện thành công 🎉`)
      } else if (successCount === 0) {
        toast.error('Tất cả ảnh đều upload thất bại. Vui lòng thử lại.')
      } else {
        toast.warning(`${successCount} ảnh thành công, ${failCount} ảnh thất bại.`)
      }
    } catch (error: any) {
      // AbortError is expected when user cancels — don't show a generic error toast
      if (error?.name === 'AbortError' || error?.code === 'ERR_CANCELED') {
        // handled above via signal.aborted check
      } else {
        console.error('Upload error:', error)
        toast.error(error?.response?.data?.message || 'Có lỗi xảy ra. Vui lòng thử lại.')
      }
    } finally {
      setIsUploading(false)
      setPercent(100)
    }
  }

  const isIdle = !isUploading && liveResults.length === 0
  const isDone = !isUploading && liveResults.length > 0
  const batches = calcTotalBatches(selectedFiles.length)

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
        {totalUploaded > 0 && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="size-4 text-emerald-500" />
            <span>
              Phiên này đã tải lên thành công{' '}
              <strong className="text-foreground">{totalUploaded.toLocaleString()}</strong> ảnh
            </span>
          </div>
        )}

        {/* ── How it works ── */}
        {isIdle && <HowItWorksBanner />}

        {/* ── Drop zone (hide while uploading or done) ── */}
        {!isUploading && (
          <UploadDropZone
            onFilesSelected={handleFilesSelected}
            disabled={isUploading}
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
                  {selectedFiles.length > BATCH_SIZE && (
                    <span className="ml-1 text-muted-foreground font-normal">
                      ({batches} batch × {BATCH_SIZE} ảnh)
                    </span>
                  )}
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

            {/* Thumbnail grid — cap at 60 previews for performance */}
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
                  {/* Remove button */}
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
                Sẽ gửi tuần tự {batches} batch × {BATCH_SIZE} ảnh — ảnh được xử lý ngay khi từng
                batch hoàn tất
              </p>
            </div>
          </div>
        )}

        {/* ── Uploading state ── */}
        {isUploading && (
          <div className="rounded-2xl border border-border/60 bg-card p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Loader2 className="size-4 animate-spin text-primary" />
                <span className="font-semibold text-foreground text-sm">
                  Đang upload {selectedFiles.length.toLocaleString()} ảnh...
                </span>
              </div>
              <Button
                id="user-upload-cancel"
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={isCancelled}
                className="text-destructive border-destructive/40 hover:bg-destructive/10 gap-1.5"
              >
                <StopCircle className="size-3.5" />
                {isCancelled ? 'Đang dừng...' : 'Huỷ'}
              </Button>
            </div>

            <UploadProgress
              batchIndex={batchIndex}
              totalBatches={totalBatches}
              percent={percent}
              isCancelled={isCancelled}
            />

            {/* Live results while uploading */}
            {liveResults.length > 0 && <LiveResultList results={liveResults} />}
          </div>
        )}

        {/* ── Done: full results + next action ── */}
        {isDone && (
          <div className="space-y-4">
            <LiveResultList results={liveResults} />

            <div className="flex flex-col sm:flex-row items-center gap-3">
              {/* Upload more */}
              <Button
                variant="outline"
                onClick={() => {
                  setLiveResults([])
                  setIsCancelled(false)
                  setPercent(0)
                  setBatchIndex(0)
                  setTotalBatches(0)
                }}
                className="w-full sm:w-auto"
              >
                <UploadCloud className="size-4 mr-2" />
                Tải thêm ảnh
              </Button>

              {/* Go search */}
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
