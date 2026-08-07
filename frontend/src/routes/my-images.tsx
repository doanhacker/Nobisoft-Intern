import { createFileRoute, Outlet } from '@tanstack/react-router'
import { requireAuth } from '@/lib/authGuard'

// Layout wrapper for /my-images/* routes
// Renders child routes (index = MyImagesPage, trash = TrashPage) via <Outlet>
export const Route = createFileRoute('/my-images')({
  beforeLoad: requireAuth,
  component: MyImagesLayout,
})

function MyImagesLayout() {
  return <Outlet />
}
