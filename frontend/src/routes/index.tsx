import { createFileRoute, redirect } from '@tanstack/react-router'
import { isAuthenticated } from '@/lib/authService'

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    // Smart redirect: authenticated → search, guest → login
    if (isAuthenticated()) {
      throw redirect({ to: '/search' })
    }
    throw redirect({ to: '/login' })
  },
})
