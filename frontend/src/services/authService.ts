import axiosClient from './axiosClient'

// ============================================================
// Storage keys
// ============================================================

export const TOKEN_KEY = 'nobisoft_jwt'
export const USER_KEY = 'nobisoft_user'

// ============================================================
// Types
// ============================================================

export interface User {
  id: string | number
  name: string
  email: string
}

export interface AuthResponse {
  accessToken: string
  user: User
}

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  name: string
  email: string
  password: string
}

// ============================================================
// Token helpers — thin wrappers for localStorage
// ============================================================

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch {
    // ignore (private browsing, storage full, etc.)
  }
}

export function removeToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {}
}

// ============================================================
// User helpers
// ============================================================

export function getUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as User) : null
  } catch {
    return null
  }
}

export function setUser(user: User): void {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  } catch {}
}

export function removeUser(): void {
  try {
    localStorage.removeItem(USER_KEY)
  } catch {}
}

// ============================================================
// Auth check
// ============================================================

export function isAuthenticated(): boolean {
  return Boolean(getToken())
}

// ============================================================
// API calls
// ============================================================

export interface LoginApiResponse {
  success: boolean
  message: string
  data: AuthResponse
}

export interface RegisterApiResponse {
  success: boolean
  message: string
  data: {
    user: User
  }
}

/**
 * Login with email + password.
 * Persists token and user to localStorage on success.
 */
export async function loginApi(payload: LoginPayload): Promise<AuthResponse> {
  const response = await axiosClient.post<LoginApiResponse>('/auth/login', payload)
  const data = response.data.data
  
  setToken(data.accessToken)
  setUser(data.user)
  return data
}

/**
 * Register a new account.
 * Persists token and user to localStorage on success.
 */
export async function registerApi(payload: RegisterPayload): Promise<AuthResponse> {
  await axiosClient.post<RegisterApiResponse>('/auth/register', payload)
  
  return loginApi({ email: payload.email, password: payload.password })
}

/**
 * Logout — clears all auth data from localStorage.
 */
export function logoutService(): void {
  removeToken()
  removeUser()
}
