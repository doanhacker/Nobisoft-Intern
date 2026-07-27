import { createFileRoute } from '@tanstack/react-router'
import { requireAuth } from '@/lib/authGuard'
import { MyImagesPage } from '@/pages/MyImagesPage'

export const Route = createFileRoute('/my-images')({
  beforeLoad: requireAuth,
  component: MyImagesPage,
})
