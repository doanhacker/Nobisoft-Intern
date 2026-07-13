import * as React from 'react'
import { CloudUpload, ImageIcon, X, AlertCircle, CheckCircle2, Crop, Loader2, RefreshCw, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CropModal } from './CropModal'
import { useToast } from '@/components/ui/Toast'

// ============================================================
// ImageUploadZone — Drag & Drop + click to upload (spec 3.1)
// - Validate: JPG/PNG/WebP, max 10MB (FR-02)
// - Progress bar simulation on file select
// - Crop button → CropModal (cancel preserves original — alternate path)
// - Multiple files drop → toast info, pick first only
// ============================================================

interface ImageUploadZoneProps {
  onImageSelect: (file: File, previewUrl: string) => void
  onClear?: () => void
  className?: string
  disabled?: boolean
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE_MB = 10
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024

export function ImageUploadZone({
  onImageSelect,
  onClear,
  className,
  disabled = false,
}: ImageUploadZoneProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = React.useState(false)
  const [preview, setPreview] = React.useState<string | null>(null)
  const [originalFile, setOriginalFile] = React.useState<File | null>(null)
  const [originalPreview, setOriginalPreview] = React.useState<string | null>(null)
  const [fileName, setFileName] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = React.useState<number | null>(null) // null = not uploading
  const [showCropModal, setShowCropModal] = React.useState(false)
  const { info: toastInfo } = useToast()

  // Cleanup object URLs on unmount
  React.useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])

  // ── Simulate progress bar (0→100% over ~600ms) ─────────────
  const simulateProgress = (onDone: () => void) => {
    setUploadProgress(0)
    let prog = 0
    const step = () => {
      prog += Math.random() * 25 + 10
      if (prog >= 100) {
        setUploadProgress(100)
        setTimeout(() => {
          setUploadProgress(null)
          onDone()
        }, 200)
      } else {
        setUploadProgress(Math.min(prog, 98))
        setTimeout(step, 80)
      }
    }
    setTimeout(step, 60)
  }

  // ── Core: validate + set preview ───────────────────────────
  const processFile = (file: File) => {
    setError(null)

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Chỉ hỗ trợ JPG, PNG, WebP. Định dạng của bạn không được chấp nhận.')
      return
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError(`Dung lượng vượt quá ${MAX_SIZE_MB}MB. File của bạn: ${(file.size / 1024 / 1024).toFixed(1)}MB`)
      return
    }

    const url = URL.createObjectURL(file)

    // Simulate progress bar then reveal preview
    simulateProgress(() => {
      setOriginalFile(file)
      setOriginalPreview(url)
      setPreview(url)
      setFileName(file.name)
      onImageSelect(file, url)
    })
  }

  // ── Drag & Drop handlers ────────────────────────────────────
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (disabled) return

    const files = e.dataTransfer.files
    if (!files.length) return

    // Alternate path: multiple files → toast + pick first only
    if (files.length > 1) {
      toastInfo('Hiện chỉ hỗ trợ tìm kiếm với 1 ảnh, đã chọn ảnh đầu tiên.')
    }

    processFile(files[0])
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    e.target.value = '' // reset so same file can be re-selected
  }

  // ── Clear ───────────────────────────────────────────────────
  const handleClear = () => {
    if (preview && preview !== originalPreview) URL.revokeObjectURL(preview)
    if (originalPreview) URL.revokeObjectURL(originalPreview)
    setPreview(null)
    setOriginalFile(null)
    setOriginalPreview(null)
    setFileName(null)
    setError(null)
    setUploadProgress(null)
    onClear?.()
  }

  // ── Crop handlers ───────────────────────────────────────────
  const handleCropApply = (croppedFile: File, croppedUrl: string) => {
    setShowCropModal(false)
    if (preview && preview !== originalPreview) URL.revokeObjectURL(preview)
    setPreview(croppedUrl)
    onImageSelect(croppedFile, croppedUrl)
  }

  const handleCropCancel = () => {
    // Spec 3.1 alternate: "Huỷ giữa chừng → giữ nguyên ảnh gốc, không tạo request mới"
    setShowCropModal(false)
    // Restore original if cropped version was active (shouldn't happen here since modal doesn't auto-apply)
  }

  // ── Uploading state (progress bar) ─────────────────────────
  if (uploadProgress !== null) {
    return (
      <div className={cn('flex flex-col gap-3', className)}>
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 min-h-[160px] sm:min-h-[200px] px-6">
          <Loader2 className="size-8 text-primary animate-spin" />
          <div className="w-full space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Đang tải lên...</span>
              <span className="font-mono font-semibold text-primary">{Math.round(uploadProgress)}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full gradient-brand transition-all duration-150"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Preview state (image selected) ─────────────────────────
  if (preview) {
    return (
      <>
        <div className={cn('relative group animate-scale-in', className)}>
          <div className="relative rounded-2xl overflow-hidden border border-border/60 shadow-card">
            <img
              src={preview}
              alt="Preview"
              className="w-full max-h-48 sm:max-h-64 object-contain bg-muted/30"
            />
          </div>

          {/* File info and Action Toolbar */}
          <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
              <CheckCircle2 className="size-4 text-green-500 shrink-0" />
              <span className="truncate font-medium">{fileName}</span>
            </div>
            
            <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/50 bg-background hover:bg-muted text-foreground text-xs sm:text-sm font-medium transition-colors shadow-sm"
              >
                <RefreshCw className="size-3.5 sm:size-4 shrink-0" />
                <span className="whitespace-nowrap">Đổi ảnh</span>
              </button>
              
              <button
                type="button"
                onClick={() => setShowCropModal(true)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/50 bg-background hover:bg-muted text-foreground text-xs sm:text-sm font-medium transition-colors shadow-sm"
              >
                <Crop className="size-3.5 sm:size-4 shrink-0" />
                <span className="whitespace-nowrap">Crop</span>
              </button>
              
              <button
                type="button"
                onClick={handleClear}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-destructive/20 bg-destructive/5 hover:bg-destructive/10 text-destructive text-xs sm:text-sm font-medium transition-colors shadow-sm"
              >
                <Trash2 className="size-3.5 sm:size-4 shrink-0" />
                <span className="whitespace-nowrap">Xoá</span>
              </button>
            </div>
          </div>

          <input ref={inputRef} type="file" accept={ACCEPTED_TYPES.join(',')} className="hidden" onChange={handleFileChange} />
        </div>

        {/* Crop Modal */}
        {showCropModal && originalPreview && (
          <CropModal
            imageSrc={originalPreview}
            onApply={handleCropApply}
            onCancel={handleCropCancel}
          />
        )}
      </>
    )
  }

  // ── Empty / Drop zone ───────────────────────────────────────
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="Upload zone — click or drag image"
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && !disabled && inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          'relative flex flex-col items-center justify-center gap-3 sm:gap-4 rounded-2xl border-2 border-dashed',
          'min-h-[160px] sm:min-h-[200px] cursor-pointer transition-all duration-300',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          !disabled && 'hover:border-primary/60 hover:bg-primary/3',
          isDragging && 'upload-zone-active',
          !isDragging && 'border-border/60 bg-muted/20',
          disabled && 'opacity-50 cursor-not-allowed',
          error && 'border-destructive/60 bg-destructive/5',
        )}
      >
        {/* Background pulse when dragging */}
        {isDragging && (
          <div className="absolute inset-0 rounded-2xl animate-upload-pulse pointer-events-none" />
        )}

        {/* Icon */}
        <div
          className={cn(
            'relative h-12 w-12 sm:h-16 sm:w-16 rounded-2xl flex items-center justify-center transition-all duration-300',
            isDragging
              ? 'gradient-brand scale-110 shadow-brand glow-brand'
              : 'bg-muted border border-border/60',
          )}
        >
          {isDragging ? (
            <CloudUpload className="size-6 sm:size-8 text-white animate-bounce" />
          ) : (
            <ImageIcon className="size-6 sm:size-8 text-muted-foreground" />
          )}
        </div>

        {/* Text */}
        <div className="text-center space-y-1 px-3 sm:px-4">
          {isDragging ? (
            <p className="text-base font-semibold text-primary animate-fade-in">Thả ảnh vào đây!</p>
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

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 text-xs text-destructive animate-fade-slide-down">
          <AlertCircle className="size-3.5 shrink-0" />
          {error}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled}
      />
    </div>
  )
}
