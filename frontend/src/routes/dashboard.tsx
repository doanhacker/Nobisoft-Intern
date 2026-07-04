import { createFileRoute } from '@tanstack/react-router'
import { requireAuth } from '@/lib/authGuard'
import { DashboardPage } from '@/pages/DashboardPage'

export const Route = createFileRoute('/dashboard')({
  beforeLoad: requireAuth,
  component: DashboardPage,
})
