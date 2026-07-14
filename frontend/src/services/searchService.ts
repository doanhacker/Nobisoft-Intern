import axiosClient from './axiosClient'
import type { SearchResult } from '@/components/results/MasonryGrid'

// ============================================================
// searchService.ts — Visual Search API integration
// POST /search/image
// ============================================================

// ── Types matching backend SearchImageResultItem ──────────────

interface SearchImageResultItem {
  id: string
  imageUrl: string
  width: number
  height: number
  fileSize: number
  fileFormat: string
  similarityScore: number
  createdAt: string
}

interface SearchImageApiResponse {
  success: true
  data: {
    searchType: 'IMAGE_ONLY'
    results: SearchImageResultItem[]
    total: number
    page: number
    limit: number
  }
}

// ── Module-level pending file store ──────────────────────────
// Used to pass File object from SearchPage → ResultsPage without URL params.
// (File objects cannot be serialised into URL search params.)

let _pendingImageFile: File | null = null

/** Store a File to be consumed by the next image search. */
export function setPendingImageFile(file: File | null): void {
  _pendingImageFile = file
}

/** Consume the stored File (returns and clears it). */
export function consumePendingImageFile(): File | null {
  const file = _pendingImageFile
  _pendingImageFile = null
  return file
}

/** Peek at the stored File without clearing it. */
export function getPendingImageFile(): File | null {
  return _pendingImageFile
}

// ── Map backend item → frontend SearchResult ─────────────────

function mapToSearchResult(item: SearchImageResultItem): SearchResult {
  return {
    id: item.id,
    thumbnailUrl: item.imageUrl,
    fullUrl: item.imageUrl,
    title: undefined,
    similarityScore: item.similarityScore,
    width: item.width,
    height: item.height,
    aspectRatio: item.width && item.height ? `${item.width}/${item.height}` : undefined,
    ocrText: undefined,
    source: undefined,
  }
}

// ── API call ──────────────────────────────────────────────────

export interface SearchByImageOptions {
  file: File
  page?: number
  signal?: AbortSignal
}

export interface SearchByImageResult {
  results: SearchResult[]
  total: number
  page: number
  limit: number
}

/**
 * Call POST /search/image with the given image file.
 * Returns up to 20 similar images sorted by similarity score (descending),
 * along with pagination metadata (total, page, limit).
 *
 * @throws {Error} on HTTP error or if the backend returns success: false
 */
export async function searchByImage({
  file,
  page = 1,
  signal,
}: SearchByImageOptions): Promise<SearchByImageResult> {
  const formData = new FormData()
  formData.append('image', file)
  formData.append('page', String(page))
  formData.append('limit', '20')

  const response = await axiosClient.post<SearchImageApiResponse>(
    '/search/image',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      signal,
      timeout: 30_000,
    },
  )

  const { data } = response.data
  return {
    results: data.results.map(mapToSearchResult),
    total: data.total,
    page: data.page,
    limit: data.limit,
  }
}

/**
 * Fetch an image URL and convert it to a File object.
 * Used by "Search Similar" to re-submit an existing result image as a query.
 */
export async function fetchImageAsFile(imageUrl: string, signal?: AbortSignal): Promise<File> {
  const response = await fetch(imageUrl, { signal })
  if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`)
  const blob = await response.blob()
  const ext = blob.type.split('/')[1] ?? 'jpg'
  return new File([blob], `query.${ext}`, { type: blob.type })
}
