import { createFileRoute } from '@tanstack/react-router'
import { AdminLayout } from '@/components/admin/AdminLayout'

// ============================================================
// Admin Layout Route — wraps all /admin/* with AdminLayout
// TanStack Router: files named _layout.tsx create layout routes
// ============================================================

export const Route = createFileRoute('/admin')({
  component: AdminLayoutWrapper,
})

function AdminLayoutWrapper() {
  return <AdminLayout />
}
