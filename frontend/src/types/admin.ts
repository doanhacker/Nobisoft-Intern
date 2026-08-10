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

export type SearchTypeValue = 'IMAGE_ONLY' | 'TEXT_SEMANTIC' | 'TEXT_OCR' | 'TEXT_PROMPT'

/** Ảnh dùng để tìm kiếm (query image) — khớp với backend history.type.ts */
export interface HistoryQueryImage {
  id: string
  imageUrl: string
  width: number | null
  height: number | null
  fileSize: number | null
  fileFormat: string | null
}

/** Một bản ghi lịch sử tìm kiếm — khớp với UserSearchHistoryItem của backend */
export interface SearchHistoryItem {
  id: string
  searchType: SearchTypeValue
  /** Ảnh query (nếu searchType = IMAGE_ONLY). Null nếu tìm bằng text. */
  queryImage: HistoryQueryImage | null
  /** Văn bản query (nếu searchType = TEXT_SEMANTIC hoặc TEXT_OCR). Null nếu tìm bằng ảnh. */
  queryText: string | null
  createdAt: string
}

export type SearchHistoryParams = {
  page?: number
  limit?: number
  searchType?: SearchTypeValue
  fromDate?: string
  toDate?: string
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
