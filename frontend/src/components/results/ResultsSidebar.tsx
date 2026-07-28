import * as React from 'react'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { ScanSearch, Home, Search, LogOut, UserCircle2, LogIn } from 'lucide-react'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

// ============================================================
// ResultsSidebar — Pinterest-style vertical left sidebar
// Fixed 68px wide, icon-only with tooltips
// ============================================================

interface SidebarIconButtonProps {
  to?: string
  onClick?: () => void
  icon: React.ElementType
  label: string
  active?: boolean
}

function SidebarIconButton({ to, onClick, icon: Icon, label, active }: SidebarIconButtonProps) {
  const content = (
    <span
      className={cn(
        'group relative flex items-center justify-center size-11 rounded-2xl transition-all duration-200',
        active
          ? 'bg-primary/15 text-primary shadow-sm'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/80',
      )}
      title={label}
    >
      <Icon className="size-5 shrink-0" />
      {/* Tooltip */}
      <span
        className={cn(
          'pointer-events-none absolute left-full ml-3 z-50',
          'px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap',
          'bg-foreground/90 text-background shadow-lg',
          'opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100',
          'transition-all duration-150',
        )}
      >
        {label}
        {/* Arrow */}
        <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-foreground/90" />
      </span>
    </span>
  )

  if (to) {
    return (
      <Link to={to}>
        {content}
      </Link>
    )
  }

  return (
    <button type="button" onClick={onClick} className="flex items-center">
      {content}
    </button>
  )
}

interface ResultsSidebarProps {
  className?: string
}

export function ResultsSidebar({ className }: ResultsSidebarProps) {
  const { isAuthenticated, user, logout } = useAuth()
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  const handleLogout = () => {
    logout()
    navigate({ to: '/login' })
  }

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen z-40',
        'flex flex-col items-center py-4 gap-2',
        'w-[68px] shrink-0',
        'bg-background/95 backdrop-blur-xl',
        'border-r border-border/50',
        className,
      )}
    >
      {/* ── Logo ── */}
      <Link
        to="/"
        className="flex items-center justify-center mb-3 group"
        title="Nobisoft Visual Search"
      >
        <div
          className={cn(
            'relative h-10 w-10 rounded-xl gradient-brand flex items-center justify-center',
            'shadow-brand transition-all duration-300',
            'group-hover:scale-110 group-hover:shadow-[0_0_20px_oklch(0.52_0.22_268/0.5)]',
          )}
        >
          <ScanSearch className="size-5 text-white" strokeWidth={2.5} />
        </div>
      </Link>

      {/* ── Divider ── */}
      <div className="w-8 h-px bg-border/60 mb-1" />

      {/* ── Nav items ── */}
      <nav className="flex flex-col items-center gap-1 flex-1">
        <SidebarIconButton
          to="/"
          icon={Home}
          label="Trang chủ"
        />

        {isAuthenticated && (
          <SidebarIconButton
            to="/search"
            icon={Search}
            label="Tìm kiếm mới"
            active={pathname === '/search'}
          />
        )}

      </nav>

      {/* ── Bottom controls ── */}
      <div className="flex flex-col items-center gap-2 mt-auto">
        {/* Theme toggle */}
        <span className="flex items-center justify-center size-11 rounded-2xl hover:bg-muted/80 transition-colors cursor-pointer [&>div]:relative">
          <ThemeToggle menuAlign="left" menuPosition="top" />
        </span>

        {/* User / Auth */}
        {isAuthenticated ? (
          <SidebarIconButton
            onClick={handleLogout}
            icon={LogOut}
            label={`Đăng xuất (${user?.name?.split(' ').at(-1) ?? ''})`}
          />
        ) : (
          <SidebarIconButton
            to="/login"
            icon={LogIn}
            label="Đăng nhập"
          />
        )}

        {isAuthenticated && (
          <Link
            to="/dashboard"
            className="size-9 rounded-full gradient-brand flex items-center justify-center text-white text-xs font-bold shadow-sm hover:scale-110 transition-transform duration-200"
            title={`Dashboard (${user?.name ?? 'User'})`}
          >
            {user?.name?.charAt(0).toUpperCase() ?? <UserCircle2 className="size-4" />}
          </Link>
        )}
      </div>
    </aside>
  )
}
