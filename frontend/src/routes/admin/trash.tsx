import { createFileRoute } from '@tanstack/react-router'
import { TrashPage } from '@/pages/TrashPage'

export const Route = createFileRoute('/admin/trash')({
  component: TrashPage,
})
