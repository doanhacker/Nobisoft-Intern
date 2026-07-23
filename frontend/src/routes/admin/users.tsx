import { createFileRoute, Outlet, useRouterState } from '@tanstack/react-router'
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage'

export const Route = createFileRoute('/admin/users')({
  component: AdminUsersLayout,
  validateSearch: (search: Record<string, unknown>): { page?: number; search?: string } => ({
    page: Number(search.page ?? 1),
    search: String(search.search ?? ''),
  }),
})

// Layout wrapper: renders the users list when on exact /admin/users,
// or renders the child outlet when on /admin/users/$userId
function AdminUsersLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  // If we're exactly on /admin/users (no child segment), show the list
  const isExact = pathname === '/admin/users' || pathname === '/admin/users/'
  return isExact ? <AdminUsersPage /> : <Outlet />
}


