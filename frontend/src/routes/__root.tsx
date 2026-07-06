import { createRootRoute, Link, Outlet, useNavigate, useRouterState } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { ScanSearch, LogIn, LogOut, Search, UserCircle2 } from 'lucide-react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ThemeProvider } from '@/context/ThemeContext'
import { AuthProvider } from '@/context/AuthContext'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'

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

// ── Nav link ─────────────────────────────────────────────────
interface NavLinkProps {
  to: string
  children: React.ReactNode
  icon?: React.ReactNode
}

function NavLink({ to, children, icon }: NavLinkProps) {
  return (
    <Link
      to={to}
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

// ── App shell ─────────────────────────────────────────────────
function AppShell() {
  const { isAuthenticated, user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate({ to: '/login' })
  }

  return (
    <div className="relative min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary/30 selection:text-primary-foreground">
      <NavigationProgress />

      {/* ── Glassmorphic Header ───────────────────────────── */}
      <header className="sticky top-0 z-[var(--z-sticky)] backdrop-blur-xl bg-background/75 border-b border-border/50 px-6 py-3">
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

          {/* ── Navigation ── */}
          <nav className="flex items-center gap-1.5">
            {isAuthenticated && (
              <NavLink to="/search" icon={<Search className="size-3.5" />}>
                Search
              </NavLink>
            )}

            {/* Auth-aware nav */}
            {isAuthenticated ? (
              <>
                <NavLink to="/dashboard" icon={<UserCircle2 className="size-3.5" />}>
                  {user?.name?.split(' ').at(-1) ?? 'Dashboard'}
                </NavLink>
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

            {/* Theme Toggle */}
            <ThemeToggle />
          </nav>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="relative flex-1 z-[1]">
        <Outlet />
      </main>

      {/* ── Footer ── */}
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

      {/* Devtools */}
      <TanStackRouterDevtools position="bottom-right" />
    </div>
  )
}

function RootComponent() {
  return (
    <ThemeProvider defaultTheme="system">
      <AuthProvider>
        <TooltipProvider>
          <AppShell />
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
