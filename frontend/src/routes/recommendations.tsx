import { createFileRoute, redirect } from '@tanstack/react-router'
import { RecommendationsPage } from '@/pages/RecommendationsPage'
import { getToken } from '@/services/authService'

export const Route = createFileRoute('/recommendations')({
  beforeLoad: () => {
    if (!getToken()) {
      throw redirect({ to: '/login' })
    }
  },
  component: RecommendationsPage,
  validateSearch: (
    search: Record<string, unknown>,
  ): { page?: number; imageId?: string } => ({
    page: Number(search.page ?? 1),
    imageId: (search.imageId as string) ?? undefined,
  }),
})
