import * as React from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme, type Theme } from '@/hooks/useTheme'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ============================================================
// Types
// ============================================================

interface ThemeOption {
  value: Theme
  label: string
  icon: React.ElementType
}

const THEME_OPTIONS: ThemeOption[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
]

// ============================================================
// ThemeToggle
// ============================================================

/**
 * A 3-way theme toggle button with animated icon transitions.
 *
 * Shows the icon of the *currently active* theme.
 * On click, opens a small dropdown to pick light / dark / system.
 *
 * @example
 * <ThemeToggle />
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme()
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  React.useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Close on Escape
  React.useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  const current = THEME_OPTIONS.find((o) => o.value === theme) ?? THEME_OPTIONS[2]
  const CurrentIcon = current.icon

  return (
    <div ref={ref} className={cn('relative', className)}>
      {/* Trigger button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={`Current theme: ${current.label}. Click to change.`}
        aria-haspopup="true"
        aria-expanded={open}
        className="relative overflow-hidden"
      >
        {/* Icon with smooth crossfade animation */}
        <span
          key={theme}
          className="animate-in fade-in zoom-in-75 duration-200"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <CurrentIcon className="size-4" />
        </span>
      </Button>

      {/* Dropdown menu */}
      {open && (
        <div
          role="menu"
          className={cn(
            // Position: below the button, right-aligned
            'absolute right-0 top-full mt-2 z-[var(--z-dropdown)]',
            // Size & shape
            'min-w-[140px] rounded-xl p-1.5',
            // Background: glassmorphism that works in both themes
            'bg-background/95 backdrop-blur-md',
            'border border-border shadow-card',
            // Entrance animation
            'animate-in fade-in slide-in-from-top-2 duration-150',
          )}
        >
          {THEME_OPTIONS.map(({ value, label, icon: Icon }) => {
            const isActive = theme === value
            return (
              <button
                key={value}
                role="menuitem"
                onClick={() => {
                  setTheme(value)
                  setOpen(false)
                }}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium',
                  'transition-colors duration-100',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <Icon className="size-3.5 shrink-0" />
                {label}
                {isActive && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
