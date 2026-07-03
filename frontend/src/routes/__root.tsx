import { createRootRoute, Link, Outlet, useNavigate } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { LogIn, LogOut, UserCircle2 } from 'lucide-react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ThemeProvider } from '@/context/ThemeContext'
import { AuthProvider } from '@/context/AuthContext'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'

export const Route = createRootRoute({
  component: RootComponent,
})

// ── Inner component (needs AuthProvider above it to use useAuth) ──
function AppShell() {
  const { isAuthenticated, user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate({ to: '/login' })
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary/30 selection:text-primary-foreground">
      {/* Premium Glassmorphic Header */}
      <header className="sticky top-0 z-[var(--z-sticky)] backdrop-blur-md bg-background/80 border-b border-border/60 px-6 py-3 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="h-9 w-9 rounded-xl gradient-brand flex items-center justify-center font-bold text-base text-white shadow-brand transition-transform group-hover:scale-105">
              N
            </div>
            <div>
              <span className="font-extrabold text-lg text-gradient-brand tracking-wide">
                Nobisoft
              </span>
              <span className="text-[10px] block text-muted-foreground font-semibold tracking-wider uppercase -mt-0.5">
                Visual Search
              </span>
            </div>
          </Link>

          {/* Nav + Theme Toggle */}
          <nav className="flex items-center gap-2">
            <Link
              to="/style-guide"
              activeProps={{ className: 'bg-primary/10 text-primary border-primary/30' }}
              inactiveProps={{
                className:
                  'text-muted-foreground hover:text-foreground hover:bg-muted border-transparent',
              }}
              className="px-3 py-1.5 rounded-lg text-sm font-semibold tracking-wide border transition-all duration-200 cursor-pointer flex items-center gap-1.5"
            >
              <span>🎨</span> Style Guide
            </Link>

            {/* Auth-aware nav */}
            {isAuthenticated ? (
              <>
                <Link
                  to="/dashboard"
                  activeProps={{ className: 'bg-primary/10 text-primary border-primary/30' }}
                  inactiveProps={{
                    className:
                      'text-muted-foreground hover:text-foreground hover:bg-muted border-transparent',
                  }}
                  className="px-3 py-1.5 rounded-lg text-sm font-semibold tracking-wide border transition-all duration-200 cursor-pointer flex items-center gap-1.5"
                >
                  <UserCircle2 className="size-3.5" />
                  {user?.name?.split(' ').at(-1) ?? 'Dashboard'}
                </Link>
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
                <Link
                  to="/login"
                  activeProps={{ className: 'bg-primary/10 text-primary border-primary/30' }}
                  inactiveProps={{
                    className:
                      'text-muted-foreground hover:text-foreground hover:bg-muted border-transparent',
                  }}
                  className="px-3 py-1.5 rounded-lg text-sm font-semibold tracking-wide border transition-all duration-200 cursor-pointer flex items-center gap-1.5"
                >
                  <LogIn className="size-3.5" />
                  Đăng nhập
                </Link>
                <Button id="header-register" variant="brand" size="sm" asChild>
                  <Link to="/register">Đăng ký</Link>
                </Button>
              </>
            )}

            {/* Divider */}
            <div className="w-px h-5 bg-border mx-1" />

            {/* Theme Toggle */}
            <ThemeToggle />
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30 py-5 text-center text-xs text-muted-foreground">
        <p>
          &copy; {new Date().getFullYear()} Nobisoft. Visual Search Engine — Built with React &amp;
          Vite.
        </p>
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
