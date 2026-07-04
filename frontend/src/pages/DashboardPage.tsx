import { Link, useNavigate } from '@tanstack/react-router'
import { LogOut, Search, ShieldCheck, User } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'

// ============================================================
// DashboardPage — Demo protected page
// ============================================================

export function DashboardPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate({ to: '/login' })
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] flex flex-col items-center justify-center p-8">
      <div className="max-w-lg w-full space-y-8 text-center">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="h-20 w-20 rounded-2xl gradient-brand flex items-center justify-center shadow-brand glow-brand">
            <ShieldCheck className="size-10 text-white" />
          </div>
        </div>

        {/* Welcome */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">
            Xin chào, <span className="text-gradient-brand">{user?.name ?? 'User'}</span>! 👋
          </h1>
          <p className="text-muted-foreground">
            Bạn đã đăng nhập thành công. Đây là trang được bảo vệ bởi Auth Guard.
          </p>
        </div>

        {/* User info card */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-card text-left space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-border">
            <div className="h-10 w-10 rounded-full gradient-brand flex items-center justify-center text-white font-bold text-sm">
              {user?.name?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div>
              <p className="font-semibold text-foreground">{user?.name}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="space-y-0.5">
              <p className="text-muted-foreground text-xs uppercase tracking-wide">User ID</p>
              <p className="font-mono font-medium text-foreground">{user?.id ?? '—'}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-muted-foreground text-xs uppercase tracking-wide">Token</p>
              <p className="font-medium text-green-500 flex items-center gap-1">
                <ShieldCheck className="size-3.5" />
                Active
              </p>
            </div>
          </div>
        </div>

        {/* Auth guard info */}
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-left">
          <div className="flex items-center gap-2 mb-2">
            <User className="size-4 text-primary" />
            <span className="text-sm font-semibold text-primary">Auth Guard hoạt động</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Route này được bảo vệ bởi <code className="bg-muted px-1 py-0.5 rounded text-primary">requireAuth()</code> trong{' '}
            <code className="bg-muted px-1 py-0.5 rounded">beforeLoad</code>. Người dùng chưa đăng nhập
            sẽ tự động bị chuyển về <code className="bg-muted px-1 py-0.5 rounded">/login</code>.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="brand" size="lg" asChild>
            <Link to="/style-guide">
              <Search className="size-4" />
              Xem Design System
            </Link>
          </Button>
          <Button
            id="logout-button"
            variant="outline"
            size="lg"
            onClick={handleLogout}
          >
            <LogOut className="size-4" />
            Đăng xuất
          </Button>
        </div>
      </div>
    </div>
  )
}
