import { createFileRoute } from '@tanstack/react-router'
import { AdminSearchDeletePage } from '@/pages/admin/AdminSearchDeletePage'

export const Route = createFileRoute('/admin/search-delete')({
  component: AdminSearchDeletePage,
})
