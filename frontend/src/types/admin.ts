// ============================================================
// Admin API Types — mirrors backend types exactly
// ============================================================

// ─── Shared ──────────────────────────────────────────────────

export interface PaginationMeta {
  page: number
  limit: number
  totalDocs: number
  totalPages: number
}

export interface PaginatedResponse<T> {
  success: true
  message: string
  data: T[]
  meta: PaginationMeta
}

// ─── Users ───────────────────────────────────────────────────

export type AuthRole = 'USER' | 'ADMIN'

export interface AdminUserItem {
  id: string
  email: string
  name: string
  role: AuthRole
  createdAt: string
  _count: {
    searchHistories: number
  }
}

export type UserListParams = {
  page?: number
  limit?: number
  search?: string
}

// ─── Search History ───────────────────────────────────────────

export type SearchTypeValue = 'IMAGE_ONLY' | 'TEXT_SEMANTIC' | 'TEXT_OCR'

export interface SearchHistoryClickedImage {
  id: string
  imageUrl: string
  width: number
  height: number
}

export interface SearchHistoryItem {
  id: string
  searchType: SearchTypeValue
  queryImagePath: string | null
  queryText: string | null
  clickedImage: SearchHistoryClickedImage | null
  createdAt: string
}

export type SearchHistoryParams = {
  page?: number
  limit?: number
  searchType?: SearchTypeValue
}

// ─── Images ──────────────────────────────────────────────────

export interface OcrLinePreview {
  rawText: string
  confidenceScore: number
}

export interface ImageIndexInfo {
  id: string
  processDurationMs: number | null
  indexedAt: string
  ocrLines: OcrLinePreview[]
}

export interface AdminImageItem {
  id: string
  imageUrl: string
  width: number
  height: number
  fileSize: number
  fileFormat: string
  createdAt: string
  imageIndex: ImageIndexInfo | null
}

export type ImageListParams = {
  page?: number
  limit?: number
  fileFormat?: 'jpg' | 'png' | 'webp'
  fromDate?: string
  toDate?: string
}

// ─── Indexing ────────────────────────────────────────────────

export interface IndexingResult {
  filename: string
  success: boolean
  imageId?: string
  error?: string
}
