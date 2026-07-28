import Masonry from 'react-masonry-css'
import { cn } from '@/lib/utils'

// ============================================================
// SkeletonGrid — Masonry skeleton with shimmer effect
// ============================================================

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

// Random-ish heights for visual variety
const HEIGHTS = [180, 220, 260, 200, 300, 240, 160, 280, 200, 220, 260, 180, 240, 300, 200, 160, 220, 280, 200, 240]

interface SkeletonGridProps {
    count?: number
    className?: string
    compact?: boolean
    breakpointCols?: Record<string, number> | number
}

function SkeletonCard({ height, delay }: { height: number; delay: number }) {
    return (
        <div
            className="rounded-xl overflow-hidden animate-shimmer"
            style={{ height, animationDelay: `${delay}ms` }}
        >
            {/* Shimmer overlay */}
            <div className="w-full h-full bg-muted/80 relative">
                {/* Score badge placeholder */}
                <div className="absolute top-2 right-2 h-5 w-10 rounded-full bg-muted-foreground/20 animate-shimmer" />
            </div>
        </div>
    )
}

export function SkeletonGrid({ count = 20, className, compact = false, breakpointCols }: SkeletonGridProps) {
    const items = Array.from({ length: count }, (_, i) => ({
        height: HEIGHTS[i % HEIGHTS.length],
        delay: (i % 8) * 80,
    }))

    const defaultBreakpoints = compact ? BREAKPOINTS_COMPACT : BREAKPOINTS_DEFAULT

    return (
        <div className={cn('w-full', className)}>
            <Masonry
                breakpointCols={breakpointCols ?? defaultBreakpoints}
                className="flex gap-4 w-full"
                columnClassName="flex flex-col gap-4"
            >
                {items.map((item, i) => (
                    <SkeletonCard key={i} height={item.height} delay={item.delay} />
                ))}
            </Masonry>
        </div>
    )
}