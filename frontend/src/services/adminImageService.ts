import axiosClient from './axiosClient'
import type { AdminImageItem, ImageListParams } from '@/types/admin'

// ============================================================
// Admin — Images API Service
// ============================================================

export interface ImageListResponse {
  success: boolean
  message: string
  data: AdminImageItem[]
  meta: {
    page: number
    limit: number
    totalDocs: number
    totalPages: number
  }
}

export interface ImageDetailResponse {
  success: boolean
  message: string
  data: AdminImageItem
}

/**
 * GET /images
 * Danh sách ảnh đã index, hỗ trợ lọc và phân trang
 */
export async function getImages(params: ImageListParams = {}): Promise<ImageListResponse> {
  const { data } = await axiosClient.get<ImageListResponse>('/images', {
    params,
  })
  return data
}

/**
 * GET /images/:id
 * Chi tiết 1 ảnh (kèm toàn bộ OCR data)
 */
export async function getImageDetail(id: string): Promise<ImageDetailResponse> {
  const { data } = await axiosClient.get<ImageDetailResponse>(`/images/${id}`)
  return data
}

/**
 * DELETE /images/:id
 * Xoá ảnh khỏi hệ thống (cascade: PostgreSQL + Qdrant + disk)
 */
export async function deleteImage(id: string): Promise<void> {
  await axiosClient.delete(`/images/${id}`)
}
