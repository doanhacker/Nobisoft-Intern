// ============================================================
// myImagesService.ts — Real API calls for user's uploaded images
// GET  /images/me          → list images (paginated + filtered)
// DELETE /images/me/:id   → delete image by UUID
// Auth: Bearer token (handled by axiosClient interceptor)
// ============================================================

import axiosClient from './axiosClient'

// ─── Types ───────────────────────────────────────────────────

export interface UserImage {
  id: string
  /** Full URL resolved by backend (used for both thumbnail and full view) */
  imageUrl: string
  /** Derived from imageUrl path (backend doesn't return filename field) */
  filename: string
  /** ISO 8601 string */
  uploadedAt: string
  width: number | null
  height: number | null
  /** File size in bytes, may be null */
  size: number | null
  /** e.g. "jpg" | "png" | "webp" */
  fileFormat: string | null
}

export interface GetMyImagesParams {
  page: number
  limit?: number
  fileFormat?: 'jpg' | 'png' | 'webp'
  fromDate?: string // yyyy-mm-dd
  toDate?: string   // yyyy-mm-dd
}

export interface GetMyImagesResult {
  images: UserImage[]
  totalDocs: number
  totalPages: number
  hasMore: boolean
  page: number
  limit: number
}

// ─── Internal API response shapes ────────────────────────────

interface MyImageListItem {
  id: string
  imageUrl: string
  width: number | null
  height: number | null
  fileSize: number | null
  fileFormat: string | null
  createdAt: string
}

interface PaginationMeta {
  page: number
  limit: number
  totalDocs: number
  totalPages: number
}

interface MyImagesApiResponse {
  success: boolean
  message: string
  data: MyImageListItem[]
  meta: PaginationMeta
}

// ─── Helpers ─────────────────────────────────────────────────

/**
 * Tách filename từ URL. Ví dụ:
 *   "http://localhost:8000/storage/images/index/abc.jpg" → "abc.jpg"
 * Fallback: "image-{id}.{ext}"
 */
function resolveFilename(imageUrl: string, id: string, fileFormat: string | null): string {
  try {
    const url = new URL(imageUrl)
    const parts = url.pathname.split('/')
    const last = parts[parts.length - 1]
    if (last && last.includes('.')) return last
  } catch {
    // URL parse failed — use fallback
  }
  const ext = fileFormat ?? 'jpg'
  return `image-${id}.${ext}`
}

/**
 * Map backend MyImageListItem → frontend UserImage
 */
function mapToUserImage(item: MyImageListItem): UserImage {
  return {
    id: item.id,
    imageUrl: item.imageUrl,
    filename: resolveFilename(item.imageUrl, item.id, item.fileFormat),
    uploadedAt: item.createdAt,
    width: item.width,
    height: item.height,
    size: item.fileSize,
    fileFormat: item.fileFormat,
  }
}

// ─── Public API ──────────────────────────────────────────────

/**
 * GET /images/me
 * Lấy danh sách ảnh do user hiện tại upload, hỗ trợ phân trang và lọc.
 */
export async function getMyImages(params: GetMyImagesParams): Promise<GetMyImagesResult> {
  const { page, limit = 20, fileFormat, fromDate, toDate } = params

  const queryParams: Record<string, string | number> = { page, limit }
  if (fileFormat) queryParams.fileFormat = fileFormat
  if (fromDate) queryParams.fromDate = fromDate
  if (toDate) queryParams.toDate = toDate

  const { data } = await axiosClient.get<MyImagesApiResponse>('/images/me', {
    params: queryParams,
  })

  const { data: items, meta } = data

  return {
    images: items.map(mapToUserImage),
    totalDocs: meta.totalDocs,
    totalPages: meta.totalPages,
    hasMore: meta.page < meta.totalPages,
    page: meta.page,
    limit: meta.limit,
  }
}

/**
 * DELETE /images/me/:id
 * Xoá ảnh do user hiện tại upload.
 * Throws error nếu server trả về 4xx/5xx.
 */
export async function deleteMyImage(id: string): Promise<void> {
  await axiosClient.delete(`/images/me/${id}`)
}

// ─── Utility: format file size ───────────────────────────────

export function formatFileSize(bytes: number | null): string {
  if (bytes === null || bytes === undefined) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
