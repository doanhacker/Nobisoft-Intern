import { createFileRoute, redirect } from '@tanstack/react-router'
import { isAuthenticated } from '@/lib/authService'

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    // Smart redirect: authenticated → dashboard, guest → login
    if (isAuthenticated()) {
      throw redirect({ to: '/dashboard' })
    }
    throw redirect({ to: '/login' })
  },
})
