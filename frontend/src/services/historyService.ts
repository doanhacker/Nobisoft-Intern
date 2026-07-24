import axiosClient from './axiosClient'
import type { SearchHistoryItem, SearchHistoryParams } from '@/types/admin'

// ============================================================
// Client — Search History API Service
// GET /api/v1/history  (authenticated as current user)
// ============================================================

export interface SearchHistoryResponse {
  success: boolean
  message: string
  data: SearchHistoryItem[]
  meta: {
    page: number
    limit: number
    totalDocs: number
    totalPages: number
  }
}

/**
 * GET /api/v1/history
 * Lấy lịch sử tìm kiếm của người dùng hiện tại.
 * Hỗ trợ lọc theo searchType, fromDate, toDate và phân trang.
 */
export async function getMySearchHistory(
  params: SearchHistoryParams = {},
): Promise<SearchHistoryResponse> {
  const { data } = await axiosClient.get<SearchHistoryResponse>('/history', {
    params,
  })
  return data
}
