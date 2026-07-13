import * as React from 'react'
import Cropper from 'react-easy-crop'
import type { Area } from 'react-easy-crop'
import { X, Crop, Check, ZoomIn, ZoomOut } from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================================
// CropModal — react-easy-crop overlay (spec 3.1)
// Opens when user clicks "Crop" after uploading an image.
// Alternate path: Cancel → preserve original, no new request.
// ============================================================

interface CropModalProps {
  imageSrc: string
  onApply: (croppedFile: File, croppedUrl: string) => void
  onCancel: () => void
}

// ── Helper: get cropped image as File ────────────────────────
async function getCroppedImage(imageSrc: string, cropArea: Area): Promise<{ file: File; url: string }> {
  const image = await createImageBitmap(await (await fetch(imageSrc)).blob())
  const canvas = document.createElement('canvas')
  canvas.width = cropArea.width
  canvas.height = cropArea.height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(image, cropArea.x, cropArea.y, cropArea.width, cropArea.height, 0, 0, cropArea.width, cropArea.height)
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) throw new Error('Canvas is empty')
      const file = new File([blob], 'cropped.jpg', { type: 'image/jpeg' })
      resolve({ file, url: URL.createObjectURL(blob) })
    }, 'image/jpeg', 0.92)
  })
}

export function CropModal({ imageSrc, onApply, onCancel }: CropModalProps) {
  const [crop, setCrop] = React.useState({ x: 0, y: 0 })
  const [zoom, setZoom] = React.useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = React.useState<Area | null>(null)
  const [isProcessing, setIsProcessing] = React.useState(false)

  // Prevent background scroll
  React.useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Close on Escape (spec: "Huỷ giữa chừng → giữ nguyên ảnh gốc")
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onCancel])

  const handleCropComplete = (_: Area, pixelCrop: Area) => {
    setCroppedAreaPixels(pixelCrop)
  }

  const handleApply = async () => {
    if (!croppedAreaPixels) return
    setIsProcessing(true)
    try {
      const { file, url } = await getCroppedImage(imageSrc, croppedAreaPixels)
      onApply(file, url)
    } catch (err) {
      console.error('Crop failed:', err)
    } finally {
      setIsProcessing(false)
    }
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
            <Crop className="size-4" />
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
        <div className="relative flex-1 bg-black">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={undefined} // free crop
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={handleCropComplete}
            style={{
              containerStyle: { background: '#111' },
            }}
          />
        </div>

        {/* Footer controls */}
        <div className="shrink-0 px-5 py-4 border-t border-white/10 bg-[#1a1a1a] flex items-center gap-4">
          {/* Zoom control */}
          <div className="flex items-center gap-2 flex-1">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(1, z - 0.2))}
              className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Thu nhỏ"
            >
              <ZoomOut className="size-4" />
            </button>
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 accent-primary"
              aria-label="Zoom"
            />
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
              className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Phóng to"
            >
              <ZoomIn className="size-4" />
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
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
              disabled={isProcessing || !croppedAreaPixels}
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
      </div>
    </>
  )
}
