import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams, useSearch, Link } from '@tanstack/react-router'
import {
  ArrowLeft,
  History,
  Image,
  FileText,
  Eye,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from 'lucide-react'
import { getUserSearchHistory } from '@/services/adminUserService'
import type { SearchHistoryItem, SearchTypeValue } from '@/types/admin'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

// ============================================================
// AdminUserDetailPage — shows search history of a single user
// ============================================================

const PAGE_SIZE = 20

// ── Search type tab + badge ────────────────────────────────────

const SEARCH_TYPE_LABELS: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  '': { label: 'Tất cả', color: '', icon: History },
  IMAGE_ONLY: { label: 'Tìm bằng ảnh', color: 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300', icon: Image },
  TEXT_SEMANTIC: { label: 'Semantic', color: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300', icon: FileText },
  TEXT_OCR: { label: 'OCR', color: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300', icon: Eye },
}

function SearchTypeBadge({ type }: { type: SearchTypeValue }) {
  const cfg = SEARCH_TYPE_LABELS[type] ?? SEARCH_TYPE_LABELS['']
  const Icon = cfg.icon
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold', cfg.color)}>
      <Icon className="size-3" />
      {cfg.label}
    </span>
  )
}

// ── Row ───────────────────────────────────────────────────────

function HistoryRow({ item }: { item: SearchHistoryItem }) {
  const date = new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(item.createdAt))

  return (
    <tr className="border-b border-border/40 hover:bg-muted/30 transition-colors duration-100">
      {/* Mode */}
      <td className="px-4 py-3.5 shrink-0">
        <SearchTypeBadge type={item.searchType} />
      </td>

      {/* Query content */}
      <td className="px-4 py-3.5">
        {item.queryText ? (
          <span className="text-sm text-foreground font-medium truncate max-w-xs block">
            "{item.queryText}"
          </span>
        ) : item.queryImagePath ? (
          <div className="flex items-center gap-2">
            <div className="size-8 rounded overflow-hidden bg-muted/60 shrink-0">
              <img
                src={item.queryImagePath}
                alt="Query"
                className="size-full object-cover"
                onError={(e) => {
                  ;(e.target as HTMLImageElement).style.display = 'none'
                }}
              />
            </div>
            <span className="text-xs text-muted-foreground">[Ảnh upload]</span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground italic">—</span>
        )}
      </td>

      {/* Clicked image */}
      <td className="px-4 py-3.5">
        {item.clickedImage ? (
          <div className="size-8 rounded overflow-hidden bg-muted/60">
            <img
              src={item.clickedImage.path}
              alt="Clicked"
              className="size-full object-cover"
              onError={(e) => {
                ;(e.target as HTMLImageElement).style.display = 'none'
              }}
            />
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>

      {/* Time */}
      <td className="px-4 py-3.5 text-xs text-muted-foreground whitespace-nowrap">{date}</td>
    </tr>
  )
}

// ── Skeleton ──────────────────────────────────────────────────

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 10 }).map((_, i) => (
        <tr key={i} className="border-b border-border/40">
          <td className="px-4 py-3.5"><Skeleton className="h-5 w-20 rounded-full" /></td>
          <td className="px-4 py-3.5"><Skeleton className="h-4 w-48" /></td>
          <td className="px-4 py-3.5"><Skeleton className="size-8 rounded" /></td>
          <td className="px-4 py-3.5"><Skeleton className="h-3.5 w-28" /></td>
        </tr>
      ))}
    </>
  )
}

// ── Filter tabs ───────────────────────────────────────────────

const TABS = [
  { value: '', label: 'Tất cả' },
  { value: 'IMAGE_ONLY', label: 'Ảnh' },
  { value: 'TEXT_SEMANTIC', label: 'Semantic' },
  { value: 'TEXT_OCR', label: 'OCR' },
] as const

// ── Main page ─────────────────────────────────────────────────

export function AdminUserDetailPage() {
  const { userId } = useParams({ from: '/admin/users/$userId' })
  const navigate = useNavigate()
  const { page, searchType } = useSearch({ from: '/admin/users/$userId' })

  const activeType = (searchType as SearchTypeValue | '') ?? ''

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'users', userId, 'history', { page, searchType: activeType }],
    queryFn: () =>
      getUserSearchHistory(userId, {
        page,
        limit: PAGE_SIZE,
        searchType: activeType || undefined,
      }),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  })

  const items = data?.data ?? []
  const totalPages = data?.meta?.totalPages ?? 1
  const totalDocs = data?.meta?.totalDocs ?? 0

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Back */}
      <Link
        to="/admin/users"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" />
        Quay lại danh sách
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
          <History className="size-6 text-primary" />
          Lịch sử tìm kiếm
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5 font-mono">{userId}</p>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 bg-muted/40 rounded-xl p-1 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() =>
              navigate({
                to: '/admin/users/$userId',
                params: { userId },
                search: { page: 1, searchType: tab.value },
              })
            }
            className={cn(
              'px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-150',
              activeType === tab.value
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Count */}
      {!isLoading && (
        <p className="text-sm text-muted-foreground">
          {totalDocs.toLocaleString('vi-VN')} lượt tìm kiếm
        </p>
      )}

      {/* Table */}
      <div className="bg-card border border-border/60 rounded-2xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-muted/30">
                <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wide">
                  Chế độ
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wide">
                  Nội dung tìm kiếm
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wide">
                  Ảnh đã click
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wide">
                  Thời gian
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <SkeletonRows />
              ) : isError ? (
                <tr>
                  <td colSpan={4}>
                    <div className="flex flex-col items-center gap-3 py-12 text-center">
                      <AlertCircle className="size-8 text-destructive" />
                      <p className="text-sm font-semibold">Không thể tải lịch sử</p>
                      <Button variant="outline" size="sm" onClick={() => refetch()}>
                        Thử lại
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={4}>
                    <div className="flex flex-col items-center gap-3 py-12 text-center">
                      <History className="size-8 text-muted-foreground" />
                      <p className="text-sm font-semibold text-foreground">Chưa có lịch sử</p>
                      <p className="text-xs text-muted-foreground">
                        {activeType
                          ? 'Không có lịch sử cho loại tìm kiếm này'
                          : 'User này chưa thực hiện lượt tìm kiếm nào'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((item) => <HistoryRow key={item.id} item={item} />)
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/40">
            <p className="text-sm text-muted-foreground">
              Trang {page} / {totalPages}
            </p>
            <div className="flex gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={(page ?? 1) <= 1}
                onClick={() =>
                  navigate({
                    to: '/admin/users/$userId',
                    params: { userId },
                    search: { page: (page ?? 1) - 1, searchType: activeType },
                  })
                }
              >
                <ChevronLeft className="size-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={(page ?? 1) >= totalPages}
                onClick={() =>
                  navigate({
                    to: '/admin/users/$userId',
                    params: { userId },
                    search: { page: (page ?? 1) + 1, searchType: activeType },
                  })
                }
              >
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
