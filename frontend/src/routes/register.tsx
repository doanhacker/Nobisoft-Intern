import { createFileRoute } from '@tanstack/react-router'
import { requireGuest } from '@/lib/authGuard'
import { RegisterPage } from '@/pages/auth/RegisterPage'

export const Route = createFileRoute('/register')({
  beforeLoad: requireGuest,
  component: RegisterPage,
})
