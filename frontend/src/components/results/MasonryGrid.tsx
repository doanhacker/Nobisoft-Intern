import * as React from 'react'
import { useMasonryColumns, type BreakpointCols } from '@/hooks/useMasonryColumns'
import { ImageResultCard } from './ImageResultCard'

// ============================================================
// MasonryGrid — True shortest-column-first masonry layout
//
// Replaces react-masonry-css with a custom useMasonryColumns hook
// that correctly distributes items by tracking accumulated column
// heights (shortest-column-first algorithm).
//
// Key improvements over react-masonry-css:
//  - New items always go into the shortest column (no "holes")
//  - ResizeObserver recalculates layout on container resize
//  - Skeleton cards during load-more are also distributed correctly
//  - ImageResultCard is memoized to prevent unnecessary re-renders
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
    breakpointCols?: BreakpointCols
    /** Render skeleton cards at the bottom of the grid when loading more items */
    isLoadingMore?: boolean
    /** Number of skeleton cards to render when isLoadingMore is true (default: 6) */
    skeletonCount?: number
    /** When true, clicking a card toggles selection (bulk-delete mode) */
    isSelectMode?: boolean
    /** Set of selected image IDs when in select mode */
    selectedIds?: Set<string>
    /** Called when a card is toggled in select mode */
    onToggleSelect?: (result: SearchResult) => void
}

const BREAKPOINTS_DEFAULT: BreakpointCols = {
    default: 6,
    1536: 6,
    1280: 5,
    1024: 4,
    768: 3,
    640: 2,
    480: 1,
}

const BREAKPOINTS_COMPACT: BreakpointCols = {
    default: 4,
    1536: 4,
    1280: 4,
    1024: 3,
    768: 2,
    640: 1,
    480: 1,
}

const SKELETON_HEIGHTS = [180, 220, 260, 200, 300, 240, 160, 280]

// ── Skeleton card (load-more indicator within the grid) ───────
function SkeletonCard({ height, delay }: { height: number; delay: number }) {
    return (
        <div
            className="rounded-xl overflow-hidden animate-shimmer"
            style={{ height, animationDelay: `${delay}ms` }}
        >
            <div className="w-full h-full bg-muted/80 relative">
                <div className="absolute top-2 right-2 h-5 w-10 rounded-full bg-muted-foreground/20 animate-shimmer" />
            </div>
        </div>
    )
}

// ── Memoized image card — only re-renders when result data changes ──
const MemoizedImageResultCard = React.memo(
    function MemoizedImageResultCard({
        result,
        index,
        onCardClick,
        onSearchSimilar,
        onDelete,
        showSimilarityBadge,
        isSelectMode,
        isSelected,
    }: {
        result: SearchResult
        index: number
        onCardClick: (result: SearchResult) => void
        onSearchSimilar?: (result: SearchResult) => void
        onDelete?: (result: SearchResult) => void
        showSimilarityBadge: boolean
        isSelectMode: boolean
        isSelected: boolean
    }) {
        return (
            <div
                className="animate-fade-slide-up"
                style={{ animationDelay: `${Math.min(index * 50, 600)}ms` }}
            >
                <ImageResultCard
                    result={result}
                    onClick={onCardClick}
                    onSearchSimilar={isSelectMode ? undefined : onSearchSimilar}
                    onDelete={isSelectMode ? undefined : onDelete}
                    showSimilarityBadge={showSimilarityBadge}
                    isSelectMode={isSelectMode}
                    isSelected={isSelected}
                />
            </div>
        )
    },
    (prev, next) =>
        prev.result.id === next.result.id &&
        prev.showSimilarityBadge === next.showSimilarityBadge &&
        prev.isSelectMode === next.isSelectMode &&
        prev.isSelected === next.isSelected &&
        prev.onCardClick === next.onCardClick &&
        prev.onSearchSimilar === next.onSearchSimilar &&
        prev.onDelete === next.onDelete,
)

// ── Main MasonryGrid component ────────────────────────────────
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
    isSelectMode = false,
    selectedIds,
    onToggleSelect,
}: MasonryGridProps) {
    const containerRef = React.useRef<HTMLDivElement>(null)
    const activeBreakpoints = breakpointCols ?? (compact ? BREAKPOINTS_COMPACT : BREAKPOINTS_DEFAULT)

    const { columns, numCols } = useMasonryColumns({
        items: results,
        containerRef,
        breakpointCols: activeBreakpoints,
        gap: 12, // matches Tailwind gap-3 (12px)
    })

    // Build skeleton items distributed across shortest columns.
    // We reuse the column heights implicitly by computing skeleton columns
    // separately and appending them to the real columns visually.
    const skeletonItems = React.useMemo(
        () =>
            isLoadingMore
                ? Array.from({ length: skeletonCount }, (_, i) => ({
                      id: `__skeleton-more-${i}`,
                      height: SKELETON_HEIGHTS[i % SKELETON_HEIGHTS.length],
                      delay: i * 80,
                  }))
                : [],
        [isLoadingMore, skeletonCount],
    )

    // Distribute skeletons across the same number of columns
    // (simple round-robin is fine for skeletons — they just fill space)
    const skeletonColumns = React.useMemo<{ id: string; height: number; delay: number }[][]>(() => {
        if (numCols <= 0 || skeletonItems.length === 0) return []
        return Array.from({ length: numCols }, (_, col) =>
            skeletonItems.filter((_, i) => i % numCols === col),
        )
    }, [skeletonItems, numCols])

    return (
        <div ref={containerRef} className="flex gap-3 w-full" aria-label="Masonry image grid">
            {columns.map((colItems, colIdx) => (
                <div key={colIdx} className="flex-1 flex flex-col gap-3 min-w-0">
                    {colItems.map((result, itemIdx) => {
                        // Compute a global index for the stagger animation delay
                        const globalIdx = colIdx + itemIdx * columns.length
                        const handleClick = isSelectMode && onToggleSelect
                            ? onToggleSelect
                            : onCardClick
                        return (
                            <MemoizedImageResultCard
                                key={result.id}
                                result={result}
                                index={globalIdx}
                                onCardClick={handleClick}
                                onSearchSimilar={onSearchSimilar}
                                onDelete={onDelete}
                                showSimilarityBadge={showSimilarityBadge}
                                isSelectMode={isSelectMode}
                                isSelected={selectedIds?.has(result.id) ?? false}
                            />
                        )
                    })}

                    {/* Append skeleton cards into this column */}
                    {skeletonColumns[colIdx]?.map((sk) => (
                        <SkeletonCard key={sk.id} height={sk.height} delay={sk.delay} />
                    ))}
                </div>
            ))}
        </div>
    )
}