import type { ApiResponse } from './apiResponse.js';

export type HistorySearchType = 'IMAGE_ONLY' | 'TEXT_SEMANTIC' | 'TEXT_OCR';

export interface SearchHistoryListQuery {
  page: number;
  limit: number;
  searchType?: HistorySearchType | undefined;
  fromDate?: Date | undefined;
  toDate?: Date | undefined;
}

export interface HistoryQueryImage {
  id: string;
  imageUrl: string;
  width: number | null;
  height: number | null;
  fileSize: number | null;
  fileFormat: string | null;
}

export interface UserSearchHistoryItem {
  id: string;
  searchType: HistorySearchType;
  queryImage: HistoryQueryImage | null;
  queryText: string | null;
  createdAt: Date;
}

export type UserSearchHistoryApiResponse = ApiResponse<UserSearchHistoryItem[]>;

export interface UserSearchHistoryServiceResult {
  data: UserSearchHistoryItem[];
  total: number;
}
