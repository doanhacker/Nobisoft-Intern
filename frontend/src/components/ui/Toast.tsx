import * as React from 'react'
import { CheckCircle2, XCircle, AlertTriangle, Info, X, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================================
// Toast — Lightweight notification system
// ============================================================

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastItem {
  id: string
  type: ToastType
  message: string
  description?: string
  duration?: number // ms, 0 = sticky
  onRetry?: () => void
}

// ── Context ──────────────────────────────────────────────────
interface ToastContextValue {
  toasts: ToastItem[]
  push: (toast: Omit<ToastItem, 'id'>) => void
  dismiss: (id: string) => void
  success: (message: string, opts?: Partial<ToastItem>) => void
  error: (message: string, opts?: Partial<ToastItem>) => void
  warning: (message: string, opts?: Partial<ToastItem>) => void
  info: (message: string, opts?: Partial<ToastItem>) => void
}

const ToastContext = React.createContext<ToastContextValue | null>(null)

export function useToast() {
  const ctx = React.useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}

// ── Duration constants ────────────────────────────────────────
const TOAST_DURATIONS = {
  success: 4000,
  info: 4000,
  warning: 6000,
  error: 6000,
  errorWithRetry: 10000, // auto-dismiss after 10s even when retry button shown
} as const

// ── Provider ─────────────────────────────────────────────────
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([])

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const push = React.useCallback(
    (toast: Omit<ToastItem, 'id'>) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`
      const item: ToastItem = { duration: TOAST_DURATIONS.info, ...toast, id }
      setToasts((prev) => [item, ...prev].slice(0, 5)) // max 5 toasts
      if (item.duration && item.duration > 0) {
        setTimeout(() => dismiss(id), item.duration)
      }
    },
    [dismiss],
  )

  const success = React.useCallback(
    (message: string, opts?: Partial<ToastItem>) =>
      push({ duration: TOAST_DURATIONS.success, ...opts, type: 'success', message }),
    [push],
  )
  const error = React.useCallback(
    (message: string, opts?: Partial<ToastItem>) =>
      push({
        duration: opts?.onRetry ? TOAST_DURATIONS.errorWithRetry : TOAST_DURATIONS.error,
        ...opts,
        type: 'error',
        message,
      }),
    [push],
  )
  const warning = React.useCallback(
    (message: string, opts?: Partial<ToastItem>) =>
      push({ duration: TOAST_DURATIONS.warning, ...opts, type: 'warning', message }),
    [push],
  )
  const info = React.useCallback(
    (message: string, opts?: Partial<ToastItem>) =>
      push({ duration: TOAST_DURATIONS.info, ...opts, type: 'info', message }),
    [push],
  )

  return (
    <ToastContext.Provider value={{ toasts, push, dismiss, success, error, warning, info }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

// ── Single Toast item ─────────────────────────────────────────
const TOAST_CONFIG: Record<
  ToastType,
  { icon: React.ElementType; bgClass: string; borderClass: string; iconClass: string }
> = {
  success: {
    icon: CheckCircle2,
    bgClass: 'bg-background',
    borderClass: 'border-green-500/40',
    iconClass: 'text-green-500',
  },
  error: {
    icon: XCircle,
    bgClass: 'bg-background',
    borderClass: 'border-destructive/40',
    iconClass: 'text-destructive',
  },
  warning: {
    icon: AlertTriangle,
    bgClass: 'bg-background',
    borderClass: 'border-amber-500/40',
    iconClass: 'text-amber-500',
  },
  info: {
    icon: Info,
    bgClass: 'bg-background',
    borderClass: 'border-primary/30',
    iconClass: 'text-primary',
  },
}

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: string) => void }) {
  const config = TOAST_CONFIG[toast.type]
  const Icon = config.icon

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        'flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg',
        'backdrop-blur-xl max-w-sm w-full',
        'animate-fade-slide-down',
        config.bgClass,
        config.borderClass,
      )}
    >
      <Icon className={cn('size-4 shrink-0 mt-0.5', config.iconClass)} />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground leading-snug">{toast.message}</p>
        {toast.description && (
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{toast.description}</p>
        )}
        {toast.onRetry && (
          <button
            type="button"
            onClick={() => {
              toast.onRetry?.()
              onDismiss(toast.id)
            }}
            className="mt-2 flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            <RefreshCw className="size-3" />
            Thử lại
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 p-0.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        aria-label="Đóng thông báo"
      >
        <X className="size-3.5" />
      </button>
    </div>
  )
}

// ── Container (portal-like, fixed top-right) ──────────────────
function ToastContainer({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null
  return (
    <div
      aria-label="Notifications"
      className="fixed top-20 right-4 z-[var(--z-toast,9000)] flex flex-col gap-2 pointer-events-none"
    >
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastCard toast={t} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  )
}
