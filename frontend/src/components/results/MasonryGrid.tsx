import Masonry from 'react-masonry-css'
import { ImageResultCard } from './ImageResultCard'

// ============================================================
// MasonryGrid — react-masonry-css based results grid
// ============================================================

export interface SearchResult {
    id: string
    thumbnailUrl: string
    fullUrl?: string
    title?: string
    /** Present only when the current user has ADMIN role (backend omits it for USER) */
    similarityScore?: number
    width?: number
    height?: number
    aspectRatio?: string
    ocrText?: string
    source?: string
}

const SKELETON_HEIGHTS = [180, 220, 260, 200, 300, 240, 160, 280]

interface MasonryGridProps {
    results: SearchResult[]
    onCardClick: (result: SearchResult) => void
    onSearchSimilar?: (result: SearchResult) => void
    onDelete?: (result: SearchResult) => void
    /** Compact mode: fewer columns for split-view (image search) layout */
    compact?: boolean
    /** Show similarity % badge on each card — only pass true for ADMIN role */
    showSimilarityBadge?: boolean
    /** Optional custom breakpoint columns configuration */
    breakpointCols?: Record<string, number> | number
    /** Render skeleton cards at the bottom of the grid when loading more items */
    isLoadingMore?: boolean
    /** Number of skeleton cards to render when isLoadingMore is true (default: 6) */
    skeletonCount?: number
}

const BREAKPOINTS_DEFAULT = {
    default: 6,
    1536: 6,
    1280: 5,
    1024: 4,
    768: 3,
    640: 2,
    480: 1,
}

const BREAKPOINTS_COMPACT = {
    default: 4,
    1536: 4,
    1280: 4,
    1024: 3,
    768: 2,
    640: 1,
    480: 1,
}

export function MasonryGrid({
    results,
    onCardClick,
    onSearchSimilar,
    onDelete,
    compact = false,
    showSimilarityBadge = false,
    breakpointCols,
    isLoadingMore = false,
    skeletonCount = 6,
}: MasonryGridProps) {
    const breakpoints = breakpointCols ?? (compact ? BREAKPOINTS_COMPACT : BREAKPOINTS_DEFAULT)
    return (
        <Masonry
            breakpointCols={breakpoints}
            className="flex gap-3 w-full"
            columnClassName="flex flex-col gap-3"
        >
            {results.map((result, i) => (
                <div
                    key={result.id}
                    className="animate-fade-slide-up"
                    style={{ animationDelay: `${Math.min(i * 50, 600)}ms` }}
                >
                    <ImageResultCard
                        result={result}
                        onClick={onCardClick}
                        onSearchSimilar={onSearchSimilar}
                        onDelete={onDelete}
                        showSimilarityBadge={showSimilarityBadge}
                    />
                </div>
            ))}

            {isLoadingMore &&
                Array.from({ length: skeletonCount }, (_, i) => (
                    <div
                        key={`skeleton-more-${i}`}
                        className="rounded-xl overflow-hidden animate-shimmer"
                        style={{ height: SKELETON_HEIGHTS[i % SKELETON_HEIGHTS.length] }}
                    >
                        <div className="w-full h-full bg-muted/80 relative">
                            <div className="absolute top-2 right-2 h-5 w-10 rounded-full bg-muted-foreground/20 animate-shimmer" />
                        </div>
                    </div>
                ))}
        </Masonry>
    )
}