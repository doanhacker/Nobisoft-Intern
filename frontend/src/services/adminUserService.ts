import axiosClient from './axiosClient'
import type {
  AdminUserItem,
  UserListParams,
  SearchHistoryItem,
  SearchHistoryParams,
} from '@/types/admin'

// ============================================================
// Admin — Users API Service
// ============================================================

export interface UserListResponse {
  success: boolean
  message: string
  data: AdminUserItem[]
  meta: {
    page: number
    limit: number
    totalDocs: number
    totalPages: number
  }
}

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
 * GET /api/v1/admin/users
 * Danh sách tất cả users, hỗ trợ search và phân trang
 */
export async function getUsers(params: UserListParams = {}): Promise<UserListResponse> {
  const { data } = await axiosClient.get<UserListResponse>('/admin/users', {
    params,
  })
  return data
}

/**
 * GET /api/v1/admin/users/:userId/search-history
 * Lịch sử tìm kiếm của 1 user cụ thể
 */
export async function getUserSearchHistory(
  userId: string,
  params: SearchHistoryParams = {},
): Promise<SearchHistoryResponse> {
  const { data } = await axiosClient.get<SearchHistoryResponse>(
    `/admin/users/${userId}/search-history`,
    { params },
  )
  return data
}
