import axiosClient from './axiosClient'
import type { SearchResult } from '@/components/results/MasonryGrid'

// ============================================================
// searchService.ts — Visual Search API integration
// POST /search/image  (2 modes in 1 endpoint)
//
// Mode A — New search (sends image file):
//   multipart/form-data  { image: File, page: 1, limit: 20 }
//   → Backend creates SearchHistory, returns searchHistoryId
//
// Mode B — Page navigation (sends searchHistoryId):
//   application/json     { searchHistoryId: string, page: N, limit: 20 }
//   → Backend re-reads the stored query image, does NOT create a new history record
// ============================================================

// ── Backend response types ────────────────────────────────────

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
  message: string
  data: {
    searchHistoryId: string
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

// ── Shared result type ────────────────────────────────────────

export interface SearchByImageResult {
  /** The backend-assigned ID for this search session. Must be stored in FE state
   *  and passed to `searchByImagePage()` on subsequent page changes. */
  searchHistoryId: string
  results: SearchResult[]
  total: number
  page: number
  limit: number
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

function parseResponse(raw: SearchImageApiResponse): SearchByImageResult {
  const { data } = raw
  return {
    searchHistoryId: data.searchHistoryId,
    results: data.results.map(mapToSearchResult),
    total: data.total,
    page: data.page,
    limit: data.limit,
  }
}

// ── Mode A: New search with image file ────────────────────────

/**
 * First search in a session — sends the image file as multipart.
 *
 * Backend will:
 * 1. Save the query image to disk
 * 2. Create a `SearchHistory` record
 * 3. Run the CLIP embedding + vector search
 * 4. Return `searchHistoryId` for use in subsequent page-change calls
 *
 * Always called with `page = 1` (backend enforces this).
 *
 * @throws on HTTP error or AI/Qdrant failure
 */
export async function searchByImageFile(
  file: File,
  signal?: AbortSignal,
): Promise<SearchByImageResult> {
  const formData = new FormData()
  formData.append('image', file)
  formData.append('page', '1')
  formData.append('limit', '20')

  const { data } = await axiosClient.post<SearchImageApiResponse>('/search/image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    signal,
    timeout: 30_000,
  })

  return parseResponse(data)
}

// ── Mode B: Page navigation with searchHistoryId ─────────────

/**
 * Subsequent page changes within the same image search session.
 *
 * Sends `searchHistoryId` (UUID from the first search) + desired `page` as JSON.
 * Backend re-reads the stored query image from disk and does NOT create a new history.
 *
 * @throws on HTTP error, history-not-found (404), page out of range (400)
 */
export async function searchByImagePage(
  searchHistoryId: string,
  page: number,
  signal?: AbortSignal,
): Promise<SearchByImageResult> {
  const { data } = await axiosClient.post<SearchImageApiResponse>(
    '/search/image',
    { searchHistoryId, page, limit: 20 },
    { signal, timeout: 30_000 },
  )

  return parseResponse(data)
}

// ── Utility: fetch image URL as File ─────────────────────────

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
