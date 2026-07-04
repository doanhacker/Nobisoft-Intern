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
  access_token: string
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

/**
 * Login with email + password.
 * Persists token and user to localStorage on success.
 */
export async function loginApi(payload: LoginPayload): Promise<AuthResponse> {
  const { data } = await axiosClient.post<AuthResponse>('/auth/login', payload)
  setToken(data.access_token)
  setUser(data.user)
  return data
}

/**
 * Register a new account.
 * Persists token and user to localStorage on success.
 */
export async function registerApi(payload: RegisterPayload): Promise<AuthResponse> {
  const { data } = await axiosClient.post<AuthResponse>('/auth/register', payload)
  setToken(data.access_token)
  setUser(data.user)
  return data
}

/**
 * Logout — clears all auth data from localStorage.
 */
export function logoutService(): void {
  removeToken()
  removeUser()
}
