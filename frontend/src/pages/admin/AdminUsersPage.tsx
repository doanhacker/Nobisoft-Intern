import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearch, Link } from '@tanstack/react-router'
import {
  Search,
  Users,
  ChevronLeft,
  ChevronRight,
  History,
  UserCircle2,
  ShieldCheck,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { getUsers } from '@/services/adminUserService'
import type { AdminUserItem, AuthRole } from '@/types/admin'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useDebounce } from '@/hooks/useDebounce'

// ============================================================
// AdminUsersPage
// ============================================================

const PAGE_SIZE = 10

function RoleBadge({ role }: { role: AuthRole }) {
  return role === 'ADMIN' ? (
    <Badge
      variant="outline"
      className="border-amber-400/50 text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 gap-1 text-xs"
    >
      <ShieldCheck className="size-3" />
      Admin
    </Badge>
  ) : (
    <Badge
      variant="outline"
      className="border-blue-400/40 text-blue-600 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-400 text-xs"
    >
      User
    </Badge>
  )
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(dateStr))
}

// ── Skeleton rows ─────────────────────────────────────────────

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: PAGE_SIZE }).map((_, i) => (
        <tr key={i} className="border-b border-border/40">
          <td className="px-4 py-3.5">
            <div className="flex items-center gap-3">
              <Skeleton className="size-9 rounded-full shrink-0" />
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          </td>
          <td className="px-4 py-3.5"><Skeleton className="h-5 w-16" /></td>
          <td className="px-4 py-3.5"><Skeleton className="h-3.5 w-8" /></td>
          <td className="px-4 py-3.5"><Skeleton className="h-3.5 w-20" /></td>
          <td className="px-4 py-3.5"><Skeleton className="h-8 w-28" /></td>
        </tr>
      ))}
    </>
  )
}

// ── Empty state ───────────────────────────────────────────────

function EmptyState({ query }: { query: string }) {
  return (
    <tr>
      <td colSpan={5}>
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <div className="flex items-center justify-center size-14 rounded-2xl bg-muted/50">
            <Users className="size-7 text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold text-foreground">
              {query ? `Không tìm thấy "${query}"` : 'Chưa có người dùng'}
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {query ? 'Thử tìm theo email hoặc tên khác' : 'Chưa có tài khoản nào được đăng ký'}
            </p>
          </div>
        </div>
      </td>
    </tr>
  )
}

// ── Error state ───────────────────────────────────────────────

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <tr>
      <td colSpan={5}>
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <div className="flex items-center justify-center size-14 rounded-2xl bg-destructive/10">
            <AlertCircle className="size-7 text-destructive" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Không thể tải danh sách</p>
            <p className="text-sm text-muted-foreground mt-0.5">Đã xảy ra lỗi khi gọi API</p>
          </div>
          <Button variant="outline" size="sm" onClick={onRetry}>
            Thử lại
          </Button>
        </div>
      </td>
    </tr>
  )
}

// ── User row ──────────────────────────────────────────────────

function UserRow({ user }: { user: AdminUserItem }) {
  return (
    <tr className="border-b border-border/40 hover:bg-muted/30 transition-colors duration-100 group">
      {/* Name + Email */}
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-9 rounded-full bg-primary/10 text-primary font-bold text-sm shrink-0">
            {user.name?.[0]?.toUpperCase() ?? <UserCircle2 className="size-4" />}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm text-foreground truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
        </div>
      </td>

      {/* Role */}
      <td className="px-4 py-3.5">
        <RoleBadge role={user.role} />
      </td>

      {/* Số lượt search */}
      <td className="px-4 py-3.5 text-sm text-foreground tabular-nums font-medium">
        {user._count.searchHistories.toLocaleString('vi-VN')}
      </td>

      {/* Ngày tạo */}
      <td className="px-4 py-3.5 text-sm text-muted-foreground">
        {formatDate(user.createdAt)}
      </td>

      {/* Actions */}
      <td className="px-4 py-3.5">
        <Link to={`/admin/users/$userId`} params={{ userId: user.id }}>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            <History className="size-3.5" />
            Lịch sử tìm kiếm
          </Button>
        </Link>
      </td>
    </tr>
  )
}

// ── Pagination ────────────────────────────────────────────────

interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-border/40">
      <p className="text-sm text-muted-foreground">
        Trang {page} / {totalPages}
      </p>
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="gap-1"
        >
          <ChevronLeft className="size-3.5" />
          Trước
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="gap-1"
        >
          Sau
          <ChevronRight className="size-3.5" />
        </Button>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────

export function AdminUsersPage() {
  const navigate = useNavigate()
  const { page, search: searchParam } = useSearch({ from: '/admin/users' })

  const [searchInput, setSearchInput] = React.useState(searchParam ?? '')
  const debouncedSearch = useDebounce(searchInput, 400)

  // Sync debounced search → URL
  React.useEffect(() => {
    navigate({
      to: '/admin/users',
      search: { page: 1, search: debouncedSearch },
      replace: true,
    })
  }, [debouncedSearch, navigate])

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'users', { page, search: debouncedSearch }],
    queryFn: () =>
      getUsers({ page, limit: PAGE_SIZE, search: debouncedSearch || undefined }),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  })

  const users = data?.data ?? []
  const totalPages = data?.meta?.totalPages ?? 1
  const totalDocs = data?.meta?.totalDocs ?? 0

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
            <Users className="size-6 text-primary" />
            Người dùng
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isLoading ? 'Đang tải...' : `${totalDocs.toLocaleString('vi-VN')} tài khoản`}
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            id="user-search"
            type="text"
            placeholder="Tìm theo email hoặc tên..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9 text-sm"
          />
          {isLoading && searchInput && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border/60 rounded-2xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-muted/30">
                <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wide">
                  Người dùng
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wide">
                  Vai trò
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wide">
                  Lượt search
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wide">
                  Ngày tạo
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wide">
                  Hành động
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <SkeletonRows />
              ) : isError ? (
                <ErrorState onRetry={() => refetch()} />
              ) : users.length === 0 ? (
                <EmptyState query={debouncedSearch} />
              ) : (
                users.map((user) => <UserRow key={user.id} user={user} />)
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          page={page ?? 1}
          totalPages={totalPages}
          onPageChange={(p) =>
            navigate({ to: '/admin/users', search: { page: p, search: searchParam } })
          }
        />
      </div>
    </div>
  )
}
