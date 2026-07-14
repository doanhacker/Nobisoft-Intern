import axiosClient from './axiosClient'
import type { IndexingResult } from '@/types/admin'

// ============================================================
// Admin — Indexing API Service
// ============================================================

export interface IndexingResponse {
  success: boolean
  message: string
  data: IndexingResult[]
}

/**
 * POST /api/v1/admin/indexing
 * Upload batch ảnh để index (multipart/form-data, field: "images")
 * Tối đa 20 file, mỗi file ≤ 10MB, chấp nhận jpg/png/webp
 */
export async function batchIndexImages(
  files: File[],
  onUploadProgress?: (percent: number) => void,
): Promise<IndexingResponse> {
  const formData = new FormData()
  for (const file of files) {
    formData.append('images', file)
  }

  const { data } = await axiosClient.post<IndexingResponse>('/admin/indexing', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (event) => {
      if (onUploadProgress && event.total) {
        const percent = Math.round((event.loaded * 100) / event.total)
        onUploadProgress(percent)
      }
    },
  })
  return data
}
