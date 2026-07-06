import { createFileRoute } from '@tanstack/react-router'
import { requireAuth } from '@/lib/authGuard'
import { SearchPage } from '@/pages/SearchPage'

export const Route = createFileRoute('/search')({
  beforeLoad: requireAuth,
  component: SearchPage,
})
