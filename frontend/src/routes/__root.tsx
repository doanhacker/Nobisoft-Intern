import * as React from 'react'
import { createRootRoute, Link, Outlet, useNavigate, useRouterState } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { ScanSearch, LogIn, LogOut, Search, Menu, X, LayoutDashboard, UploadCloud } from 'lucide-react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ThemeProvider } from '@/context/ThemeContext'
import { AuthProvider } from '@/context/AuthContext'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { ToastProvider } from '@/components/ui/Toast'
import { UploadProvider } from '@/context/UploadContext'

// Routes that use their own full-page layout (no shared header/footer)
const FULL_PAGE_ROUTES = ['/results']

export const Route = createRootRoute({
  component: RootComponent,
})

// ── Top loading bar ──────────────────────────────────────────
function NavigationProgress() {
  const isLoading = useRouterState({ select: (s) => s.status === 'pending' })
  if (!isLoading) return null
  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-[2px] overflow-hidden">
      <div
        className="h-full w-full animate-gradient-x"
        style={{
          background:
            'linear-gradient(90deg, oklch(0.52 0.22 268), oklch(0.72 0.15 200), oklch(0.60 0.22 290))',
          backgroundSize: '200% 100%',
        }}
      />
    </div>
  )
}

// ── Nav link (desktop) ───────────────────────────────────────
interface NavLinkProps {
  to: string
  children: React.ReactNode
  icon?: React.ReactNode
  onClick?: () => void
}

function NavLink({ to, children, icon, onClick }: NavLinkProps) {
  return (
    <Link
      to={to}
      onClick={onClick}
      activeProps={{
        className:
          'bg-primary/10 text-primary border-primary/30 shadow-sm',
      }}
      inactiveProps={{
        className:
          'text-muted-foreground hover:text-foreground hover:bg-muted/80 border-transparent',
      }}
      className="px-3 py-1.5 rounded-lg text-sm font-semibold tracking-wide border transition-all duration-200 cursor-pointer flex items-center gap-1.5"
    >
      {icon}
      {children}
    </Link>
  )
}

// ── Mobile menu item ─────────────────────────────────────────
function MobileNavLink({ to, children, icon, onClick }: NavLinkProps) {
  return (
    <Link
      to={to}
      onClick={onClick}
      activeProps={{
        className: 'bg-primary/10 text-primary',
      }}
      inactiveProps={{
        className: 'text-foreground hover:bg-muted/80',
      }}
      className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-150 cursor-pointer"
    >
      <span className="flex items-center justify-center size-8 rounded-lg bg-muted/60">
        {icon}
      </span>
      {children}
    </Link>
  )
}

