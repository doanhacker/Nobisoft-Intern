import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  Images,
  History,
  Trash2,
  ArrowRight,
  UserCheck,
} from 'lucide-react'
import { getImages } from '@/services/adminImageService'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

// ============================================================
// QuickActionRow (1 button per row)
// ============================================================

interface QuickActionRowProps {
  to: string
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  iconBg: string
  iconColor: string
}

function QuickActionRow({
  to,
  icon: Icon,
  title,
  description,
  iconBg,
  iconColor,
}: QuickActionRowProps) {
  return (
    <Link
      to={to}
      className="group flex items-center justify-between p-4 rounded-xl border border-border/60 bg-card hover:bg-muted/40 hover:border-primary/40 transition-all duration-150 shadow-sm"
    >
      <div className="flex items-center gap-4">
        <div className={cn('flex items-center justify-center size-10 rounded-lg shrink-0', iconBg)}>
          <Icon className={cn('size-5', iconColor)} />
        </div>
        <div>
          <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
            {title}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>

      <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors">
        <span>Truy cập</span>
        <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
      </div>
    </Link>
  )
}

// ============================================================
// AdminDashboardPage
// ============================================================

export function AdminDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'stats', 'images'],
    queryFn: () => getImages({ page: 1, limit: 1 }),
    staleTime: 30_000,
  })

  const totalImages = data?.meta?.totalDocs

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-border/50 pb-5">
        <div className="flex items-center gap-2 text-primary mb-1">
          <UserCheck className="size-5" />
          <span className="text-xs font-bold uppercase tracking-widest">Quản lý cá nhân</span>
        </div>
        <h1 className="text-2xl font-black text-foreground">Tổng quan cá nhân</h1>
      </div>

      {/* Main Stat Card - Only Indexed Images */}
      <div className="p-5 rounded-2xl border border-border/60 bg-card shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center size-12 rounded-xl bg-primary/10 text-primary">
            <Images className="size-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Tổng số ảnh đã upload
            </p>
            {isLoading ? (
              <Skeleton className="h-8 w-24 mt-1 rounded-lg" />
            ) : (
              <p className="text-2xl font-black text-foreground tabular-nums">
                {totalImages?.toLocaleString('vi-VN') ?? '0'}
              </p>
            )}
          </div>
        </div>

        <Link
          to="/admin/images"
          className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
        >
          Quản lý kho ảnh
          <ArrowRight className="size-3.5" />
        </Link>
      </div>

      {/* Quick Action Navigation - 1 item per row */}
      <div className="space-y-3 pt-2">
        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">
          Lối tắt quản lý
        </h2>

        <div className="space-y-2.5">
          <QuickActionRow
            to="/admin/images"
            icon={Images}
            title="Quản lý Kho ảnh"
            description="Xem danh sách ảnh đã index, tìm kiếm và xoá dữ liệu"
            iconBg="bg-violet-500/10"
            iconColor="text-violet-500"
          />

          <QuickActionRow
            to="/admin/history"
            icon={History}
            title="Lịch sử tìm kiếm"
            description="Xem nhật ký lượt tìm kiếm hình ảnh và OCR"
            iconBg="bg-blue-500/10"
            iconColor="text-blue-500"
          />

          <QuickActionRow
            to="/admin/trash"
            icon={Trash2}
            title="Thùng rác"
            description="Quản lý các hình ảnh đã tạm xoá"
            iconBg="bg-amber-500/10"
            iconColor="text-amber-500"
          />
        </div>
      </div>
    </div>
  )
}
