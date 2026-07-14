import * as React from 'react'
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { X, Crop as CropIcon, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================================
// CropModal — react-image-crop overlay
// Opens when user clicks "Crop" after uploading an image.
// Allows free resizing of the crop box and dragging to edges.
// ============================================================

interface CropModalProps {
  imageSrc: string
  onApply: (croppedFile: File, croppedUrl: string) => void
  onCancel: () => void
}

// ── Helper: get cropped image as File ────────────────────────
async function getCroppedImg(
  imageElement: HTMLImageElement,
  crop: PixelCrop,
  fileName: string
): Promise<{ file: File; url: string }> {
  const canvas = document.createElement('canvas')
  const scaleX = imageElement.naturalWidth / imageElement.width
  const scaleY = imageElement.naturalHeight / imageElement.height
  
  canvas.width = crop.width * scaleX
  canvas.height = crop.height * scaleY
  
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No 2d context')

  ctx.imageSmoothingQuality = 'high'

  const cropX = crop.x * scaleX
  const cropY = crop.y * scaleY
  const cropWidth = crop.width * scaleX
  const cropHeight = crop.height * scaleY

  ctx.drawImage(
    imageElement,
    cropX,
    cropY,
    cropWidth,
    cropHeight,
    0,
    0,
    cropWidth,
    cropHeight
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Canvas is empty'))
        return
      }
      const file = new File([blob], fileName, { type: 'image/jpeg' })
      resolve({ file, url: URL.createObjectURL(blob) })
    }, 'image/jpeg', 0.95)
  })
}

export function CropModal({ imageSrc, onApply, onCancel }: CropModalProps) {
  const [crop, setCrop] = React.useState<Crop>()
  const [completedCrop, setCompletedCrop] = React.useState<PixelCrop>()
  const imgRef = React.useRef<HTMLImageElement>(null)
  const [isProcessing, setIsProcessing] = React.useState(false)

  // Prevent background scroll
  React.useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Close on Escape
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onCancel])

  const handleApply = async () => {
    if (!completedCrop || !imgRef.current) return
    setIsProcessing(true)
    try {
      const { file, url } = await getCroppedImg(imgRef.current, completedCrop, 'cropped.jpg')
      onApply(file, url)
    } catch (err) {
      console.error('Crop failed:', err)
    } finally {
      setIsProcessing(false)
    }
  }

  // Initialize crop to whole image on load
  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget
    setCrop({
      unit: '%',
      x: 10,
      y: 10,
      width: 80,
      height: 80
    })
  }

  return (
    <>
      {/* ── Backdrop ── */}
      <div
        className="fixed inset-0 z-[var(--z-overlay,800)] bg-black/80 backdrop-blur-sm animate-fade-in"
        onClick={onCancel}
        aria-hidden
      />

      {/* ── Modal ── */}
      <div
        role="dialog"
        aria-modal
        aria-label="Cắt ảnh"
        className={cn(
          'fixed z-[var(--z-modal,900)] inset-4 md:inset-10 lg:inset-20',
          'flex flex-col rounded-2xl overflow-hidden shadow-2xl animate-scale-in-spring',
          'bg-[#111] border border-white/10',
          'max-w-3xl mx-auto my-auto',
        )}
        style={{ maxHeight: 'calc(100vh - 2rem)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2 text-white">
            <CropIcon className="size-4" />
            <span className="text-sm font-semibold">Cắt ảnh</span>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Đóng"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Crop area */}
        <div className="relative flex-1 bg-black flex items-center justify-center p-4 overflow-hidden">
          <ReactCrop
            crop={crop}
            onChange={(_, percentCrop) => setCrop(percentCrop)}
            onComplete={(c) => setCompletedCrop(c)}
            className="max-h-full max-w-full"
          >
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Crop target"
              onLoad={onImageLoad}
              className="max-h-full object-contain"
              style={{ maxHeight: 'calc(100vh - 12rem)' }}
            />
          </ReactCrop>
        </div>

        {/* Footer controls */}
        <div className="shrink-0 px-5 py-4 border-t border-white/10 bg-[#1a1a1a] flex justify-end items-center gap-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl border border-white/20 text-white/70 hover:text-white hover:bg-white/10 text-sm font-medium transition-all duration-200"
          >
            Huỷ
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={isProcessing || !completedCrop?.width || !completedCrop?.height}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200',
              'gradient-brand text-white shadow-brand hover:glow-brand active:scale-[0.98]',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            {isProcessing ? (
              <span className="size-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
            ) : (
              <Check className="size-4" />
            )}
            Áp dụng cắt
          </button>
        </div>
      </div>
    </>
  )
}
