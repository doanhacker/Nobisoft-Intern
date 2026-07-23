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
