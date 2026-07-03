import { createRootRoute, Link, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';
import { TooltipProvider } from '@/components/ui/tooltip';

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  return (
    <TooltipProvider>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
        {/* Premium Glassmorphic Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-900/80 border-b border-slate-800/80 px-6 py-4 shadow-lg shadow-slate-950/20">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center font-bold text-lg text-white shadow-lg shadow-indigo-500/30">
              TS
            </div>
            <div>
              <span className="font-extrabold text-xl bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent tracking-wide">
                TanStack
              </span>
              <span className="text-xs block text-slate-400 font-semibold tracking-wider uppercase -mt-1">
                Router App
              </span>
            </div>
          </div>

          <nav className="flex items-center gap-2">
            <Link
              to="/style-guide"
              activeProps={{
                className: 'bg-indigo-600/30 text-indigo-400 border-indigo-500/50 shadow-inner',
              }}
              inactiveProps={{
                className: 'text-slate-300 hover:text-white hover:bg-slate-800/50 border-transparent',
              }}
              className="px-4 py-2 rounded-lg text-sm font-semibold tracking-wide border transition-all duration-300 ease-in-out cursor-pointer flex items-center gap-1.5"
            >
              <span>🎨</span> Style Guide
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <p>&copy; {new Date().getFullYear()} TanStack Router Setup. Built with React & Vite.</p>
      </footer>

      {/* Devtools */}
      <TanStackRouterDevtools position="bottom-right" />
    </div>
    </TooltipProvider>
  );
}
