import type { SearchResult } from './MasonryGrid'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================================
// ImageResultCard — Single image tile in masonry grid
// ============================================================

interface ImageResultCardProps {
    result: SearchResult
    onClick: (result: SearchResult) => void
    onSearchSimilar: (result: SearchResult) => void
    /** When true (ADMIN role), renders the similarity % badge */
    showSimilarityBadge?: boolean
    style?: React.CSSProperties
}

/** Returns Tailwind colour classes based on similarity score (0–1) */
function getSimilarityStyle(score: number): { bg: string; text: string; border: string } {
    if (score >= 0.8) {
        return { bg: 'bg-emerald-500/80', text: 'text-white', border: 'border-emerald-400/60' }
    }
    if (score >= 0.6) {
        return { bg: 'bg-sky-500/80', text: 'text-white', border: 'border-sky-400/60' }
    }
    return { bg: 'bg-amber-500/80', text: 'text-white', border: 'border-amber-400/60' }
}

export function ImageResultCard({
    result,
    onClick,
    onSearchSimilar,
    showSimilarityBadge = false,
    style,
}: ImageResultCardProps) {
    const hasSimilarityBadge = showSimilarityBadge && result.similarityScore != null
    const simStyle = hasSimilarityBadge ? getSimilarityStyle(result.similarityScore!) : null

    return (
        <div
            className="group relative rounded-xl overflow-hidden card-hover cursor-pointer shadow-card"
            style={style}
            onClick={() => onClick(result)}
            role="button"
            tabIndex={0}
            aria-label={`View image: ${result.title}`}
            onKeyDown={(e) => e.key === 'Enter' && onClick(result)}
        >
            {/* ── Image ── */}
            <img
                src={result.thumbnailUrl}
                alt={result.title}
                loading="lazy"
                className="w-full h-auto block transition-transform duration-500 group-hover:scale-105"
                style={{ aspectRatio: result.aspectRatio ?? 'auto' }}
            />

            {/* ── Overlay on hover ── */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3 gap-2">
                {/* Title */}
                {result.title && (
                    <p className="text-white text-xs font-medium line-clamp-2 leading-snug">
                        {result.title}
                    </p>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation()
                            onSearchSimilar(result)
                        }}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white text-xs font-semibold transition-colors border border-white/20"
                    >
                        <Search className="size-3" />
                        Tìm tương tự
                    </button>
                </div>
            </div>

            {/* ── Similarity Score Badge — ADMIN only (top-right corner) ── */}
            {hasSimilarityBadge && simStyle && (
                <div
                    className={cn(
                        'absolute top-2 right-2 px-2 py-0.5 rounded-full',
                        'text-[11px] font-bold backdrop-blur-sm border shadow-sm',
                        'transition-opacity duration-200',
                        simStyle.bg, simStyle.text, simStyle.border,
                    )}
                    title={`Độ tương đồng: ${Math.round(result.similarityScore! * 100)}%`}
                >
                    {Math.round(result.similarityScore! * 100)}%
                </div>
            )}

            {/* ── OCR text badge (top-left) ── */}
            {result.ocrText && (
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-black/50 backdrop-blur-sm border border-white/20 text-white">
                    OCR
                </div>
            )}
        </div>
    )
}