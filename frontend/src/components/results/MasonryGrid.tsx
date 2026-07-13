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
    similarityScore: number
    width?: number
    height?: number
    aspectRatio?: string
    ocrText?: string
    source?: string
}

interface MasonryGridProps {
    results: SearchResult[]
    onCardClick: (result: SearchResult) => void
    onSearchSimilar: (result: SearchResult) => void
    /** Compact mode: fewer columns for split-view (image search) layout */
    compact?: boolean
}

const BREAKPOINTS_DEFAULT = {
    default: 4,
    1280: 4,
    1024: 3,
    768: 2,
    640: 2,
    480: 1,
}

const BREAKPOINTS_COMPACT = {
    default: 3,
    1280: 3,
    1024: 2,
    768: 2,
    640: 1,
    480: 1,
}

export function MasonryGrid({ results, onCardClick, onSearchSimilar, compact = false }: MasonryGridProps) {
    const breakpoints = compact ? BREAKPOINTS_COMPACT : BREAKPOINTS_DEFAULT
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
                    />
                </div>
            ))}
        </Masonry>
    )
}