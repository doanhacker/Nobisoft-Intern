import { createFileRoute } from '@tanstack/react-router'
import { requireAuth } from '@/lib/authGuard'
import { TrashPage } from '@/pages/TrashPage'

export const Route = createFileRoute('/my-images/trash')({
  beforeLoad: requireAuth,
  component: TrashPage,
})
