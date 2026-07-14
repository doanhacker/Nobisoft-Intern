import * as React from 'react'
import { useQueries } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Users, Images, UploadCloud, ArrowRight, Database, Activity } from 'lucide-react'
import { getUsers } from '@/services/adminUserService'
import { getImages } from '@/services/adminImageService'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

// ============================================================
// AdminDashboardPage
// ============================================================

interface StatCardProps {
  label: string
  value: number | undefined
  isLoading: boolean
  icon: React.ComponentType<{ className?: string }>
  iconColor: string
  iconBg: string
  link: string
  linkLabel: string
}

function StatCard({
  label,
  value,
  isLoading,
  icon: Icon,
  iconColor,
  iconBg,
  link,
  linkLabel,
}: StatCardProps) {
  return (
    <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-card hover:shadow-lg transition-shadow duration-200">
      <div className="flex items-start justify-between mb-4">
        <div className={cn('flex items-center justify-center size-12 rounded-xl', iconBg)}>
          <Icon className={cn('size-6', iconColor)} />
        </div>
        <Link
          to={link}
          className="text-xs font-medium text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
        >
          {linkLabel}
          <ArrowRight className="size-3" />
        </Link>
      </div>

      <div>
        {isLoading ? (
          <Skeleton className="h-9 w-24 mb-1" />
        ) : (
          <p className="text-3xl font-black text-foreground tabular-nums">
            {value?.toLocaleString('vi-VN') ?? '—'}
          </p>
        )}
        <p className="text-sm text-muted-foreground font-medium mt-0.5">{label}</p>
      </div>
    </div>
  )
}

// ─── Quick action card ────────────────────────────────────────

interface QuickActionProps {
  to: string
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  accent: string
}

function QuickAction({ to, icon: Icon, title, description, accent }: QuickActionProps) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-muted/20 hover:bg-muted/50 hover:border-border transition-all duration-200"
    >
      <div
        className={cn(
          'flex items-center justify-center size-10 rounded-lg shrink-0 transition-transform duration-200 group-hover:scale-110',
          accent,
        )}
      >
        <Icon className="size-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground truncate">{description}</p>
      </div>
      <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-200" />
    </Link>
  )
}

// ─── Main page ───────────────────────────────────────────────

export function AdminDashboardPage() {
  const results = useQueries({
    queries: [
      {
        queryKey: ['admin', 'users', { page: 1, limit: 1 }],
        queryFn: () => getUsers({ page: 1, limit: 1 }),
        staleTime: 30_000,
      },
      {
        queryKey: ['admin', 'images', { page: 1, limit: 1 }],
        queryFn: () => getImages({ page: 1, limit: 1 }),
        staleTime: 30_000,
      },
    ],
  })

  const [usersResult, imagesResult] = results
  const totalUsers = usersResult.data?.meta?.totalDocs
  const totalImages = imagesResult.data?.meta?.totalDocs
  const isLoadingUsers = usersResult.isLoading
  const isLoadingImages = imagesResult.isLoading

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Activity className="size-5 text-primary" />
          <span className="text-xs font-bold text-primary uppercase tracking-widest">
            Tổng quan hệ thống
          </span>
        </div>
        <h1 className="text-2xl font-black text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Thống kê nhanh về dữ liệu hệ thống Nobisoft Visual Search Engine
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          label="Ảnh đã được index"
          value={totalImages}
          isLoading={isLoadingImages}
          icon={Database}
          iconColor="text-violet-500"
          iconBg="bg-violet-500/10"
          link="/admin/images"
          linkLabel="Xem kho ảnh"
        />
        <StatCard
          label="Người dùng đã đăng ký"
          value={totalUsers}
          isLoading={isLoadingUsers}
          icon={Users}
          iconColor="text-blue-500"
          iconBg="bg-blue-500/10"
          link="/admin/users"
          linkLabel="Quản lý user"
        />
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-3">
          Thao tác nhanh
        </h2>
        <div className="space-y-2">
          <QuickAction
            to="/admin/indexing"
            icon={UploadCloud}
            title="Index ảnh mới"
            description="Upload batch ảnh để thêm vào hệ thống tìm kiếm"
            accent="gradient-brand"
          />
          <QuickAction
            to="/admin/users"
            icon={Users}
            title="Danh sách người dùng"
            description="Xem và tìm kiếm tài khoản, xem lịch sử tìm kiếm"
            accent="bg-blue-500"
          />
          <QuickAction
            to="/admin/images"
            icon={Images}
            title="Quản lý kho ảnh"
            description="Xem danh sách ảnh đã index, xoá ảnh vi phạm"
            accent="bg-violet-500"
          />
        </div>
      </div>
    </div>
  )
}
