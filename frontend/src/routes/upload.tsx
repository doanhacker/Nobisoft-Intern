import { createFileRoute } from '@tanstack/react-router'
import { UserUploadPage } from '@/pages/UserUploadPage'

export const Route = createFileRoute('/upload')({
  component: UserUploadPage,
})
