import * as React from 'react'
import { CloudUpload, ImageIcon, X, AlertCircle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================================
// ImageUploadZone — Drag & Drop + click to upload
// Supports JPG, PNG, WebP. Max 10MB (per FR-02)
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
  const [fileName, setFileName] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  // Cleanup object URL on unmount
  React.useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])

  const processFile = (file: File) => {
    setError(null)

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Chỉ hỗ trợ JPG, PNG, WebP.')
      return
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError(`Kích thước tối đa ${MAX_SIZE_MB}MB. File của bạn: ${(file.size / 1024 / 1024).toFixed(1)}MB`)
      return
    }

    const url = URL.createObjectURL(file)
    setPreview(url)
    setFileName(file.name)
    onImageSelect(file, url)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (disabled) return
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    // reset so same file can be re-selected
    e.target.value = ''
  }

  const handleClear = () => {
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
    setFileName(null)
    setError(null)
    onClear?.()
  }

  // ── Preview state ──
  if (preview) {
    return (
      <div className={cn('relative group animate-scale-in', className)}>
        <div className="relative rounded-2xl overflow-hidden border border-border/60 shadow-card">
          <img
            src={preview}
            alt="Preview"
            className="w-full max-h-64 object-contain bg-muted/30"
          />
          {/* Overlay on hover */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="px-3 py-1.5 rounded-lg bg-white/20 backdrop-blur-sm border border-white/30 text-white text-sm font-medium hover:bg-white/30 transition-colors"
            >
              Đổi ảnh
            </button>
          </div>
        </div>

        {/* File info bar */}
        <div className="mt-2 flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CheckCircle2 className="size-3.5 text-green-500" />
            <span className="truncate max-w-[200px]">{fileName}</span>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
          >
            <X className="size-3.5" /> Xoá
          </button>
        </div>

        <input ref={inputRef} type="file" accept={ACCEPTED_TYPES.join(',')} className="hidden" onChange={handleFileChange} />
      </div>
    )
  }

  // ── Empty / Drop zone state ──
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
          'relative flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed',
          'min-h-[200px] cursor-pointer transition-all duration-300',
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
            'relative h-16 w-16 rounded-2xl flex items-center justify-center transition-all duration-300',
            isDragging
              ? 'gradient-brand scale-110 shadow-brand glow-brand'
              : 'bg-muted border border-border/60',
          )}
        >
          {isDragging ? (
            <CloudUpload className="size-8 text-white animate-bounce" />
          ) : (
            <ImageIcon className="size-8 text-muted-foreground" />
          )}
        </div>

        {/* Text */}
        <div className="text-center space-y-1 px-4">
          {isDragging ? (
            <p className="text-base font-semibold text-primary animate-fade-in">
              Thả ảnh vào đây!
            </p>
          ) : (
            <>
              <p className="text-sm font-semibold text-foreground">
                Kéo thả ảnh vào đây
              </p>
              <p className="text-xs text-muted-foreground">
                hoặc{' '}
                <span className="text-primary font-semibold underline underline-offset-2">
                  click để chọn file
                </span>
              </p>
              <p className="text-xs text-muted-foreground/70">
                JPG, PNG, WebP · Tối đa {MAX_SIZE_MB}MB
              </p>
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
