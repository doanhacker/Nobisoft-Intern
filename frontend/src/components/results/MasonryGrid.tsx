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
}

const BREAKPOINTS = {
    default: 4,
    1280: 4,
    1024: 3,
    768: 2,
    640: 2,
    480: 1,
}

export function MasonryGrid({ results, onCardClick, onSearchSimilar }: MasonryGridProps) {
    return (
        <Masonry
            breakpointCols={BREAKPOINTS}
            className="flex gap-4 w-full"
            columnClassName="flex flex-col gap-4"
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