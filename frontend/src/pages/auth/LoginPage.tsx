import * as React from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { Eye, EyeOff, Loader2, LogIn, Sparkles } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

// ============================================================
// LoginPage
// ============================================================

export function LoginPage() {
  const { login, isLoading } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [showPassword, setShowPassword] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      await login({ email, password })
      navigate({ to: '/dashboard' })
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string; message?: string } } })?.response?.data
          ?.detail ??
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Email hoặc mật khẩu không đúng. Vui lòng thử lại.'
      setError(msg)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Left: Brand panel ── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden gradient-brand flex-col items-center justify-center p-12 text-white">
        {/* Background decoration */}
        <div className="absolute inset-0 gradient-brand opacity-90" />
        <div className="absolute top-[-80px] right-[-80px] w-[400px] h-[400px] rounded-full bg-white/5 blur-3xl" />
        <div className="absolute bottom-[-60px] left-[-60px] w-[300px] h-[300px] rounded-full bg-white/8 blur-2xl" />

        <div className="relative z-10 flex flex-col items-center text-center gap-8 max-w-sm">
          {/* Logo */}
          <div className="h-20 w-20 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-2xl">
            <span className="text-4xl font-black tracking-tight">N</span>
          </div>

          <div className="space-y-3">
            <h1 className="text-4xl font-black tracking-tight">Nobisoft</h1>
            <p className="text-xl font-medium text-white/80">Visual Search Engine</p>
          </div>

          <div className="w-16 h-px bg-white/30" />

          <p className="text-white/70 text-base leading-relaxed">
            Tìm kiếm hình ảnh bằng AI — nhanh, chính xác và thông minh hơn bao giờ hết.
          </p>

          {/* Feature chips */}
          <div className="flex flex-wrap gap-2 justify-center">
            {['Image Search', 'Semantic AI', 'OCR'].map((f) => (
              <span
                key={f}
                className="px-3 py-1 rounded-full bg-white/10 border border-white/20 text-sm font-medium backdrop-blur-sm"
              >
                {f}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right: Form panel ── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 bg-background">
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl gradient-brand flex items-center justify-center text-white font-black text-lg shadow-brand">
              N
            </div>
            <span className="text-xl font-black text-gradient-brand">Nobisoft</span>
          </div>

          {/* Heading */}
          <div className="space-y-1.5">
            <h2 className="text-3xl font-bold text-foreground tracking-tight">Chào mừng trở lại</h2>
            <p className="text-muted-foreground text-sm">
              Đăng nhập để tiếp tục sử dụng Visual Search
            </p>
          </div>

          {/* Error alert */}
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/8 px-4 py-3 text-sm text-destructive animate-in fade-in slide-in-from-top-2 duration-200"
            >
              <span className="mt-0.5 shrink-0">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="login-email">Email</Label>
              <Input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="h-10"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="login-password">Mật khẩu</Label>
                <button
                  type="button"
                  tabIndex={-1}
                  className="text-xs text-primary hover:underline underline-offset-2 transition-opacity"
                >
                  Quên mật khẩu?
                </button>
              </div>
              <div className="relative">
                <Input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-10 pr-10"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <Button
              id="login-submit"
              type="submit"
              variant="glow"
              size="lg"
              className="w-full"
              disabled={isLoading || !email || !password}
            >
              {isLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Đang đăng nhập...
                </>
              ) : (
                <>
                  <LogIn className="size-4" />
                  Đăng nhập
                </>
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-background px-3 text-muted-foreground">hoặc</span>
            </div>
          </div>

          {/* Register link */}
          <p className="text-center text-sm text-muted-foreground">
            Chưa có tài khoản?{' '}
            <Link
              to="/register"
              className={cn(
                'font-semibold text-primary hover:underline underline-offset-2',
                'inline-flex items-center gap-1 transition-opacity',
              )}
            >
              <Sparkles className="size-3" />
              Đăng ký ngay
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
