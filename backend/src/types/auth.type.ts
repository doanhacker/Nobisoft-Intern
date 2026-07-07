export type AuthRole = 'USER' | 'ADMIN';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
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

export type RegisterServiceResult =
  | {
      success: true;
      user: RegisterResponse['user'];
    }
  | {
      success: false;
      message: string;
    };

export type LoginServiceResult =
  | {
      success: true;
      accessToken: string;
      user: AuthUser;
    }
  | {
      success: false;
      message: string;
    };
