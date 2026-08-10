import { redirect } from '@tanstack/react-router'
import { isAuthenticated } from '../services/authService'

// ============================================================
// Auth guard helpers for TanStack Router `beforeLoad`
// ============================================================

/**
 * Use in `beforeLoad` of protected routes.
 * Redirects to /login if the user is not authenticated.
 *
 * @example
 * export const Route = createFileRoute('/dashboard')({
 *   beforeLoad: requireAuth,
 *   component: DashboardPage,
 * })
 */
export function requireAuth() {
  if (!isAuthenticated()) {
    throw redirect({ to: '/login' })
  }
}

/**
 * Use in `beforeLoad` of guest-only routes (login, register).
 * Redirects authenticated users away from auth pages.
 *
 * @example
 * export const Route = createFileRoute('/login')({
 *   beforeLoad: requireGuest,
 *   component: LoginPage,
 * })
 */
export function requireGuest() {
  if (isAuthenticated()) {
    throw redirect({ to: '/search' })
  }
}