// ── App shell ─────────────────────────────────────────────────
function AppShell() {
  const { isAuthenticated, logout, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = React.useState(false)
  const menuRef = React.useRef<HTMLDivElement>(null)

  // Detect if current route uses its own layout (no shared chrome)
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const isFullPageRoute = FULL_PAGE_ROUTES.some((r) => pathname.startsWith(r))

  const handleLogout = () => {
    logout()
    navigate({ to: '/login' })
    setMenuOpen(false)
  }

  // Close menu when clicking outside
  React.useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  // Close menu on route change (Escape key)
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Unifying layout to keep `<Outlet />` mounted in the same DOM path.
  // This prevents React from tearing down and remounting active components (e.g. ResultsPage) during transition.
  return (
    <div className="relative min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary/30 selection:text-primary-foreground">
      <NavigationProgress />

      {/* ── Glassmorphic Header ───────────────────────────── */}
      {!isFullPageRoute && (
        <header className="sticky top-0 z-[var(--z-sticky)] backdrop-blur-xl bg-background/75 border-b border-border/50 px-4 sm:px-6 py-3">
          {/* Gradient shimmer line at bottom of header */}
          <div
            className="absolute bottom-0 left-0 right-0 h-px"
            style={{
              background:
                'linear-gradient(90deg, transparent 0%, oklch(0.52 0.22 268 / 0.4) 30%, oklch(0.72 0.15 200 / 0.4) 60%, transparent 100%)',
            }}
          />

          <div className="max-w-7xl mx-auto flex items-center justify-between">
            {/* ── Brand ── */}
            <Link to="/" className="flex items-center gap-3 group">
              {/* Logo mark */}
              <div className="relative h-9 w-9 rounded-xl gradient-brand flex items-center justify-center shadow-brand transition-all duration-300 group-hover:scale-110 group-hover:shadow-[0_0_20px_oklch(0.52_0.22_268/0.5)]">
                <ScanSearch className="size-5 text-white" strokeWidth={2.5} />
              </div>
              {/* Brand name */}
              <div>
                <span className="font-extrabold text-lg text-gradient-brand tracking-wide block leading-tight">
                  Nobisoft
                </span>
                <span className="text-[10px] block text-muted-foreground font-semibold tracking-widest uppercase leading-tight">
                  Visual Search
                </span>
              </div>
            </Link>

            {/* ── Desktop Navigation ── */}
            <nav className="hidden sm:flex items-center gap-1.5">
              {isAuthenticated && (
                <>
                  <NavLink to="/search" icon={<Search className="size-3.5" />}>
                    Tìm kiếm
                  </NavLink>
                  <NavLink to="/upload" icon={<UploadCloud className="size-3.5" />}>
                    Tải ảnh lên
                  </NavLink>
                </>
              )}

              {isAuthenticated ? (
                <>
                  {isAdmin && (
                    <NavLink to="/admin" icon={<LayoutDashboard className="size-3.5" />}>
                      Admin Dashboard
                    </NavLink>
                  )}
                  <Button
                    id="header-logout"
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    className="text-muted-foreground hover:text-foreground gap-1.5"
                  >
                    <LogOut className="size-3.5" />
                    Đăng xuất
                  </Button>
                </>
              ) : (
                <>
                  <NavLink to="/login" icon={<LogIn className="size-3.5" />}>
                    Đăng nhập
                  </NavLink>
                  <Button id="header-register" variant="brand" size="sm" asChild>
                    <Link to="/register">Đăng ký</Link>
                  </Button>
                </>
              )}

              {/* Divider */}
              <div className="w-px h-5 bg-border/60 mx-1" />
              <ThemeToggle />
            </nav>

            {/* ── Mobile: Theme + Hamburger ── */}
            <div className="flex sm:hidden items-center gap-2" ref={menuRef}>
              <ThemeToggle />

              <button
                id="header-mobile-menu"
                aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'}
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((o) => !o)}
                className={cn(
                  'relative flex items-center justify-center size-9 rounded-xl border transition-all duration-200',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  menuOpen
                    ? 'bg-primary/10 border-primary/30 text-primary'
                    : 'bg-muted/40 border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/80',
                )}
              >
                {/* Animated hamburger → X */}
                <span
                  className={cn(
                    'absolute transition-all duration-200',
                    menuOpen ? 'opacity-100 rotate-0' : 'opacity-0 rotate-90',
                  )}
                >
                  <X className="size-4" />
                </span>
                <span
                  className={cn(
                    'absolute transition-all duration-200',
                    menuOpen ? 'opacity-0 -rotate-90' : 'opacity-100 rotate-0',
                  )}
                >
                  <Menu className="size-4" />
                </span>
              </button>

              {/* ── Dropdown Menu ── */}
              {menuOpen && (
                <div
                  className={cn(
                    'absolute top-full right-0 left-0 mt-0',
                    'bg-background/95 backdrop-blur-xl border-b border-border/50',
                    'px-4 py-3 flex flex-col gap-1',
                    'animate-fade-slide-down shadow-[0_8px_32px_oklch(0_0_0/0.12)]',
                  )}
                >
                  {/* Nav items */}
                  {isAuthenticated && (
                    <>
                      <MobileNavLink
                        to="/search"
                        icon={<Search className="size-4 text-muted-foreground" />}
                        onClick={() => setMenuOpen(false)}
                      >
                        Tìm kiếm
                      </MobileNavLink>
                      <MobileNavLink
                        to="/upload"
                        icon={<UploadCloud className="size-4 text-muted-foreground" />}
                        onClick={() => setMenuOpen(false)}
                      >
                        Tải ảnh lên
                      </MobileNavLink>
                    </>
                  )}

                  {isAuthenticated ? (
                    <>
                      {isAdmin && (
                        <MobileNavLink
                          to="/admin"
                          icon={<LayoutDashboard className="size-4 text-muted-foreground" />}
                          onClick={() => setMenuOpen(false)}
                        >
                          Admin Dashboard
                        </MobileNavLink>
                      )}

                      <div className="h-px bg-border/60 my-1" />

                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-destructive hover:bg-destructive/10 transition-all duration-150 cursor-pointer w-full text-left"
                      >
                        <span className="flex items-center justify-center size-8 rounded-lg bg-destructive/10">
                          <LogOut className="size-4 text-destructive" />
                        </span>
                        Đăng xuất
                      </button>
                    </>
                  ) : (
                    <>
                      <MobileNavLink
                        to="/login"
                        icon={<LogIn className="size-4 text-muted-foreground" />}
                        onClick={() => setMenuOpen(false)}
                      >
                        Đăng nhập
                      </MobileNavLink>

                      <div className="px-4 py-2">
                        <Button
                          variant="brand"
                          className="w-full"
                          asChild
                          onClick={() => setMenuOpen(false)}
                        >
                          <Link to="/register">Đăng ký ngay</Link>
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>
      )}

      {/* ── Main Content ── */}
      <main className="relative flex-1 z-[1]">
        <Outlet />
      </main>

      {/* ── Footer ── */}
      {!isFullPageRoute && (
        <footer className="relative z-[1] border-t border-border/50 bg-muted/20 py-5">
          <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded-md gradient-brand flex items-center justify-center">
                <ScanSearch className="size-3 text-white" />
              </div>
              <span className="font-semibold text-gradient-brand">Nobisoft</span>
              <span>Visual Search Engine</span>
            </div>
            <p>© {new Date().getFullYear()} Nobisoft · Powered by CLIP AI + React</p>
          </div>
        </footer>
      )}

      {/* Devtools */}
      <TanStackRouterDevtools position="bottom-right" />
    </div>
  )
}

function RootComponent() {
  return (
    <ThemeProvider defaultTheme="system">
      <AuthProvider>
        <UploadProvider>
          <ToastProvider>
            <TooltipProvider>
              <AppShell />
            </TooltipProvider>
          </ToastProvider>
        </UploadProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
