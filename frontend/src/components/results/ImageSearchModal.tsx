import * as React from 'react'
import {
  CloudUpload,
  ImageIcon,
  X,
  AlertCircle,
  CheckCircle2,
  Crop,
  Loader2,
  RefreshCw,
  Trash2,
  Search,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { CropModal } from '@/components/search/CropModal'
import { useToast } from '@/components/ui/Toast'

// ============================================================
// ImageSearchModal — Full-featured modal for image search
// Handles: upload, drag-drop, preview, crop, replace, clear
// ============================================================

interface ImageSearchModalProps {
  /** Called when user confirms with a file */
  onConfirm: (file: File, previewUrl: string) => void
  onClose: () => void
  /** Pre-populated image (when user already has one selected) */
  initialFile?: File | null
  initialPreviewUrl?: string | null
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE_MB = 10
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024

// ── Progress bar simulation ───────────────────────────────────
function useProgressSimulation() {
  const [progress, setProgress] = React.useState<number | null>(null)

  const simulate = (onDone: () => void) => {
    setProgress(0)
    let prog = 0
    const step = () => {
      prog += Math.random() * 25 + 10
      if (prog >= 100) {
        setProgress(100)
        setTimeout(() => {
          setProgress(null)
          onDone()
        }, 200)
      } else {
        setProgress(Math.min(prog, 98))
        setTimeout(step, 80)
      }
    }
    setTimeout(step, 60)
  }

  return { progress, simulate }
}

export function ImageSearchModal({
  onConfirm,
  onClose,
  initialFile = null,
  initialPreviewUrl = null,
}: ImageSearchModalProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = React.useState(false)
  const [preview, setPreview] = React.useState<string | null>(initialPreviewUrl)
  const [originalPreview, setOriginalPreview] = React.useState<string | null>(initialPreviewUrl)
  const [currentFile, setCurrentFile] = React.useState<File | null>(initialFile)
  const [fileName, setFileName] = React.useState<string | null>(initialFile?.name ?? null)
  const [error, setError] = React.useState<string | null>(null)
  const [showCrop, setShowCrop] = React.useState(false)
  const { progress, simulate } = useProgressSimulation()
  const { info: toastInfo } = useToast()

  // Prevent background scroll when open
  React.useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Close on Escape
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // ── File processing ───────────────────────────────────────
  const processFile = (file: File) => {
    setError(null)
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Chỉ hỗ trợ JPG, PNG, WebP.')
      return
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError(`Dung lượng vượt ${MAX_SIZE_MB}MB. File của bạn: ${(file.size / 1024 / 1024).toFixed(1)}MB`)
      return
    }
    const url = URL.createObjectURL(file)
    simulate(() => {
      setCurrentFile(file)
      setOriginalPreview(url)
      setPreview(url)
      setFileName(file.name)
    })
  }

  // ── Drag & Drop ───────────────────────────────────────────
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = e.dataTransfer.files
    if (!files.length) return
    if (files.length > 1) toastInfo('Chỉ sử dụng 1 ảnh, đã chọn ảnh đầu tiên.')
    processFile(files[0])
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    e.target.value = ''
  }

  // ── Clear ─────────────────────────────────────────────────
  const handleClear = () => {
    if (preview && preview !== originalPreview) URL.revokeObjectURL(preview)
    if (originalPreview) URL.revokeObjectURL(originalPreview)
    setPreview(null)
    setOriginalPreview(null)
    setCurrentFile(null)
    setFileName(null)
    setError(null)
  }

  // ── Crop ─────────────────────────────────────────────────
  const handleCropApply = (croppedFile: File, croppedUrl: string) => {
    setShowCrop(false)
    if (preview && preview !== originalPreview) URL.revokeObjectURL(preview)
    setPreview(croppedUrl)
    setCurrentFile(croppedFile)
    setFileName(croppedFile.name)
  }

  // ── Confirm ──────────────────────────────────────────────
  const handleConfirm = () => {
    if (!currentFile || !preview) return
    onConfirm(currentFile, preview)
    onClose()
  }

  return (
    <>
      {/* ── Backdrop ── */}
      <div
        className="fixed inset-0 z-[var(--z-overlay,800)] bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden
      />

      {/* ── Modal panel ── */}
      <div
        role="dialog"
        aria-modal
        aria-label="Chọn ảnh tìm kiếm"
        className={cn(
          'fixed z-[var(--z-modal,900)] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
          'w-full max-w-lg mx-auto',
          'flex flex-col rounded-2xl overflow-hidden shadow-2xl animate-scale-in-spring',
          'bg-background border border-border/60',
          'max-h-[90vh]',
        )}
        style={{ margin: '1rem' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50 shrink-0">
          <div className="flex items-center gap-2">
            <div className="size-7 rounded-lg gradient-brand flex items-center justify-center">
              <ImageIcon className="size-4 text-white" />
            </div>
            <span className="text-sm font-bold text-foreground">Tìm kiếm bằng hình ảnh</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Đóng"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Progress state */}
          {progress !== null && (
            <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 min-h-[200px] px-6">
              <Loader2 className="size-8 text-primary animate-spin" />
              <div className="w-full space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Đang tải lên...</span>
                  <span className="font-mono font-semibold text-primary">{Math.round(progress)}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full gradient-brand transition-all duration-150"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Preview state */}
          {progress === null && preview && (
            <div className="space-y-4 animate-scale-in">
              {/* Image preview */}
              <div className="relative rounded-xl overflow-hidden border border-border/60 bg-muted/20">
                <img
                  src={preview}
                  alt="Preview ảnh tìm kiếm"
                  className="w-full max-h-64 object-contain"
                />
              </div>

              {/* File info */}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CheckCircle2 className="size-4 text-green-500 shrink-0" />
                <span className="truncate font-medium">{fileName}</span>
              </div>

              {/* Action toolbar */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className={cn(
                    'flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl',
                    'border border-border/60 bg-background hover:bg-muted',
                    'text-sm font-medium text-foreground transition-all duration-150',
                  )}
                >
                  <RefreshCw className="size-4 shrink-0" />
                  Đổi ảnh
                </button>
                <button
                  type="button"
                  onClick={() => setShowCrop(true)}
                  className={cn(
                    'flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl',
                    'border border-border/60 bg-background hover:bg-muted',
                    'text-sm font-medium text-foreground transition-all duration-150',
                  )}
                >
                  <Crop className="size-4 shrink-0" />
                  Crop
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  className={cn(
                    'flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl',
                    'border border-destructive/25 bg-destructive/5 hover:bg-destructive/10',
                    'text-sm font-medium text-destructive transition-all duration-150',
                  )}
                >
                  <Trash2 className="size-4 shrink-0" />
                  Xoá
                </button>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 text-xs text-destructive animate-fade-slide-down">
                  <AlertCircle className="size-3.5 shrink-0" />
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Drop zone (empty state) */}
          {progress === null && !preview && (
            <div className="space-y-3">
              <div
                role="button"
                tabIndex={0}
                aria-label="Upload zone — click hoặc kéo thả ảnh"
                onClick={() => inputRef.current?.click()}
                onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                className={cn(
                  'relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed',
                  'min-h-[200px] cursor-pointer transition-all duration-300',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isDragging
                    ? 'border-primary bg-primary/5 scale-[1.01]'
                    : 'border-border/60 bg-muted/20 hover:border-primary/60 hover:bg-primary/3',
                )}
              >
                {isDragging && (
                  <div className="absolute inset-0 rounded-2xl animate-upload-pulse pointer-events-none" />
                )}
                <div
                  className={cn(
                    'h-14 w-14 rounded-2xl flex items-center justify-center transition-all duration-300',
                    isDragging
                      ? 'gradient-brand scale-110 shadow-brand glow-brand'
                      : 'bg-muted border border-border/60',
                  )}
                >
                  {isDragging ? (
                    <CloudUpload className="size-7 text-white animate-bounce" />
                  ) : (
                    <ImageIcon className="size-7 text-muted-foreground" />
                  )}
                </div>
                <div className="text-center space-y-1">
                  {isDragging ? (
                    <p className="text-sm font-semibold text-primary animate-fade-in">Thả ảnh vào đây!</p>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-foreground">Kéo thả ảnh vào đây</p>
                      <p className="text-xs text-muted-foreground">
                        hoặc{' '}
                        <span className="text-primary font-semibold underline underline-offset-2">click để chọn file</span>
                      </p>
                      <p className="text-xs text-muted-foreground/70">JPG, PNG, WebP · Tối đa {MAX_SIZE_MB}MB</p>
                    </>
                  )}
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 text-xs text-destructive animate-fade-slide-down">
                  <AlertCircle className="size-3.5 shrink-0" />
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="shrink-0 px-5 py-4 border-t border-border/50 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-border/60 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200"
          >
            Huỷ
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!currentFile || !preview || progress !== null}
            className={cn(
              'flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200',
              'gradient-brand text-white shadow-brand hover:glow-brand active:scale-[0.98]',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            <Search className="size-4" />
            Tìm kiếm
          </button>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Crop modal (nested) */}
      {showCrop && originalPreview && (
        <CropModal
          imageSrc={originalPreview}
          onApply={handleCropApply}
          onCancel={() => setShowCrop(false)}
        />
      )}
    </>
  )
}
