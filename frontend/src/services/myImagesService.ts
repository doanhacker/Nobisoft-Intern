// ============================================================
// myImagesService.ts — Mock service for user's uploaded images
// Will be replaced with real API calls (GET /images/me, DELETE /images/:id)
// ============================================================

// ─── Types ───────────────────────────────────────────────────

export interface UserImage {
  id: string
  thumbnailUrl: string
  fullUrl: string
  filename: string
  /** ISO 8601 string */
  uploadedAt: string
  width: number
  height: number
  /** File size in bytes */
  size: number
}

export interface GetMyImagesParams {
  page: number
  pageSize?: number
}

export interface GetMyImagesResult {
  images: UserImage[]
  totalCount: number
  hasMore: boolean
  page: number
  pageSize: number
}

// ─── Constants ───────────────────────────────────────────────

const DEFAULT_PAGE_SIZE = 20

// ─── Mock data generation ────────────────────────────────────

const PICSUM_IDS = [
  10, 20, 30, 40, 50, 60, 70, 80, 90, 100,
  110, 120, 130, 140, 150, 160, 170, 180, 190, 200,
  210, 220, 230, 240, 250, 260, 270, 280, 290, 300,
  15, 25, 35, 45, 55, 65, 75, 85, 95, 105,
  115, 125, 135, 145, 155, 165, 175, 185, 195, 205,
  215, 225, 235, 245, 255, 265, 275, 285, 295, 305,
]

const DIMENSIONS = [
  { w: 800, h: 600 },
  { w: 600, h: 800 },
  { w: 900, h: 600 },
  { w: 600, h: 900 },
  { w: 1200, h: 675 },
  { w: 700, h: 700 },
  { w: 800, h: 1000 },
  { w: 1000, h: 800 },
]

const FILE_PREFIXES = [
  'IMG', 'DSC', 'PHOTO', 'PXL', 'DSCF', 'MVI', 'VID', 'SNAP', 'CAM', 'RAW',
]

const FILE_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'avif']

function generateFilename(index: number): string {
  const prefix = FILE_PREFIXES[index % FILE_PREFIXES.length]
  const num = String(20240001 + index * 17).padStart(8, '0')
  const ext = FILE_EXTS[index % FILE_EXTS.length]
  return `${prefix}_${num}.${ext}`
}

/**
 * Generate a realistic uploadedAt date.
 * Images are spread across ~14 days, with more recent days having more images.
 */
function generateUploadedAt(index: number, total: number): string {
  const now = new Date()
  // Spread over 14 days, skewed toward recent
  const maxDaysAgo = 14
  const daysAgo = Math.floor((index / total) * maxDaysAgo)

  const date = new Date(now)
  date.setDate(date.getDate() - daysAgo)
  // Vary hours within the day
  date.setHours(Math.floor(Math.random() * 14) + 7) // 07:00 – 20:59
  date.setMinutes(Math.floor(Math.random() * 60))
  date.setSeconds(Math.floor(Math.random() * 60))
  date.setMilliseconds(0)

  return date.toISOString()
}

// Build mock dataset once (deterministic)
const TOTAL_MOCK_IMAGES = 60

const ALL_MOCK_IMAGES: UserImage[] = Array.from({ length: TOTAL_MOCK_IMAGES }, (_, i) => {
  const picsumId = PICSUM_IDS[i % PICSUM_IDS.length]
  const dim = DIMENSIONS[i % DIMENSIONS.length]
  const filename = generateFilename(i)
  const size = Math.floor(Math.random() * 8 * 1024 * 1024) + 200 * 1024 // 200KB–8MB

  return {
    id: `user-img-${i.toString().padStart(3, '0')}`,
    thumbnailUrl: `https://picsum.photos/id/${picsumId}/${dim.w}/${dim.h}`,
    fullUrl: `https://picsum.photos/id/${picsumId}/${dim.w * 2}/${dim.h * 2}`,
    filename,
    uploadedAt: generateUploadedAt(i, TOTAL_MOCK_IMAGES),
    width: dim.w,
    height: dim.h,
    size,
  }
}).sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())

// In-memory mutable store (simulates backend state for delete)
let mockStore: UserImage[] = [...ALL_MOCK_IMAGES]

// ─── Helpers ─────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ─── Public API ──────────────────────────────────────────────

/**
 * Simulate GET /images/me?page=1&pageSize=20
 * Returns a paginated slice of user's uploaded images, sorted newest first.
 */
export async function getMyImages(
  params: GetMyImagesParams,
): Promise<GetMyImagesResult> {
  const { page, pageSize = DEFAULT_PAGE_SIZE } = params

  await delay(700)

  const total = mockStore.length
  const start = (page - 1) * pageSize
  const end = start + pageSize
  const images = mockStore.slice(start, end)
  const hasMore = end < total

  return {
    images,
    totalCount: total,
    hasMore,
    page,
    pageSize,
  }
}

/**
 * Simulate DELETE /images/:id
 * Removes the image from the mock store.
 */
export async function deleteMyImage(id: string): Promise<void> {
  await delay(500)
  const index = mockStore.findIndex((img) => img.id === id)
  if (index === -1) {
    throw new Error(`Image ${id} not found`)
  }
  mockStore = mockStore.filter((img) => img.id !== id)
}

/**
 * Get total image count from mock store (for optimistic UI updates).
 */
export function getMockTotalCount(): number {
  return mockStore.length
}

// ─── Utility: format file size ───────────────────────────────

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
