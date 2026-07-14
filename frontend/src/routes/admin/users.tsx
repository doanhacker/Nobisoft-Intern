import { createFileRoute } from '@tanstack/react-router'
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage'

export const Route = createFileRoute('/admin/users')({
  component: AdminUsersPage,
  validateSearch: (search: Record<string, unknown>): { page?: number; search?: string } => ({
    page: Number(search.page ?? 1),
    search: String(search.search ?? ''),
  }),
})
