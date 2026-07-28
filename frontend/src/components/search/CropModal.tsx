import * as React from 'react'
import * as ReactDOM from 'react-dom'
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { X, Crop as CropIcon, Check, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================================
// CropModal — react-image-crop overlay
// Opens when user clicks "Crop" after uploading an image.
// Allows free resizing of the crop box and dragging to edges.
// z-index: backdrop=1100, panel=1200 — always above ImageSearchModal (900)
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

  ctx.drawImage(
    imageElement,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    crop.width * scaleX,
    crop.height * scaleY
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

// ── Constants ─────────────────────────────────────────────────
// Header ~54px + footer ~76px + crop padding 32px = ~162px.
const CHROME_HEIGHT = 180

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

  const handleReset = () => {
    setCrop({ unit: '%', x: 10, y: 10, width: 80, height: 80 })
    setCompletedCrop(undefined)
  }

  // Initialize crop to 80% of image on load
  const onImageLoad = () => {
    setCrop({ unit: '%', x: 10, y: 10, width: 80, height: 80 })
  }

  // Compute img max-height from current viewport so portrait images always fit
  const imgMaxHeight = `calc(min(92vh, 750px) - ${CHROME_HEIGHT}px)`

  const canApply = !isProcessing && completedCrop?.width && completedCrop?.height

  return ReactDOM.createPortal(
    <>
      {/* ── Backdrop — rendered via portal into document.body, always above everything ── */}
      <div
        className="fixed inset-0 z-[1100] bg-black/85 backdrop-blur-md animate-fade-in"
        onClick={onCancel}
        aria-hidden
      />

      {/* ── Full-screen flex wrapper for reliable centering ── */}
      <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 pointer-events-none">
        <div
          role="dialog"
          aria-modal
          aria-label="Cắt ảnh"
          className={cn(
            'pointer-events-auto',
            'w-[min(90vw,820px)] flex flex-col rounded-2xl overflow-hidden shadow-[0_32px_64px_-12px_rgba(0,0,0,0.9)] animate-scale-in-spring',
            'border border-white/10',
          )}
          style={{
            maxHeight: 'min(90vh, 780px)',
            background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%)',
          }}
        >
          {/* ── Header ── */}
          <div
            className="flex items-center justify-between px-5 py-3.5 shrink-0"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}
          >
            <div className="flex items-center gap-2.5">
              {/* Icon badge */}
              <div className="flex items-center justify-center size-7 rounded-lg gradient-brand shadow-brand">
                <CropIcon className="size-3.5 text-white" />
              </div>
              <div>
                <span className="text-sm font-bold text-white">Cắt ảnh</span>
                <p className="text-[11px] text-white/40 leading-none mt-0.5">Kéo để điều chỉnh vùng cắt</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Reset button */}
              <button
                type="button"
                onClick={handleReset}
                title="Đặt lại vùng cắt"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-white/50 hover:text-white/80 hover:bg-white/8 text-xs font-medium transition-all duration-150"
              >
                <RotateCcw className="size-3.5" />
                Đặt lại
              </button>

              {/* Close button */}
              <button
                type="button"
                onClick={onCancel}
                className="flex items-center justify-center size-7 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all duration-150"
                aria-label="Đóng"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          {/* ── Crop area ── */}
          <div
            className="relative flex-1 min-h-0 flex items-center justify-center overflow-hidden"
            style={{ background: 'radial-gradient(ellipse at center, #1e1e3a 0%, #0a0a12 100%)', padding: '16px' }}
          >
            {/* Subtle grid pattern */}
            <div
              className="absolute inset-0 opacity-[0.04]"
              style={{
                backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
                backgroundSize: '24px 24px',
              }}
            />

            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={(c) => setCompletedCrop(c)}
              style={{ position: 'relative', zIndex: 1 }}
            >
              {/*
               * max-height + max-width with auto width/height.
               * Portrait & landscape images both fit correctly.
               */}
              <img
                ref={imgRef}
                src={imageSrc}
                alt="Crop target"
                onLoad={onImageLoad}
                style={{
                  maxHeight: imgMaxHeight,
                  maxWidth: '100%',
                  width: 'auto',
                  height: 'auto',
                  display: 'block',
                  borderRadius: '8px',
                }}
              />
            </ReactCrop>
          </div>

          {/* ── Footer ── */}
          <div
            className="shrink-0 px-5 py-4 flex items-center justify-between gap-4"
            style={{ borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.3)' }}
          >
            {/* Crop info */}
            <div className="text-xs text-white/30 font-mono">
              {completedCrop?.width && completedCrop?.height
                ? `${Math.round(completedCrop.width)} × ${Math.round(completedCrop.height)} px`
                : 'Chọn vùng cắt'}
            </div>

            <div className="flex items-center gap-2.5">
              {/* Cancel */}
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 rounded-xl border border-white/15 text-white/60 hover:text-white hover:bg-white/8 text-sm font-medium transition-all duration-150"
              >
                Huỷ
              </button>

              {/* Apply */}
              <button
                type="button"
                onClick={handleApply}
                disabled={!canApply}
                className={cn(
                  'flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200',
                  'gradient-brand text-white shadow-brand',
                  canApply ? 'hover:glow-brand active:scale-[0.97]' : 'opacity-40 cursor-not-allowed',
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
      </div>
    </>,
    document.body,
  )
}
