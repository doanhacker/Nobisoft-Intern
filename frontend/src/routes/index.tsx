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
  ): { imageId?: string } => ({
    // `page` removed — infinite scroll manages page internally in HomePage
    imageId: (search.imageId as string) ?? undefined,
  }),
})
