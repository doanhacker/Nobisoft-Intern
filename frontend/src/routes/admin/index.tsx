import { createFileRoute, redirect } from '@tanstack/react-router'

// /admin → redirect to /admin/dashboard
export const Route = createFileRoute('/admin/')({
  component: () => null,
  beforeLoad: () => {
    throw redirect({ to: '/admin/dashboard' })
  },
})
