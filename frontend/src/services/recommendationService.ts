import axiosClient from './axiosClient'
import type { SearchResult } from '@/components/results/MasonryGrid'

// ============================================================
// recommendationService.ts — GET /recommendations
// Returns personalized image recommendations based on user's click history.
// Requires at least 3 distinct clicks to return results.
// ============================================================

// ── Backend response types ────────────────────────────────────

interface RecommendationResultItem {
  id: string
  imageUrl: string
  width: number
  height: number
  fileSize: number
  fileFormat: string
  similarityScore: number
  createdAt: string
}

interface RecommendationApiResponse {
  success: true
  message: string
  data: {
    results: RecommendationResultItem[]
    clickCount: number
  }
  meta: {
    page: number
    limit: number
    totalDocs: number
    totalPages: number
  }
}

// ── Shared result type ────────────────────────────────────────

export interface RecommendationResult {
  results: SearchResult[]
  clickCount: number
  total: number
  page: number
  limit: number
  totalPages: number
  /** True when user has insufficient click history (< 3 distinct clicks) */
  insufficientHistory: boolean
  message: string
}

// ── Map backend item → frontend SearchResult ─────────────────

function mapToSearchResult(item: RecommendationResultItem): SearchResult {
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

// ── API call ─────────────────────────────────────────────────

/**
 * Fetch personalized image recommendations.
 *
 * Based on the user's 30 most recent distinct image clicks.
 * Computes a weighted mean vector (newer clicks have higher weight) and
 * searches for similar images, excluding already-clicked ones.
 *
 * Returns `insufficientHistory: true` when user has < 3 distinct clicks.
 *
 * @param page   Page number (1-indexed)
 * @param limit  Results per page (default 20, max 100)
 * @param signal AbortController signal
 */
export async function getRecommendations(
  page = 1,
  limit = 20,
  signal?: AbortSignal,
): Promise<RecommendationResult> {
  const { data } = await axiosClient.get<RecommendationApiResponse>('/recommendations', {
    params: { page, limit },
    signal,
    timeout: 30_000,
  })

  const insufficientHistory = data.data.results.length === 0 && data.data.clickCount === 0

  return {
    results: data.data.results.map(mapToSearchResult),
    clickCount: data.data.clickCount,
    total: data.meta.totalDocs,
    page: data.meta.page,
    limit: data.meta.limit,
    totalPages: data.meta.totalPages,
    insufficientHistory,
    message: data.message,
  }
}
