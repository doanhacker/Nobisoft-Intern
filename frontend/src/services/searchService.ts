import axiosClient from './axiosClient'
import type { SearchResult } from '@/components/results/MasonryGrid'
import { getThumbnailUrl } from '@/lib/imageUtils'

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
  /** Only present when the requester has ADMIN role */
  similarityScore?: number
  createdAt: string
}

interface SearchImageApiResponse {
  success: true
  message: string
  data: {
    searchHistoryId: string
    searchType: 'IMAGE_ONLY'
    results: SearchImageResultItem[]
  }
  meta: {
    page: number
    limit: number
    totalDocs: number
    totalPages: number
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
    thumbnailUrl: getThumbnailUrl(item.imageUrl),
    fullUrl: item.imageUrl,
    title: undefined,
    // similarityScore is undefined for USER role (backend omits it)
    similarityScore: item.similarityScore,
    width: item.width,
    height: item.height,
    aspectRatio: item.width && item.height ? `${item.width}/${item.height}` : undefined,
    ocrText: undefined,
    source: undefined,
  }
}

function parseResponse(raw: SearchImageApiResponse): SearchByImageResult {
  const { data, meta } = raw
  return {
    searchHistoryId: data.searchHistoryId,
    results: data.results.map(mapToSearchResult),
    total: meta.totalDocs,
    page: meta.page,
    limit: meta.limit,
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

// ── Click tracking ────────────────────────────────────────────

/**
 * Record that the user clicked on an image result.
 * POST /search/history/click  { searchHistoryId, clickedImageId }
 *
 * Fire-and-forget — never throws; errors are logged to console only
 * so the UI is never blocked by a tracking failure.
 *
 * Called for all search modes (image, semantic, ocr) when searchHistoryId is available.
 */
export function recordSearchClick(searchHistoryId: string, clickedImageId: string): void {
  axiosClient
    .post('/search/history/click', { searchHistoryId, clickedImageId })
    .catch((err) => {
      console.warn('[recordSearchClick] Failed to record click:', err)
    })
}

// ============================================================
// Text Search API integration
// GET /search/text?mode=semantic|ocr  (2 modes in 1 endpoint)
//
// New search  (q provided):        GET /search/text?q=...&mode=semantic|ocr&page=1&limit=20
// Pagination  (history provided):  GET /search/text?searchHistoryId=...&mode=semantic|ocr&page=N&limit=20
//
// Rules enforced by backend:
//  - Send EITHER q (new search) OR searchHistoryId (pagination) — never both.
//  - New search must start at page=1.
//  - Semantic: limit is fixed at 20.
//  - OCR: limit 1–100, defaults to 20.
// ============================================================

// ── Backend response types ────────────────────────────────────

/** Single result item for semantic search (similarityScore present only for ADMIN role) */
interface TextSemanticResultItem {
  id: string
  imageUrl: string
  width: number | null
  height: number | null
  fileSize: number | null
  fileFormat: string | null
  /** Only present when the requester has ADMIN role */
  similarityScore?: number
  createdAt: string
}

/** One OCR match line with bounding box */
interface OcrMatchLine {
  rawText: string
  confidenceScore: number
  boundingBoxes: {
    x: number
    y: number
    width: number
    height: number
  } | null
}

/** Single result item for OCR search (has ocrMatches instead of similarityScore) */
interface TextOcrResultItem {
  id: string
  imageUrl: string
  width: number | null
  height: number | null
  fileSize: number | null
  fileFormat: string | null
  createdAt: string
  ocrMatches: OcrMatchLine[]
}

/** Generic pagination metadata returned by the backend */
interface PaginationMeta {
  page: number
  limit: number
  totalDocs: number
  totalPages: number
}

/** Backend response for semantic text search */
interface TextSemanticApiResponse {
  success: true
  message: string
  data: {
    searchHistoryId: string
    searchType: 'TEXT_SEMANTIC'
    results: TextSemanticResultItem[]
  }
  meta: PaginationMeta
}

/** Backend response for OCR text search */
interface TextOcrApiResponse {
  success: true
  message: string
  data: {
    searchHistoryId: string
    searchType: 'TEXT_OCR'
    results: TextOcrResultItem[]
  }
  meta: PaginationMeta
}

// ── Shared result type returned to the UI ─────────────────────

export interface SearchByTextResult {
  /** Backend-assigned session ID — pass to searchByTextPage() on pagination */
  searchHistoryId: string
  results: SearchResult[]
  total: number
  page: number
  limit: number
}

// ── Mappers ───────────────────────────────────────────────────

function mapSemanticItem(item: TextSemanticResultItem): SearchResult {
  return {
    id: item.id,
    thumbnailUrl: getThumbnailUrl(item.imageUrl),
    fullUrl: item.imageUrl,
    title: undefined,
    // similarityScore is undefined for USER role (backend omits it)
    similarityScore: item.similarityScore,
    width: item.width ?? undefined,
    height: item.height ?? undefined,
    aspectRatio: item.width && item.height ? `${item.width}/${item.height}` : undefined,
    ocrText: undefined,
    source: undefined,
  }
}

function mapOcrItem(item: TextOcrResultItem): SearchResult {
  // Collapse all matching lines into a single readable string for the UI
  const ocrText = item.ocrMatches.map((m) => m.rawText).join('\n') || undefined

  return {
    id: item.id,
    thumbnailUrl: getThumbnailUrl(item.imageUrl),
    fullUrl: item.imageUrl,
    title: undefined,
    // OCR results never carry a similarity score — leave it undefined
    similarityScore: undefined,
    width: item.width ?? undefined,
    height: item.height ?? undefined,
    aspectRatio: item.width && item.height ? `${item.width}/${item.height}` : undefined,
    ocrText,
    source: undefined,
  }
}

// ── New search — sends `q` ────────────────────────────────────

let activeTextSearchPromise: {
  key: string
  time: number
  promise: Promise<SearchByTextResult>
} | null = null

/**
 * Reset text search deduplication cache (e.g. when user explicitly forces a fresh search).
 */
export function resetTextSearchDeduplication() {
  activeTextSearchPromise = null
}

/**
 * Performs a initial text-based search (semantic or OCR).
 * Sends `q` + `mode` to backend, which creates a NEW `SearchHistory` record.
 * Returns `searchHistoryId` which must be stored in state for subsequent page changes.
 *
 * Requests for the same mode and query within 1.5 seconds are deduplicated
 * to prevent duplicate history records caused by React StrictMode or double-submit.
 *
 * @param mode   'semantic' | 'ocr'
 * @param q      Search query (non-empty)
 * @param limit  Number of results per page (semantic fixed at 20, ocr 1–100)
 * @param signal AbortController signal
 * @throws on HTTP error or AI/backend failure
 */
export async function searchByTextNew(
  mode: 'semantic' | 'ocr' | 'prompt',
  q: string,
  limit = 20,
  signal?: AbortSignal,
): Promise<SearchByTextResult> {
  const key = `${mode}:${q.trim()}`
  const now = Date.now()

  console.log(`[searchByTextNew] Called. Mode: ${mode}, Query: "${q}", Limit: ${limit}`);

  if (activeTextSearchPromise && activeTextSearchPromise.key === key && now - activeTextSearchPromise.time < 1500) {
    console.log(`[searchByTextNew] DEDUPLICATION HIT: returning active promise for key "${key}"`);
    return activeTextSearchPromise.promise
  }

  console.log(`[searchByTextNew] DEDUPLICATION MISS: initiating new API call for key "${key}"`);

  const searchPromise = (async () => {
    try {
      if (mode === 'semantic' || mode === 'prompt') {
        console.log(`[searchByTextNew] [API Request] GET /search/text (mode: ${mode}, q: "${q}", page: 1)`);
        const { data } = await axiosClient.get<TextSemanticApiResponse>('/search/text', {
          params: { q, mode, page: 1, limit: 20 },
          signal,
          timeout: 30_000,
        })
        console.log(`[searchByTextNew] [API Response] Success. searchHistoryId: ${data.data.searchHistoryId}, total: ${data.meta.totalDocs}`);
        return {
          searchHistoryId: data.data.searchHistoryId,
          results: data.data.results.map(mapSemanticItem),
          total: data.meta.totalDocs,
          page: data.meta.page,
          limit: data.meta.limit,
        }
      } else {
        console.log(`[searchByTextNew] [API Request] GET /search/text (mode: ocr, q: "${q}", page: 1, limit: ${limit})`);
        const { data } = await axiosClient.get<TextOcrApiResponse>('/search/text', {
          params: { q, mode: 'ocr', page: 1, limit },
          signal,
          timeout: 30_000,
        })
        console.log(`[searchByTextNew] [API Response] Success. searchHistoryId: ${data.data.searchHistoryId}, total: ${data.meta.totalDocs}`);
        return {
          searchHistoryId: data.data.searchHistoryId,
          results: data.data.results.map(mapOcrItem),
          total: data.meta.totalDocs,
          page: data.meta.page,
          limit: data.meta.limit,
        }
      }
    } catch (err) {
      console.error(`[searchByTextNew] [API Error] Failed for key "${key}":`, err);
      if (activeTextSearchPromise?.key === key) {
        activeTextSearchPromise = null
      }
      throw err
    }
  })()

  activeTextSearchPromise = { key, time: now, promise: searchPromise }
  return searchPromise
}

// ── Pagination — sends `searchHistoryId` ─────────────────────

/**
 * Subsequent page changes within the same text search session.
 *
 * Sends `searchHistoryId` (UUID from the first search) + desired `page`.
 * Backend does NOT create a new history record.
 *
 * @param mode            'semantic' | 'ocr' | 'prompt'
 * @param searchHistoryId UUID returned by the initial searchByTextNew() call
 * @param page            Target page number (≥ 1)
 * @param limit           Must match the limit used in the original search
 * @param signal          AbortController signal
 * @throws on HTTP error, 404 (history not found), 400 (page out of range)
 */
export async function searchByTextPage(
  mode: 'semantic' | 'ocr' | 'prompt',
  searchHistoryId: string,
  page: number,
  limit = 20,
  signal?: AbortSignal,
): Promise<SearchByTextResult> {
  console.log(`[searchByTextPage] Called. Mode: ${mode}, searchHistoryId: ${searchHistoryId}, Page: ${page}, Limit: ${limit}`);
  try {
    if (mode === 'semantic' || mode === 'prompt') {
      console.log(`[searchByTextPage] [API Request] GET /search/text (mode: ${mode}, searchHistoryId: ${searchHistoryId}, page: ${page})`);
      const { data } = await axiosClient.get<TextSemanticApiResponse>('/search/text', {
        params: { searchHistoryId, mode, page, limit: 20 },
        signal,
        timeout: 30_000,
      })
      console.log(`[searchByTextPage] [API Response] Success. searchHistoryId: ${data.data.searchHistoryId}, total: ${data.meta.totalDocs}`);
      return {
        searchHistoryId: data.data.searchHistoryId,
        results: data.data.results.map(mapSemanticItem),
        total: data.meta.totalDocs,
        page: data.meta.page,
        limit: data.meta.limit,
      }
    } else {
      console.log(`[searchByTextPage] [API Request] GET /search/text (mode: ocr, searchHistoryId: ${searchHistoryId}, page: ${page}, limit: ${limit})`);
      const { data } = await axiosClient.get<TextOcrApiResponse>('/search/text', {
        params: { searchHistoryId, mode: 'ocr', page, limit },
        signal,
        timeout: 30_000,
      })
      console.log(`[searchByTextPage] [API Response] Success. searchHistoryId: ${data.data.searchHistoryId}, total: ${data.meta.totalDocs}`);
      return {
        searchHistoryId: data.data.searchHistoryId,
        results: data.data.results.map(mapOcrItem),
        total: data.meta.totalDocs,
        page: data.meta.page,
        limit: data.meta.limit,
      }
    }
  } catch (err) {
    console.error(`[searchByTextPage] [API Error] Failed for searchHistoryId ${searchHistoryId}, page ${page}:`, err);
    throw err;
  }
}
