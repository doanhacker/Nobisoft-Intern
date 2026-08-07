import { createFileRoute } from '@tanstack/react-router'
import { MyImagesPage } from '@/pages/MyImagesPage'

// Default page for /my-images
export const Route = createFileRoute('/my-images/')({
  component: MyImagesPage,
})
