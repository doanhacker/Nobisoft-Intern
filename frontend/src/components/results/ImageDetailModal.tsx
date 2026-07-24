import * as React from 'react'
import { X, Download, Search, ExternalLink, FileText, Maximize2, Ruler } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SearchResult } from './MasonryGrid'

// ============================================================
// ImageDetailModal — Full-screen detail view (FR-04.3)
// ============================================================

interface ImageDetailModalProps {
  result: SearchResult | null
  onClose: () => void
  onSearchSimilar: (result: SearchResult) => void
}

export function ImageDetailModal({ result, onClose, onSearchSimilar }: ImageDetailModalProps) {
  const [imageLoaded, setImageLoaded] = React.useState(false)

  // Reset on new image
  React.useEffect(() => {
    setImageLoaded(false)
  }, [result?.id])

  // Close on Escape
  React.useEffect(() => {
    if (!result) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [result, onClose])

  // Prevent body scroll when open without losing scroll position
  React.useEffect(() => {
    if (!result) return
    const scrollY = window.scrollY
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
      window.scrollTo({ top: scrollY, behavior: 'instant' })
    }
  }, [result])

  if (!result) return null

  const score = Math.round(result.similarityScore * 100)
  const scoreClass =
    result.similarityScore >= 0.8
      ? 'text-green-500 bg-green-500/10 border-green-500/30'
      : result.similarityScore >= 0.5
        ? 'text-amber-500 bg-amber-500/10 border-amber-500/30'
        : 'text-muted-foreground bg-muted border-border'

  return (
    <>
      {/* ── Backdrop ── */}
      <div
        className="fixed inset-0 z-[var(--z-overlay)] bg-black/70 backdrop-blur-md animate-fade-in"
        onClick={onClose}
        aria-hidden
      />

      {/* ── Modal panel ── */}
      <div
        role="dialog"
        aria-modal
        aria-label="Image detail"
        className={cn(
          'fixed z-[var(--z-modal)] inset-2 sm:inset-4 md:inset-8 lg:inset-12',
          'flex flex-col md:flex-row rounded-2xl overflow-hidden shadow-2xl animate-scale-in-spring',
          'bg-background border border-border/60',
          'max-w-5xl mx-auto my-auto',
        )}
        style={{ maxHeight: 'calc(100vh - 1rem)' }}
      >
        {/* ── Top/Left: Image ── */}
        <div className="relative flex-1 bg-black/40 flex items-center justify-center min-h-[40vh] md:min-h-0 overflow-hidden">
          {!imageLoaded && (
            <div className="absolute inset-0 animate-shimmer rounded-t-2xl md:rounded-tl-2xl md:rounded-tr-none" />
          )}
          <img
            src={result.fullUrl ?? result.thumbnailUrl}
            alt={result.title ?? 'Search result'}
            className={cn(
              'max-w-full max-h-full object-contain transition-opacity duration-400',
              imageLoaded ? 'opacity-100' : 'opacity-0',
            )}
            onLoad={() => setImageLoaded(true)}
          />

          {/* Zoom hint */}
          <a
            href={result.fullUrl ?? result.thumbnailUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute top-3 right-3 p-2 rounded-lg bg-black/40 hover:bg-black/60 backdrop-blur-sm text-white transition-colors"
            title="Mở ảnh gốc"
          >
            <Maximize2 className="size-4" />
          </a>
        </div>

        {/* ── Right/Bottom: Info panel ── */}
        <div className="w-full md:w-80 md:shrink-0 flex flex-col border-t md:border-t-0 md:border-l border-border/50 overflow-y-auto max-h-[55vh] md:max-h-none">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border/50">
            <h2 className="text-sm font-bold text-foreground">Chi tiết ảnh</h2>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Đóng"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 p-4 space-y-5">
            {/* Similarity score */}
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Độ tương đồng
              </p>
              <div className="flex items-center gap-2">
                <div
                  className={cn('px-3 py-1 rounded-full text-sm font-bold border', scoreClass)}
                >
                  {score}%
                </div>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 gradient-brand"
                    style={{ width: `${score}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Title */}
            {result.title && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Tiêu đề
                </p>
                <p className="text-sm text-foreground leading-relaxed">{result.title}</p>
              </div>
            )}

            {/* Dimensions */}
            {(result.width || result.height) && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Ruler className="size-3" /> Kích thước
                </p>
                <p className="text-sm font-mono text-foreground">
                  {result.width} × {result.height}px
                </p>
              </div>
            )}

            {/* Source */}
            {result.source && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Nguồn
                </p>
                <a
                  href={result.source}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline underline-offset-2 flex items-center gap-1"
                >
                  <ExternalLink className="size-3" />
                  {result.source.length > 40 ? result.source.slice(0, 40) + '…' : result.source}
                </a>
              </div>
            )}

            {/* OCR text */}
            {result.ocrText && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <FileText className="size-3" /> Chữ trong ảnh (OCR)
                </p>
                <div className="p-3 rounded-lg bg-muted/60 border border-border/60 text-sm font-mono text-foreground leading-relaxed whitespace-pre-wrap">
                  {result.ocrText}
                </div>
              </div>
            )}
          </div>

          {/* ── Action buttons ── */}
          <div className="p-4 border-t border-border/50 space-y-2">
            {/* Search similar — primary CTA */}
            <button
              type="button"
              onClick={() => {
                onSearchSimilar(result)
                onClose()
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl gradient-brand text-white text-sm font-semibold shadow-brand hover:glow-brand transition-all duration-200 active:scale-[0.98]"
            >
              <Search className="size-4" />
              Tìm ảnh tương tự
            </button>

            {/* Download */}
            <button
              type="button"
              onClick={async () => {
                const url = result.fullUrl ?? result.thumbnailUrl;
                if (!url) return;
                try {
                  const response = await fetch(url);
                  const blob = await response.blob();
                  const blobUrl = window.URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = blobUrl;
                  link.download = url.split('/').pop() || 'download.jpg';
                  document.body.appendChild(link);
                  link.click();
                  link.remove();
                  window.URL.revokeObjectURL(blobUrl);
                } catch (error) {
                  console.error('Download failed:', error);
                  window.open(url, '_blank');
                }
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-border/60 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all duration-200 cursor-pointer"
            >
              <Download className="size-4" />
              Tải xuống
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
