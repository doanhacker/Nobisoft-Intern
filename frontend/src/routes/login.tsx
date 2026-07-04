import { createFileRoute } from '@tanstack/react-router'
import { requireGuest } from '@/lib/authGuard'
import { LoginPage } from '@/pages/auth/LoginPage'

export const Route = createFileRoute('/login')({
  beforeLoad: requireGuest,
  component: LoginPage,
})
