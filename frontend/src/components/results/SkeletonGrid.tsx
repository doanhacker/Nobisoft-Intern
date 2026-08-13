import * as React from 'react'
import { cn } from '@/lib/utils'
import type { BreakpointCols } from '@/hooks/useMasonryColumns'

// ============================================================
// SkeletonGrid — CSS-column masonry skeleton with shimmer effect
//
// Skeletons use fixed heights so we don't need shortest-column logic.
// A simple CSS flex + column-count approach works fine here.
// ============================================================

const BREAKPOINTS_DEFAULT: BreakpointCols = {
    default: 6,
    1536: 6,
    1280: 5,
    1024: 4,
    768: 3,
    640: 2,
    480: 2,
    380: 2,
}

const BREAKPOINTS_COMPACT: BreakpointCols = {
    default: 4,
    1536: 4,
    1280: 4,
    1024: 3,
    768: 2,
    640: 2,
    480: 2,
    380: 2,
}

// Varied heights for visual variety in skeleton placeholders
const HEIGHTS = [180, 220, 260, 200, 300, 240, 160, 280, 200, 220, 260, 180, 240, 300, 200, 160, 220, 280, 200, 240]

interface SkeletonGridProps {
    count?: number
    className?: string
    compact?: boolean
    breakpointCols?: BreakpointCols
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

/**
 * Derives the column count from the breakpointCols config and current window width.
 * Runs once on mount; for skeletons, a window-resize listener is overkill.
 */
function getNumColsFromWindow(breakpointCols: BreakpointCols): number {
    if (typeof window === 'undefined') return breakpointCols.default
    const width = window.innerWidth

    const sortedBreakpoints = Object.keys(breakpointCols)
        .filter((k) => k !== 'default')
        .map(Number)
        .sort((a, b) => a - b)

    for (const bp of sortedBreakpoints) {
        if (width <= bp) return breakpointCols[bp]
    }
    return breakpointCols.default
}

export function SkeletonGrid({ count = 20, className, compact = false, breakpointCols }: SkeletonGridProps) {
    const bpConfig = breakpointCols ?? (compact ? BREAKPOINTS_COMPACT : BREAKPOINTS_DEFAULT)

    // Derive numCols once on render (skeletons don't need live resize)
    const numCols = React.useMemo(() => getNumColsFromWindow(bpConfig), [bpConfig])

    const items = Array.from({ length: count }, (_, i) => ({
        height: HEIGHTS[i % HEIGHTS.length],
        delay: (i % 8) * 80,
    }))

    // Distribute items into columns (round-robin is fine for fixed-height skeletons)
    const columns = Array.from({ length: numCols }, (_, col) =>
        items.filter((_, i) => i % numCols === col),
    )

    return (
        <div className={cn('flex gap-3 w-full', className)}>
            {columns.map((colItems, colIdx) => (
                <div key={colIdx} className="flex-1 flex flex-col gap-3 min-w-0">
                    {colItems.map((item, i) => (
                        <SkeletonCard key={i} height={item.height} delay={item.delay} />
                    ))}
                </div>
            ))}
        </div>
    )
}