import * as React from 'react'
import type { SearchResult } from './MasonryGrid'
import { Search, Trash2, AlertTriangle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================================
// ImageResultCard — Single image tile in masonry grid
// ============================================================

interface ImageResultCardProps {
    result: SearchResult
    onClick: (result: SearchResult) => void
    onSearchSimilar?: (result: SearchResult) => void
    onDelete?: (result: SearchResult) => void
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
    onDelete,
    showSimilarityBadge = false,
    style,
}: ImageResultCardProps) {
    const [showConfirm, setShowConfirm] = React.useState(false)
    const [isDeleting, setIsDeleting] = React.useState(false)

    const hasSimilarityBadge = showSimilarityBadge && result.similarityScore != null
    const simStyle = hasSimilarityBadge ? getSimilarityStyle(result.similarityScore!) : null

    const handleConfirmDelete = async (e: React.MouseEvent) => {
        e.stopPropagation()
        setIsDeleting(true)
        try {
            await onDelete?.(result)
        } finally {
            setIsDeleting(false)
            setShowConfirm(false)
        }
    }

    const handleCancelDelete = (e: React.MouseEvent) => {
        e.stopPropagation()
        setShowConfirm(false)
    }

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
                alt={result.title ?? 'Image'}
                loading="lazy"
                className="w-full h-auto block transition-transform duration-500 group-hover:scale-105"
                style={{ aspectRatio: result.aspectRatio ?? 'auto' }}
            />

            {/* ── Overlay on hover ── */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3 gap-2 pointer-events-none">
                {/* Title */}
                {result.title && (
                    <p className="text-white text-xs font-medium line-clamp-2 leading-snug">
                        {result.title}
                    </p>
                )}

                {/* Actions */}
                {onSearchSimilar && (
                    <div className="flex items-center gap-2 pointer-events-auto">
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
                )}
            </div>

            {/* ── Delete Button (Top Right) ── */}
            {onDelete && !showConfirm && (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation()
                        setShowConfirm(true)
                    }}
                    className={cn(
                        "absolute top-2 flex items-center justify-center size-7 rounded-lg bg-black/60 backdrop-blur-sm text-white/80 hover:bg-destructive hover:text-white transition-all duration-150 opacity-0 group-hover:opacity-100 shadow-sm z-10",
                        hasSimilarityBadge ? "right-14" : "right-2"
                    )}
                    aria-label={`Xoá ${result.title ?? 'ảnh'}`}
                    title="Xoá ảnh"
                >
                    <Trash2 className="size-3.5" />
                </button>
            )}

            {/* ── Delete Confirmation Overlay ── */}
            {showConfirm && (
                <div
                    className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-xl bg-black/80 backdrop-blur-sm p-3 gap-2 animate-fade-in"
                    onClick={(e) => e.stopPropagation()}
                >
                    <AlertTriangle className="size-5 text-amber-400 shrink-0" />
                    <p className="text-[11px] text-white font-semibold text-center leading-snug">
                        Xoá ảnh này?
                    </p>
                    <div className="flex gap-1.5">
                        <button
                            type="button"
                            onClick={handleCancelDelete}
                            disabled={isDeleting}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white/10 hover:bg-white/20 text-white transition-colors disabled:opacity-50"
                        >
                            Huỷ
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirmDelete}
                            disabled={isDeleting}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-destructive hover:bg-destructive/80 text-white transition-colors disabled:opacity-50 flex items-center gap-1"
                        >
                            {isDeleting ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
                            {isDeleting ? 'Đang xoá...' : 'Xoá'}
                        </button>
                    </div>
                </div>
            )}

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