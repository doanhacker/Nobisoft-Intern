import type { ApiResponse } from './apiResponse.js';

export interface RecommendationResultItem {
  id: string;
  imageUrl: string;
  width: number | null;
  height: number | null;
  fileSize: number | null;
  fileFormat: string | null;
  similarityScore: number;
  createdAt: Date;
}

export interface RecommendationResult {
  results: RecommendationResultItem[];
  total: number;
  page: number;
  limit: number;
  clickCount: number;
}

export interface RecommendationData {
  results: RecommendationResultItem[];
  clickCount: number;
}

export type RecommendationResponse = ApiResponse<RecommendationData>;
