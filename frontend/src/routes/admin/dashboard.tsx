import { createFileRoute } from '@tanstack/react-router'
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage'

export const Route = createFileRoute('/admin/dashboard')({
  component: AdminDashboardPage,
})
