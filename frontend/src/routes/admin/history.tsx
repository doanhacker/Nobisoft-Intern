import { createFileRoute } from '@tanstack/react-router'
import { AdminHistoryPage } from '@/pages/admin/AdminHistoryPage'

export const Route = createFileRoute('/admin/history')({
  component: AdminHistoryPage,
  validateSearch: (
    search: Record<string, unknown>,
  ): { page?: number; searchType?: string; fromDate?: string; toDate?: string } => ({
    page: Number(search.page ?? 1),
    searchType: (search.searchType as string) ?? '',
    fromDate: (search.fromDate as string) ?? '',
    toDate: (search.toDate as string) ?? '',
  }),
})
