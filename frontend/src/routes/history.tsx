import { createFileRoute, redirect } from '@tanstack/react-router'
import { SearchHistoryPage } from '@/pages/SearchHistoryPage'
import { getToken } from '@/services/authService'

export const Route = createFileRoute('/history')({
  // Guard: redirect to login if not authenticated
  beforeLoad: () => {
    if (!getToken()) {
      throw redirect({ to: '/login' })
    }
  },
  component: SearchHistoryPage,
  validateSearch: (
    search: Record<string, unknown>,
  ): { page?: number; searchType?: string; fromDate?: string; toDate?: string } => ({
    page: Number(search.page ?? 1),
    searchType: (search.searchType as string) ?? '',
    fromDate: (search.fromDate as string) ?? '',
    toDate: (search.toDate as string) ?? '',
  }),
})
