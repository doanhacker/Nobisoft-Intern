import * as React from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import {
  LayoutDashboard,
  Users,
  Images,
  ScanSearch,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================================
// Navigation items config
// ============================================================

const NAV_ITEMS = [
  {
    to: '/admin/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    to: '/admin/users',
    label: 'Người dùng',
    icon: Users,
  },
  {
    to: '/admin/images',
    label: 'Kho ảnh',
    icon: Images,
  },
] as const

// ============================================================
// SidebarNavItem
// ============================================================

interface SidebarNavItemProps {
  to: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  onClick?: () => void
}

function SidebarNavItem({ to, label, icon: Icon, onClick }: SidebarNavItemProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const isActive = pathname === to || (to !== '/admin/dashboard' && pathname.startsWith(to))

  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group',
        isActive
          ? 'bg-primary/10 text-primary shadow-sm'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/70',
      )}
    >
      <span
        className={cn(
          'flex items-center justify-center size-8 rounded-lg transition-colors',
          isActive ? 'bg-primary/15 text-primary' : 'bg-muted/50 group-hover:bg-muted',
        )}
      >
        <Icon className="size-4" />
      </span>
      <span className="flex-1">{label}</span>
      {isActive && <ChevronRight className="size-3.5 text-primary/60" />}
    </Link>
  )
}

// ============================================================
// AdminSidebar (desktop)
// ============================================================

interface AdminSidebarProps {
  onClose?: () => void
}

export function AdminSidebar({ onClose }: AdminSidebarProps) {
  return (
    <aside className="flex flex-col h-full w-64 border-r border-border/50 bg-card/50 backdrop-blur-sm">
      {/* ── Brand ── */}
      <div className="px-4 py-4 border-b border-border/50">
        <Link to="/" className="flex items-center gap-3 group" onClick={onClose}>
          <div className="relative h-8 w-8 rounded-lg gradient-brand flex items-center justify-center shadow-sm transition-all duration-300 group-hover:scale-105">
            <ScanSearch className="size-4 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <span className="font-extrabold text-sm text-gradient-brand tracking-wide block leading-tight">
              Nobisoft
            </span>
            <span className="text-[10px] block text-muted-foreground font-semibold tracking-widest uppercase leading-tight">
              Admin Panel
            </span>
          </div>
        </Link>
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="px-3 mb-2 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
          Quản lý
        </p>
        {NAV_ITEMS.map((item) => (
          <SidebarNavItem
            key={item.to}
            to={item.to}
            label={item.label}
            icon={item.icon}
            onClick={onClose}
          />
        ))}
      </nav>
    </aside>
  )
}
