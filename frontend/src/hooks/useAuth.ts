import * as React from 'react'
import { AuthContext } from '@/context/AuthContext'

/**
 * Access the current auth state and actions.
 *
 * Must be used inside an `<AuthProvider>`.
 *
 * @example
 * const { user, isAuthenticated, login, logout } = useAuth()
 */
export function useAuth() {
  const ctx = React.useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an <AuthProvider>')
  }
  return ctx
}
