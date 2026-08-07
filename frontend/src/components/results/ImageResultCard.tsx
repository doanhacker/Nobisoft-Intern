import * as React from 'react'
import type { SearchResult } from './MasonryGrid'
import { Search, Trash2, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DeleteConfirmModal } from '@/components/ui/DeleteConfirmModal'

// ============================================================
// ImageResultCard — Single image tile in masonry grid
//
// Wrapped with React.memo: only re-renders when the result id,
// badge visibility, or callbacks change — not on every parent render.
// The fallback aspect-ratio ensures the browser reserves vertical
// space before the lazy image loads, preventing layout shift (CLS).
// ============================================================

interface ImageResultCardProps {
    result: SearchResult
    onClick: (result: SearchResult) => void
    onSearchSimilar?: (result: SearchResult) => void
    onDelete?: (result: SearchResult) => void
    /** When true (ADMIN role), renders the similarity % badge */
    showSimilarityBadge?: boolean
    style?: React.CSSProperties
    /** When true, clicking the card toggles selection instead of opening lightbox */
    isSelectMode?: boolean
    /** When true, renders a checkmark overlay to indicate the card is selected */
    isSelected?: boolean
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

function ImageResultCardInner({
    result,
    onClick,
    onSearchSimilar,
    onDelete,
    showSimilarityBadge = false,
    style,
    isSelectMode = false,
    isSelected = false,
}: ImageResultCardProps) {
    const [showConfirm, setShowConfirm] = React.useState(false)
    const [isDeleting, setIsDeleting] = React.useState(false)

    const hasSimilarityBadge = showSimilarityBadge && result.similarityScore != null
    const simStyle = hasSimilarityBadge ? getSimilarityStyle(result.similarityScore!) : null

    const handleConfirmDelete = async () => {
        setIsDeleting(true)
        try {
            await onDelete?.(result)
        } finally {
            setIsDeleting(false)
            setShowConfirm(false)
        }
    }

    const handleCancelDelete = () => {
        setShowConfirm(false)
    }

    return (
        <>
            <div
                className={cn(
                    'group relative rounded-xl overflow-hidden card-hover cursor-pointer shadow-card',
                    isSelected && 'ring-2 ring-primary ring-offset-1 ring-offset-background',
                )}
                style={style}
                onClick={() => onClick(result)}
                role="button"
                tabIndex={0}
                aria-label={isSelectMode ? `Chọn ảnh: ${result.title}` : `View image: ${result.title}`}
                aria-pressed={isSelectMode ? isSelected : undefined}
                onKeyDown={(e) => e.key === 'Enter' && onClick(result)}
            >
                {/* ── Image ── */}
                <img
                    src={result.thumbnailUrl}
                    alt={result.title ?? 'Image'}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-auto block transition-transform duration-500 group-hover:scale-105"
                    style={{
                        // Always reserve layout space before image loads to prevent
                        // Cumulative Layout Shift (CLS) that breaks the masonry grid.
                        // Fall back to 4/3 when the server doesn't provide dimensions.
                        aspectRatio: result.aspectRatio ?? '4 / 3',
                    }}
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

                {/* ── Delete Button (Top Right) — hidden in select mode ── */}
                {onDelete && !isSelectMode && (
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

                {/* ── Similarity Score Badge — ADMIN only (top-right corner) ── */}
                {hasSimilarityBadge && simStyle && !isSelectMode && (
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
                {result.ocrText && !isSelectMode && (
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-black/50 backdrop-blur-sm border border-white/20 text-white">
                        OCR
                    </div>
                )}

                {/* ── Select mode: selected overlay + checkmark ── */}
                {isSelectMode && (
                    <>
                        {/* Dim overlay when selected */}
                        <div
                            className={cn(
                                'absolute inset-0 transition-all duration-200 pointer-events-none rounded-xl',
                                isSelected
                                    ? 'bg-primary/30'
                                    : 'bg-transparent group-hover:bg-black/20',
                            )}
                        />
                        {/* Checkmark badge (top-right) */}
                        <div
                            className={cn(
                                'absolute top-2 right-2 size-6 rounded-full flex items-center justify-center transition-all duration-200 shadow-md',
                                isSelected
                                    ? 'bg-primary text-primary-foreground scale-100 opacity-100'
                                    : 'bg-black/50 border border-white/40 text-white/0 scale-90 opacity-0 group-hover:opacity-100 group-hover:scale-100',
                            )}
                        >
                            <CheckCircle2 className="size-4" />
                        </div>
                    </>
                )}
            </div>

            {/* ── Delete Confirm Modal (rendered into document.body via portal) ── */}
            {showConfirm && (
                <DeleteConfirmModal
                    imageTitle={result.title}
                    isDeleting={isDeleting}
                    onConfirm={handleConfirmDelete}
                    onCancel={handleCancelDelete}
                />
            )}
        </>
    )
}

/**
 * Memoized version of ImageResultCard.
 * Only re-renders when the result's id, similarity badge flag,
 * or one of the callback references changes.
 */
export const ImageResultCard = React.memo(
    ImageResultCardInner,
    (prev, next) =>
        prev.result.id === next.result.id &&
        prev.showSimilarityBadge === next.showSimilarityBadge &&
        prev.isSelectMode === next.isSelectMode &&
        prev.isSelected === next.isSelected &&
        prev.onClick === next.onClick &&
        prev.onSearchSimilar === next.onSearchSimilar &&
        prev.onDelete === next.onDelete,
)
