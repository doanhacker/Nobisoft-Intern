import * as React from 'react'

// ============================================================
// useMasonryColumns — True shortest-column-first masonry layout
//
// Algorithm:
//   1. ResizeObserver tracks container width in real time
//   2. numCols is derived from container width + breakpoints config
//   3. Items are distributed using shortest-column-first:
//      each new item goes into the column with the lowest
//      accumulated estimated height
//   4. Estimated height = container_col_width / aspectRatio
//      (falls back to 4/3 if no aspect ratio is available)
// ============================================================

export interface MasonryItem {
    id: string
    aspectRatio?: string // e.g. "16 / 9" or "800 / 600"
    [key: string]: unknown
}

export interface BreakpointCols {
    default: number
    [width: number]: number
}

interface UseMasonryColumnsOptions<T extends MasonryItem> {
    items: T[]
    containerRef: React.RefObject<HTMLElement | null>
    breakpointCols: BreakpointCols
    /** Gap between columns in px — used for accurate width estimation */
    gap?: number
}

interface UseMasonryColumnsResult<T extends MasonryItem> {
    columns: T[][]
    numCols: number
}

/**
 * Parse an aspect ratio string like "16 / 9" or "800 / 600"
 * and return the numeric ratio (width / height).
 * Returns null if the string is invalid.
 */
function parseAspectRatio(aspectRatio: string | undefined): number | null {
    if (!aspectRatio) return null
    const parts = aspectRatio.split('/').map((s) => parseFloat(s.trim()))
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1]) && parts[1] !== 0) {
        return parts[0] / parts[1]
    }
    return null
}

/**
 * Estimate the rendered height of an item given the column width.
 * Uses the item's aspect ratio when available; falls back to 4/3.
 */
function estimateItemHeight(item: MasonryItem, colWidthPx: number): number {
    const ratio = parseAspectRatio(item.aspectRatio) ?? (4 / 3)
    return colWidthPx / ratio
}

/**
 * Derive the number of columns from the current container width
 * using a breakpointCols config (same format as react-masonry-css).
 *
 * The config keys are breakpoint widths in px; the value at each key
 * is the number of columns when the container is ≤ that width.
 * The `default` key is used when no breakpoint matches.
 */
function getNumCols(containerWidth: number, breakpointCols: BreakpointCols): number {
    const sortedBreakpoints = Object.keys(breakpointCols)
        .filter((k) => k !== 'default')
        .map(Number)
        .sort((a, b) => a - b) // ascending

    // Find the smallest breakpoint that is >= containerWidth
    for (const bp of sortedBreakpoints) {
        if (containerWidth <= bp) {
            return breakpointCols[bp]
        }
    }

    return breakpointCols.default
}

/**
 * Distribute items into N columns using the shortest-column-first
 * algorithm. Returns an array of N arrays (the columns), preserving
 * the original item order within each column.
 */
function distributeItems<T extends MasonryItem>(
    items: T[],
    numCols: number,
    colWidthPx: number,
): T[][] {
    if (numCols <= 0) return []

    const columns: T[][] = Array.from({ length: numCols }, () => [])
    const heights = new Array<number>(numCols).fill(0)

    for (const item of items) {
        // Find the column with the smallest accumulated height
        let shortestCol = 0
        let minHeight = heights[0]
        for (let i = 1; i < numCols; i++) {
            if (heights[i] < minHeight) {
                minHeight = heights[i]
                shortestCol = i
            }
        }
        columns[shortestCol].push(item)
        heights[shortestCol] += estimateItemHeight(item, colWidthPx)
    }

    return columns
}

export function useMasonryColumns<T extends MasonryItem>({
    items,
    containerRef,
    breakpointCols,
    gap = 12,
}: UseMasonryColumnsOptions<T>): UseMasonryColumnsResult<T> {
    const [containerWidth, setContainerWidth] = React.useState<number>(0)

    // ── ResizeObserver: track container width ────────────────
    React.useEffect(() => {
        const el = containerRef.current
        if (!el) return

        // Initial measurement
        setContainerWidth(el.getBoundingClientRect().width)

        let debounceTimer: ReturnType<typeof setTimeout>

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const width = entry.contentRect.width
                clearTimeout(debounceTimer)
                debounceTimer = setTimeout(() => setContainerWidth(width), 100)
            }
        })

        observer.observe(el)
        return () => {
            observer.disconnect()
            clearTimeout(debounceTimer)
        }
    }, [containerRef])

    // ── Derive numCols from container width ──────────────────
    const numCols = React.useMemo(() => {
        if (containerWidth === 0) return breakpointCols.default
        return getNumCols(containerWidth, breakpointCols)
    }, [containerWidth, breakpointCols])

    // ── Calculate per-column width (accounting for gaps) ─────
    const colWidthPx = React.useMemo(() => {
        if (containerWidth === 0 || numCols === 0) return 200
        const totalGap = gap * (numCols - 1)
        return (containerWidth - totalGap) / numCols
    }, [containerWidth, numCols, gap])

    // ── Distribute items into columns ────────────────────────
    // Only recalculate when items array length changes OR numCols changes.
    // Using items.length as dependency avoids re-running when parent
    // re-renders with the same item list but a new array reference.
    const columns = React.useMemo(
        () => distributeItems<T>(items, numCols, colWidthPx),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [items, numCols, colWidthPx],
    )

    return { columns, numCols }
}
