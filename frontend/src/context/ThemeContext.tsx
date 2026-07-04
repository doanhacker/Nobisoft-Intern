import * as React from 'react'

// ============================================================
// Types
// ============================================================

export type Theme = 'light' | 'dark' | 'system'

interface ThemeContextValue {
  /** The user-selected theme preference */
  theme: Theme
  /** The actual resolved theme ('light' or 'dark'), taking system into account */
  resolvedTheme: 'light' | 'dark'
  /** Set a new theme preference */
  setTheme: (theme: Theme) => void
}

// ============================================================
// Context
// ============================================================

const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined)

// ============================================================
// Provider
// ============================================================

const STORAGE_KEY = 'nobisoft-theme'

function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(resolved: 'light' | 'dark') {
  const root = document.documentElement
  if (resolved === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

interface ThemeProviderProps {
  children: React.ReactNode
  /** Default theme if nothing in localStorage. Defaults to 'system'. */
  defaultTheme?: Theme
}

export function ThemeProvider({ children, defaultTheme = 'system' }: ThemeProviderProps) {
  const [theme, setThemeState] = React.useState<Theme>(() => {
    try {
      return (localStorage.getItem(STORAGE_KEY) as Theme) ?? defaultTheme
    } catch {
      return defaultTheme
    }
  })

  const [systemTheme, setSystemTheme] = React.useState<'light' | 'dark'>(getSystemTheme)

  // Listen for OS color scheme changes
  React.useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')

    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light')
    }

    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [])

  const resolvedTheme: 'light' | 'dark' = theme === 'system' ? systemTheme : theme

  // Apply .dark class to <html> whenever resolved theme changes
  React.useEffect(() => {
    applyTheme(resolvedTheme)
  }, [resolvedTheme])

  const setTheme = React.useCallback((newTheme: Theme) => {
    try {
      localStorage.setItem(STORAGE_KEY, newTheme)
    } catch {
      // ignore localStorage errors (private browsing, etc.)
    }
    setThemeState(newTheme)
  }, [])

  const value = React.useMemo<ThemeContextValue>(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

// ============================================================
// Raw context export (for useTheme hook)
// ============================================================

export { ThemeContext }
