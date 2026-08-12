import * as React from 'react'
import { Outlet, useRouterState } from '@tanstack/react-router'
import { Menu } from 'lucide-react'
import { AdminSidebar } from './AdminSidebar'
import { AdminGuard } from './AdminGuard'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { ToastProvider } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'

// ============================================================
// AdminLayout — full-page layout for /admin/* routes
// Separate from the main user layout (no shared header/footer)
// ============================================================

export function AdminLayout() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false)
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  // Close mobile sidebar on route change
  React.useEffect(() => {
    setMobileSidebarOpen(false)
  }, [pathname])

  // Close on Escape
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileSidebarOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <AdminGuard>
      <ToastProvider>
        <div className="flex h-screen overflow-hidden bg-background text-foreground font-sans">
          {/* ── Desktop Sidebar ── */}
          <div className="hidden lg:flex">
            <AdminSidebar />
          </div>

          {/* ── Mobile Sidebar Overlay ── */}
          {mobileSidebarOpen && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
                onClick={() => setMobileSidebarOpen(false)}
              />
              {/* Sidebar drawer */}
              <div className="fixed inset-y-0 left-0 z-50 lg:hidden flex animate-in slide-in-from-left duration-200">
                <AdminSidebar onClose={() => setMobileSidebarOpen(false)} />
              </div>
            </>
          )}

          {/* ── Main content area ── */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* ── Mobile top bar ── */}
            <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-border/50 bg-card/50 backdrop-blur-sm">
              <button
                onClick={() => setMobileSidebarOpen(true)}
                className={cn(
                  'flex items-center justify-center size-9 rounded-xl border transition-all duration-200',
                  'bg-muted/40 border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/80',
                )}
                aria-label="Mở menu admin"
              >
                <Menu className="size-4" />
              </button>

              <span className="font-bold text-sm text-gradient-brand">Quản lý cá nhân</span>

              <ThemeToggle />
            </div>

            {/* ── Scrollable page content ── */}
            <main className="flex-1 overflow-y-auto">
              <Outlet />
            </main>
          </div>
        </div>
      </ToastProvider>
    </AdminGuard>
  )
}
