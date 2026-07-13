// ============================================================
// mockData.ts — Mock search results (replace with API calls later)
// ============================================================

import type { SearchResult } from '@/components/results/MasonryGrid'

// Picsum dimensions pool for variety
const DIMENSIONS = [
  { w: 600, h: 800, ratio: '3/4' },
  { w: 800, h: 600, ratio: '4/3' },
  { w: 600, h: 600, ratio: '1/1' },
  { w: 900, h: 600, ratio: '3/2' },
  { w: 600, h: 900, ratio: '2/3' },
  { w: 1200, h: 675, ratio: '16/9' },
  { w: 700, h: 500, ratio: '7/5' },
  { w: 500, h: 700, ratio: '5/7' },
]

// Curated picsum IDs for consistent mock images
const PICSUM_IDS = [
  10, 20, 30, 40, 50, 60, 70, 80, 90, 100,
  110, 120, 130, 140, 150, 160, 170, 180, 190, 200,
  210, 220, 230, 240, 250, 260, 270, 280, 290, 300,
]

const MOCK_TITLES: Record<string, string[]> = {
  image: [
    'Mountain landscape at sunrise',
    'Urban street photography',
    'Abstract art composition',
    'Portrait in natural light',
    'Ocean waves at dusk',
    'Forest trail in autumn',
    'Architectural detail study',
    'Still life with flowers',
    'Night cityscape reflection',
    'Macro photography — dewdrops',
  ],
  semantic: [
    'Golden hour over the ocean',
    'Woman in red dress at a cafe',
    'Mountain landscape with snow',
    'Cat sitting on a window sill',
    'City at night with neon lights',
    'Vintage car on a country road',
    'Abstract watercolor painting',
    'Forest at dawn with mist',
    'Minimalist architecture',
    'Street food vendor at market',
  ],
  ocr: [
    'STOP sign on rural road',
    'Coca-Cola advertisement banner',
    'Sale 50% OFF retail store',
    'Nike "Just Do It" billboard',
    'Open 24 Hours convenience store',
    'Exit sign in parking garage',
    'Speed limit 60 road sign',
    'Restaurant menu board',
    'Airport departure board',
    'Warning: High Voltage sign',
  ],
}

const OCR_TEXTS: Record<number, string> = {
  0: 'STOP',
  1: 'Coca-Cola\nEnjoy!',
  2: 'SALE\n50% OFF\nToday Only',
  3: 'NIKE\nJust Do It',
  4: 'OPEN\n24 HOURS\n7 Days a Week',
  5: 'EXIT →',
  6: 'SPEED LIMIT\n60',
  7: 'TODAY\'S SPECIAL\nPho Bo - 45,000đ\nBanh Mi - 25,000đ',
  8: 'DEPARTURE\nHAN → SGN 06:45\nHCM → HAN 09:30',
  9: '⚠️ WARNING\nHIGH VOLTAGE\nKeep Out',
}

const SOURCES = [
  'https://unsplash.com/photos/example',
  'https://flickr.com/photos/example',
  'https://pixabay.com/photos/example',
  undefined,
  undefined,
  undefined,
]

// Build a deterministic but varied mock result set
function buildMockResults(mode: string, count = 20): SearchResult[] {
  const titles = MOCK_TITLES[mode] ?? MOCK_TITLES.semantic
  return Array.from({ length: count }, (_, i) => {
    const picsumId = PICSUM_IDS[i % PICSUM_IDS.length]
    const dim = DIMENSIONS[i % DIMENSIONS.length]
    const hasOcr = mode === 'ocr' || (mode === 'image' && i % 4 === 0)
    // Scores spread: higher indices = lower similarity (sorted desc)
    const rawScore = Math.max(0.2, 0.97 - i * 0.035 + (Math.random() * 0.04 - 0.02))

    return {
      id: `mock-${mode}-${i}`,
      thumbnailUrl: `https://picsum.photos/id/${picsumId}/${dim.w}/${dim.h}`,
      fullUrl: `https://picsum.photos/id/${picsumId}/${dim.w * 2}/${dim.h * 2}`,
      title: titles[i % titles.length],
      similarityScore: Math.round(rawScore * 100) / 100,
      width: dim.w,
      height: dim.h,
      aspectRatio: dim.ratio,
      ocrText: hasOcr ? OCR_TEXTS[i % Object.keys(OCR_TEXTS).length] : undefined,
      source: SOURCES[i % SOURCES.length],
    }
  })
}

// ── Simulate network delay ────────────────────────────────────
function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => {
      clearTimeout(timer)
      reject(new DOMException('Aborted', 'AbortError'))
    })
  })
}

// ── Public API ────────────────────────────────────────────────

export interface SearchParams {
  mode: 'image' | 'semantic' | 'ocr'
  query?: string
  queryId?: string
  signal?: AbortSignal
}

/**
 * Simulate a search API call.
 * - Returns empty array for obviously blank queries.
 * - Artificially returns 0 results for queries containing "noresult".
 * - Throws AbortError if signal is aborted.
 */
export async function getMockResults(params: SearchParams): Promise<SearchResult[]> {
  const { mode, query, signal } = params
  const q = query?.trim() ?? ''

  // Client-side guard: should never reach here with empty query
  if (mode !== 'image' && !q) return []

  // Simulate <2s for semantic/ocr, <3s for image
  const latency = mode === 'image' ? 1400 : 900
  await delay(latency, signal)

  // Simulate empty result scenario
  if (q.toLowerCase().includes('noresult') || q.toLowerCase().includes('không có')) {
    return []
  }

  return buildMockResults(mode, 20)
}

/**
 * Simulate fetching a single image detail by ID.
 */
export async function getMockImageById(id: string, signal?: AbortSignal): Promise<SearchResult | null> {
  await delay(300, signal)
  const idx = parseInt(id.split('-').at(-1) ?? '0', 10)
  const picsumId = PICSUM_IDS[idx % PICSUM_IDS.length]
  const dim = DIMENSIONS[idx % DIMENSIONS.length]
  return {
    id,
    thumbnailUrl: `https://picsum.photos/id/${picsumId}/${dim.w}/${dim.h}`,
    fullUrl: `https://picsum.photos/id/${picsumId}/${dim.w * 2}/${dim.h * 2}`,
    title: MOCK_TITLES.semantic[idx % MOCK_TITLES.semantic.length],
    similarityScore: 0.95,
    width: dim.w,
    height: dim.h,
    aspectRatio: dim.ratio,
    source: SOURCES[idx % SOURCES.length],
  }
}
