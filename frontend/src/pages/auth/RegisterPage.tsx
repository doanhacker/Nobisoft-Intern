import * as React from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { Eye, EyeOff, Loader2, Sparkles, UserPlus } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

// ============================================================
// RegisterPage
// ============================================================

export function RegisterPage() {
  const { register, isLoading } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [confirmPassword, setConfirmPassword] = React.useState('')
  const [showPassword, setShowPassword] = React.useState(false)
  const [showConfirm, setShowConfirm] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({})

  // ── Client-side validation ──
  const validate = (): boolean => {
    const errs: Record<string, string> = {}

    if (!name.trim()) errs.name = 'Vui lòng nhập họ tên.'
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) errs.email = 'Email không hợp lệ.'
    if (password.length < 8) errs.password = 'Mật khẩu tối thiểu 8 ký tự.'
    if (password !== confirmPassword) errs.confirmPassword = 'Mật khẩu xác nhận không khớp.'

    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!validate()) return

    try {
      await register({ name, email, password })
      navigate({ to: '/search' })
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string; message?: string } } })?.response?.data
          ?.detail ??
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Đăng ký không thành công. Vui lòng thử lại.'
      setError(msg)
    }
  }

  // ── Password strength indicator ──
  const strength = React.useMemo(() => {
    if (!password) return 0
    let s = 0
    if (password.length >= 8) s++
    if (/[A-Z]/.test(password)) s++
    if (/[0-9]/.test(password)) s++
    if (/[^A-Za-z0-9]/.test(password)) s++
    return s
  }, [password])

  const strengthLabel = ['', 'Yếu', 'Trung bình', 'Khá', 'Mạnh'][strength] ?? ''
  const strengthColor = ['', 'bg-destructive', 'bg-amber-500', 'bg-yellow-400', 'bg-green-500'][strength] ?? ''

  return (
    <div className="min-h-screen flex">
      {/* ── Left: Brand panel ── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden gradient-brand flex-col items-center justify-center p-12 text-white">
        <div className="absolute inset-0 gradient-brand opacity-90" />
        <div className="absolute top-[-80px] right-[-80px] w-[400px] h-[400px] rounded-full bg-white/5 blur-3xl" />
        <div className="absolute bottom-[-60px] left-[-60px] w-[300px] h-[300px] rounded-full bg-white/8 blur-2xl" />

        <div className="relative z-10 flex flex-col items-center text-center gap-8 max-w-sm">
          <div className="h-20 w-20 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-2xl">
            <span className="text-4xl font-black tracking-tight">N</span>
          </div>

          <div className="space-y-3">
            <h1 className="text-4xl font-black tracking-tight">Bắt đầu</h1>
            <p className="text-xl font-medium text-white/80">Tạo tài khoản miễn phí</p>
          </div>

          <div className="w-16 h-px bg-white/30" />

          <p className="text-white/70 text-base leading-relaxed">
            Tham gia Nobisoft và khám phá sức mạnh của tìm kiếm hình ảnh bằng AI.
          </p>

          {/* Steps */}
          <div className="flex flex-col gap-3 w-full text-left">
            {[
              ['01', 'Tạo tài khoản'],
              ['02', 'Upload hoặc nhập URL hình ảnh'],
              ['03', 'Nhận kết quả tức thì'],
            ].map(([num, label]) => (
              <div key={num} className="flex items-center gap-3">
                <span className="h-7 w-7 rounded-lg bg-white/15 border border-white/20 flex items-center justify-center text-xs font-bold">
                  {num}
                </span>
                <span className="text-sm text-white/80">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right: Form panel ── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 bg-background">
        <div className="w-full max-w-sm space-y-7">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3">
            <div className="h-10 w-10 rounded-xl gradient-brand flex items-center justify-center text-white font-black text-lg shadow-brand">
              N
            </div>
            <span className="text-xl font-black text-gradient-brand">Nobisoft</span>
          </div>

          {/* Heading */}
          <div className="space-y-1.5">
            <h2 className="text-3xl font-bold text-foreground tracking-tight">Tạo tài khoản</h2>
            <p className="text-muted-foreground text-sm">
              Điền thông tin để bắt đầu sử dụng Nobisoft
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
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Full name */}
            <div className="space-y-1.5">
              <Label htmlFor="reg-name">Họ và tên</Label>
              <Input
                id="reg-name"
                type="text"
                autoComplete="name"
                placeholder="Nguyễn Văn A"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                aria-invalid={!!fieldErrors.name}
                className="h-10"
              />
              {fieldErrors.name && (
                <p className="text-xs text-destructive">{fieldErrors.name}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="reg-email">Email</Label>
              <Input
                id="reg-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                aria-invalid={!!fieldErrors.email}
                className="h-10"
              />
              {fieldErrors.email && (
                <p className="text-xs text-destructive">{fieldErrors.email}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="reg-password">Mật khẩu</Label>
              <div className="relative">
                <Input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Tối thiểu 8 ký tự"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  aria-invalid={!!fieldErrors.password}
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

              {/* Password strength bar */}
              {password && (
                <div className="space-y-1.5 animate-in fade-in duration-200">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={cn(
                          'h-1 flex-1 rounded-full transition-all duration-300',
                          i <= strength ? strengthColor : 'bg-muted',
                        )}
                      />
                    ))}
                  </div>
                  {strengthLabel && (
                    <p
                      className={cn(
                        'text-xs font-medium',
                        strength === 1 && 'text-destructive',
                        strength === 2 && 'text-amber-500',
                        strength === 3 && 'text-yellow-500',
                        strength === 4 && 'text-green-500',
                      )}
                    >
                      Độ mạnh: {strengthLabel}
                    </p>
                  )}
                </div>
              )}
              {fieldErrors.password && (
                <p className="text-xs text-destructive">{fieldErrors.password}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <Label htmlFor="reg-confirm">Xác nhận mật khẩu</Label>
              <div className="relative">
                <Input
                  id="reg-confirm"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Nhập lại mật khẩu"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  aria-invalid={!!fieldErrors.confirmPassword}
                  className="h-10 pr-10"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showConfirm ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {fieldErrors.confirmPassword && (
                <p className="text-xs text-destructive">{fieldErrors.confirmPassword}</p>
              )}
            </div>

            {/* Submit */}
            <Button
              id="register-submit"
              type="submit"
              variant="glow"
              size="lg"
              className="w-full mt-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Đang tạo tài khoản...
                </>
              ) : (
                <>
                  <UserPlus className="size-4" />
                  Tạo tài khoản
                </>
              )}
            </Button>
          </form>

          {/* Login link */}
          <p className="text-center text-sm text-muted-foreground">
            Đã có tài khoản?{' '}
            <Link
              to="/login"
              className={cn(
                'font-semibold text-primary hover:underline underline-offset-2',
                'inline-flex items-center gap-1',
              )}
            >
              <Sparkles className="size-3" />
              Đăng nhập
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
