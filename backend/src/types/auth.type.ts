import type { ApiResponse } from './apiResponse.js';

export type AuthRole = 'USER' | 'ADMIN';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: AuthRole;
}

export interface JwtPayload {
  id: string;
  email: string;
  role: AuthRole;
}

export interface RegisterRequest {
  email: string;
  name: string;
  password: string;
}

export interface RegisterResponse {
  user: AuthUser & {
    createdAt: Date;
  };
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

export type AuthCheckResponse = null;

export type AdminDashboardResponse = null;

export type RegisterApiResponse = ApiResponse<RegisterResponse>;
export type LoginApiResponse = ApiResponse<LoginResponse>;
export type AuthCheckApiResponse = ApiResponse<AuthCheckResponse>;
export type AdminDashboardApiResponse = ApiResponse<AdminDashboardResponse>;

export type RegisterServiceResult =
  | {
      success: true;
      data: RegisterResponse;
    }
  | {
      success: false;
      message: string;
    };

export type LoginServiceResult =
  | {
      success: true;
      data: LoginResponse;
    }
  | {
      success: false;
      message: string;
    };
