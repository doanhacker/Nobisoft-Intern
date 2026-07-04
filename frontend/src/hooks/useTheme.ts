import * as React from 'react'
import { ThemeContext, type Theme } from '@/context/ThemeContext'

/**
 * Access the current theme state and setter.
 *
 * Must be used inside a `<ThemeProvider>`.
 *
 * @example
 * const { theme, resolvedTheme, setTheme } = useTheme()
 */
export function useTheme() {
  const ctx = React.useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme must be used within a <ThemeProvider>')
  }
  return ctx
}

export type { Theme }
