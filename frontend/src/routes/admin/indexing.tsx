import { createFileRoute } from '@tanstack/react-router'
import { AdminIndexingPage } from '@/pages/admin/AdminIndexingPage'

export const Route = createFileRoute('/admin/indexing')({
  component: AdminIndexingPage,
})
