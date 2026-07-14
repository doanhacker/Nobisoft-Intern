import * as React from 'react'
import { Navigate, useLocation } from '@tanstack/react-router'
import { useAuth } from '@/hooks/useAuth'
import { ShieldX, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Link } from '@tanstack/react-router'

// ============================================================
// AdminGuard — protects /admin/* routes
// ============================================================
// Rules:
//   1. Not authenticated → redirect /login?redirect=<current>
//   2. Authenticated but not ADMIN → show 403 page inline
//   3. Authenticated + ADMIN → render children

interface AdminGuardProps {
  children: React.ReactNode
}

export function AdminGuard({ children }: AdminGuardProps) {
  const { isAuthenticated, isAdmin, isLoading } = useAuth()
  const location = useLocation()

  // While auth state is being resolved (e.g. initial hydration)
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  // Not logged in → redirect to login with redirect param
  if (!isAuthenticated) {
    return <Navigate to="/login" search={{ redirect: location.pathname }} />
  }

  // Logged in but not admin → 403 page
  if (!isAdmin) {
    return <ForbiddenPage />
  }

  return <>{children}</>
}

// ─── 403 Page ────────────────────────────────────────────────

function ForbiddenPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-center px-4 gap-6">
      <div className="flex items-center justify-center size-20 rounded-2xl bg-destructive/10 ring-1 ring-destructive/20">
        <ShieldX className="size-10 text-destructive" />
      </div>

      <div className="space-y-2 max-w-sm">
        <h1 className="text-5xl font-black text-destructive">403</h1>
        <h2 className="text-xl font-bold text-foreground">Không có quyền truy cập</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Trang này chỉ dành cho quản trị viên. Tài khoản của bạn không có quyền
          admin.
        </p>
      </div>

      <div className="flex gap-3">
        <Button variant="brand" asChild>
          <Link to="/search">Về trang tìm kiếm</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/login">Đăng nhập tài khoản khác</Link>
        </Button>
      </div>
    </div>
  )
}
