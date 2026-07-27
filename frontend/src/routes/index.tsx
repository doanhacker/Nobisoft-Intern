import { createFileRoute, redirect } from '@tanstack/react-router'
import { getToken } from '@/services/authService'
import { HomePage } from '@/pages/HomePage'

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    // Guest → login; authenticated → render HomePage directly
    if (!getToken()) {
      throw redirect({ to: '/login' })
    }
  },
  component: HomePage,
  validateSearch: (
    search: Record<string, unknown>,
  ): { page?: number; imageId?: string } => ({
    page: Number(search.page ?? 1),
    imageId: (search.imageId as string) ?? undefined,
  }),
})
