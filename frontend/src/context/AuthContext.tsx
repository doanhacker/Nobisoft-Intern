import * as React from 'react'
import {
  getToken,
  getUser,
  loginApi,
  logoutService,
  registerApi,
  setToken as setTokenStorage,
  setUser as setUserStorage,
  type LoginPayload,
  type RegisterPayload,
  type User,
} from '@/services/authService'

// ============================================================
// Types
// ============================================================

interface AuthContextValue {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (payload: LoginPayload) => Promise<void>
  register: (payload: RegisterPayload) => Promise<void>
  logout: () => void
  loginAsGuest: () => void
}

// ============================================================
// Context
// ============================================================

export const AuthContext = React.createContext<AuthContextValue | undefined>(undefined)

// ============================================================
// Provider
// ============================================================

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = React.useState<User | null>(() => getUser())
  const [token, setToken] = React.useState<string | null>(() => getToken())
  const [isLoading, setIsLoading] = React.useState(false)

  const isAuthenticatedState = Boolean(token)

  // ------------------------------------------------------------------
  // login
  // ------------------------------------------------------------------
  const login = React.useCallback(async (payload: LoginPayload) => {
    setIsLoading(true)
    try {
      const data = await loginApi(payload)
      setToken(data.accessToken)
      setUser(data.user)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // ------------------------------------------------------------------
  // loginAsGuest (bypass backend auth)
  // ------------------------------------------------------------------
  const loginAsGuest = React.useCallback(() => {
    const mockUser: User = {
      id: 'guest',
      name: 'Guest User',
      email: 'guest@nobisoft.com',
    }
    const mockToken = 'mock-guest-token'

    setTokenStorage(mockToken)
    setUserStorage(mockUser)
    setToken(mockToken)
    setUser(mockUser)
  }, [])

  // ------------------------------------------------------------------
  // register
  // ------------------------------------------------------------------
  const register = React.useCallback(async (payload: RegisterPayload) => {
    setIsLoading(true)
    try {
      const data = await registerApi(payload)
      setToken(data.accessToken)
      setUser(data.user)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // ------------------------------------------------------------------
  // logout
  // ------------------------------------------------------------------
  const logout = React.useCallback(() => {
    logoutService()
    setToken(null)
    setUser(null)
  }, [])

  const value = React.useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: isAuthenticatedState,
      isLoading,
      login,
      register,
      logout,
      loginAsGuest,
    }),
    [user, token, isAuthenticatedState, isLoading, login, register, logout, loginAsGuest],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
