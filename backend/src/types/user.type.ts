import type { AuthRole } from './auth.type.js';
import type { ApiResponse } from './apiResponse.js';

// ─── User List ───

export interface UserListItem {
  id: string;
  email: string;
  name: string;
  role: AuthRole;
  createdAt: Date;
  _count: {
    searchHistories: number;
  };
}

export type UserListApiResponse = ApiResponse<UserListItem[]>;

export type UserListServiceResult =
  | {
      success: true;
      data: UserListItem[];
      total: number;
    }
  | {
      success: false;
      message: string;
    };

// ─── Search History ───

export type SearchTypeValue = 'IMAGE_ONLY' | 'TEXT_SEMANTIC' | 'TEXT_OCR';

export interface SearchHistoryClickedImage {
  id: string;
  imageUrl: string;
  width: number;
  height: number;
}

export interface SearchHistoryItem {
  id: string;
  searchType: SearchTypeValue;
  queryImagePath: string | null;
  queryText: string | null;
  clickedImage: SearchHistoryClickedImage | null;
  createdAt: Date;
}

export type SearchHistoryListApiResponse = ApiResponse<SearchHistoryItem[]>;

export type SearchHistoryServiceResult =
  | {
      success: true;
      data: SearchHistoryItem[];
      total: number;
    }
  | {
      success: false;
      message: string;
    };
