import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import {
  History,
  Image as ImageIcon,
  FileText,
  Search,
  X,
  ZoomIn,
  Clock,
  BarChart2,
  ScanText,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Sparkles,
} from 'lucide-react'
import { getMySearchHistory } from '@/services/historyService'
import type { SearchHistoryItem } from '@/types/admin'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

// ============================================================
// AdminHistoryPage — Lịch sử tìm kiếm trong admin layout
// Route: /admin/history
// ============================================================

const PAGE_SIZE = 20

// ── Search type config ────────────────────────────────────────

const SEARCH_TYPE_CONFIG = {
  '': {
    label: 'Tất cả',
    icon: History,
    gradient: 'from-slate-500 to-slate-600',
    badge:
      'bg-slate-100 text-slate-700 border-slate-200/60 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-700/50',
    dot: 'bg-slate-400',
    accent: 'border-l-slate-400',
    glow: '',
  },
  IMAGE_ONLY: {
    label: 'Tìm bằng ảnh',
    icon: ImageIcon,
    gradient: 'from-violet-500 to-purple-600',
    badge:
      'bg-violet-50 text-violet-700 border-violet-200/60 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-700/40',
    dot: 'bg-violet-500',
    accent: 'border-l-violet-400',
    glow: 'shadow-violet-100 dark:shadow-violet-950/30',
  },
  TEXT_SEMANTIC: {
    label: 'Semantic',
    icon: FileText,
    gradient: 'from-blue-500 to-cyan-600',
    badge:
      'bg-blue-50 text-blue-700 border-blue-200/60 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-700/40',
    dot: 'bg-blue-500',
    accent: 'border-l-blue-400',
    glow: 'shadow-blue-100 dark:shadow-blue-950/30',
  },
  TEXT_OCR: {
    label: 'OCR',
    icon: ScanText,
    gradient: 'from-amber-500 to-orange-500',
    badge:
      'bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700/40',
    dot: 'bg-amber-500',
    accent: 'border-l-amber-400',
    glow: 'shadow-amber-100 dark:shadow-amber-950/30',
  },
  TEXT_PROMPT: {
    label: 'Prompt',
    icon: Sparkles,
    gradient: 'from-emerald-500 to-teal-600',
    badge:
      'bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700/40',
    dot: 'bg-emerald-500',
    accent: 'border-l-emerald-400',
    glow: 'shadow-emerald-100 dark:shadow-emerald-950/30',
  },
} as const

type SearchTypeKey = keyof typeof SEARCH_TYPE_CONFIG

// ── Image Lightbox ────────────────────────────────────────────

interface LightboxProps {
  src: string
  alt: string
  onClose: () => void
}

function ImageLightbox({ src, alt, onClose }: LightboxProps) {
  React.useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in-0 duration-200"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl max-h-[90vh] w-full mx-4 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 flex items-center gap-1.5 text-white/80 hover:text-white text-sm transition-colors"
          id="lightbox-close-btn"
        >
          <X className="size-4" />
          Đóng (Esc)
        </button>
        <div className="rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-black/40">
          <img
            src={src}
            alt={alt}
            className="max-h-[85vh] w-full object-contain"
            loading="eager"
          />
        </div>
      </div>
    </div>
  )
}

// ── Clickable image thumbnail ─────────────────────────────────

interface ImageThumbProps {
  src: string
  alt: string
  className?: string
  aspectRatio?: string
  onOpen: () => void
}

function ImageThumb({ src, alt, className, aspectRatio = 'aspect-square', onOpen }: ImageThumbProps) {
  const [error, setError] = React.useState(false)

  if (error) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-lg bg-muted/60 border border-border/40',
          aspectRatio,
          className,
        )}
      >
        <ImageIcon className="size-5 text-muted-foreground/50" />
      </div>
    )
  }

  return (
    <button
      onClick={onOpen}
      className={cn(
        'group relative overflow-hidden rounded-lg bg-muted/60 border border-border/40 cursor-zoom-in transition-all duration-200 hover:border-primary/40 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/30',
        aspectRatio,
        className,
      )}
      title="Click để xem ảnh"
    >
      <img
        src={src}
        alt={alt}
        className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
        onError={() => setError(true)}
        loading="lazy"
      />
      <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-all duration-200 opacity-0 group-hover:opacity-100">
        <div className="flex items-center justify-center size-7 rounded-full bg-white/90 shadow text-gray-800">
          <ZoomIn className="size-3.5" />
        </div>
      </div>
    </button>
  )
}

// ── History Card ──────────────────────────────────────────────

interface HistoryCardProps {
  item: SearchHistoryItem
  index: number
  onOpenImage: (src: string, alt: string) => void
}

function HistoryCard({ item, index, onOpenImage }: HistoryCardProps) {
  const cfg = SEARCH_TYPE_CONFIG[item.searchType as SearchTypeKey] ?? SEARCH_TYPE_CONFIG['']
  const Icon = cfg.icon

  const date = new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(item.createdAt))

  const hasContent = !!(item.queryText || item.queryImage)

  return (
    <div
      className={cn('relative flex gap-4 group')}
      style={{ animationDelay: `${index * 30}ms` }}
    >
      {/* Timeline dot + line */}
      <div className="flex flex-col items-center shrink-0 pt-4">
        <div
          className={cn(
            'size-3 rounded-full ring-2 ring-background shrink-0 transition-transform duration-200 group-hover:scale-125',
            cfg.dot,
          )}
        />
        <div className="w-px flex-1 mt-1.5 bg-border/40 min-h-4" />
      </div>

      {/* Card */}
      <div
        className={cn(
          'flex-1 mb-4 bg-card border border-border/60 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden border-l-4',
          cfg.accent,
          cfg.glow && `hover:shadow-lg hover:${cfg.glow}`,
        )}
      >
        {/* Card header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-muted/20">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border',
              cfg.badge,
            )}
          >
            <Icon className="size-3" />
            {cfg.label}
          </span>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="size-3" />
            <span>{date}</span>
          </div>
        </div>

        {/* Card body */}
        <div className="p-4">
          {hasContent ? (
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Nội dung tìm kiếm
              </p>

              {item.queryImage ? (
                /* Image query — IMAGE_ONLY */
                <div className="flex items-center gap-3">
                  <ImageThumb
                    src={item.queryImage.imageUrl}
                    alt="Ảnh tìm kiếm"
                    className="w-20 h-20 shrink-0"
                    aspectRatio=""
                    onOpen={() => onOpenImage(item.queryImage!.imageUrl, 'Ảnh tìm kiếm')}
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground">Tìm bằng ảnh</p>
                    {item.queryImage.fileFormat && (
                      <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                        {item.queryImage.fileFormat.toUpperCase()}
                        {item.queryImage.width && item.queryImage.height
                          ? ` · ${item.queryImage.width}×${item.queryImage.height}`
                          : ''}
                      </p>
                    )}
                    {item.queryImage.fileSize && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {(item.queryImage.fileSize / 1024).toFixed(0)} KB
                      </p>
                    )}
                  </div>
                </div>
              ) : item.queryText ? (
                /* Text query — TEXT_SEMANTIC or TEXT_OCR */
                <div className="flex items-start gap-2">
                  <Search className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                  <p className="text-sm text-foreground font-medium leading-relaxed break-words">
                    &ldquo;{item.queryText}&rdquo;
                  </p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">Không có nội dung</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic text-center py-2">Không có dữ liệu</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Skeleton Card ─────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center shrink-0 pt-4">
        <Skeleton className="size-3 rounded-full" />
        <div className="w-px flex-1 mt-1.5 bg-border/20 min-h-4" />
      </div>
      <div className="flex-1 mb-4 border border-border/40 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/30 bg-muted/10">
          <Skeleton className="h-6 w-28 rounded-full" />
          <Skeleton className="h-4 w-36" />
        </div>
        <div className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-24" />
              <div className="flex items-center gap-2">
                <Skeleton className="size-4 rounded" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Filter tabs ───────────────────────────────────────────────

const TABS: { value: SearchTypeKey; label: string }[] = [
  { value: '', label: 'Tất cả' },
  { value: 'IMAGE_ONLY', label: 'Tìm bằng ảnh' },
  { value: 'TEXT_SEMANTIC', label: 'Semantic' },
  { value: 'TEXT_OCR', label: 'OCR' },
  { value: 'TEXT_PROMPT', label: 'Prompt' },
]

// ── Stats badge ───────────────────────────────────────────────

function StatBadge({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | number
}) {
  return (
    <div className="flex items-center gap-2 px-3.5 py-2.5 bg-card border border-border/60 rounded-xl shadow-sm">
      <div className="flex items-center justify-center size-8 rounded-lg bg-primary/10">
        <Icon className="size-4 text-primary" />
      </div>
      <div>
        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
        <p className="text-sm font-bold text-foreground leading-none mt-0.5">{value}</p>
      </div>
    </div>
  )
}

// ── Date filter ───────────────────────────────────────────────

interface DateFilterProps {
  fromDate: string
  toDate: string
  onFromChange: (v: string) => void
  onToChange: (v: string) => void
  onClear: () => void
}

function DateFilter({ fromDate, toDate, onFromChange, onToChange, onClear }: DateFilterProps) {
  const hasFilter = !!(fromDate || toDate)
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <CalendarRange className="size-3.5" />
        <span className="font-medium">Lọc ngày:</span>
      </div>
      <input
        type="date"
        value={fromDate}
        onChange={(e) => onFromChange(e.target.value)}
        className="h-8 rounded-lg border border-border/60 bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        title="Từ ngày"
      />
      <span className="text-muted-foreground text-xs">→</span>
      <input
        type="date"
        value={toDate}
        onChange={(e) => onToChange(e.target.value)}
        className="h-8 rounded-lg border border-border/60 bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        title="Đến ngày"
      />
      {hasFilter && (
        <button
          onClick={onClear}
          className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg text-xs text-muted-foreground hover:text-foreground border border-border/60 hover:border-border transition-colors"
        >
          <X className="size-3" />
          Xóa
        </button>
      )}
    </div>
  )
}

// ── Pagination ────────────────────────────────────────────────

interface PaginationProps {
  page: number
  totalPages: number
  totalDocs: number
  onPrev: () => void
  onNext: () => void
}

function Pagination({ page, totalPages, totalDocs, onPrev, onNext }: PaginationProps) {
  if (totalPages <= 1) return null
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-2 gap-3">
      <p className="text-sm text-muted-foreground">
        Trang <span className="font-semibold text-foreground">{page}</span> /{' '}
        <span className="font-semibold text-foreground">{totalPages}</span>
        <span className="ml-2 text-muted-foreground">
          ({totalDocs.toLocaleString('vi-VN')} bản ghi)
        </span>
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={onPrev} className="gap-1">
          <ChevronLeft className="size-3.5" />
          Trước
        </Button>
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={onNext} className="gap-1">
          Sau
          <ChevronRight className="size-3.5" />
        </Button>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────

export function AdminHistoryPage() {
  const navigate = useNavigate()
  const { page, searchType, fromDate: fromDateParam, toDate: toDateParam } = useSearch({
    from: '/admin/history',
  })

  const activeType = (searchType as SearchTypeKey) ?? ''

  // Local date state
  const [fromDate, setFromDate] = React.useState<string>((fromDateParam as string) ?? '')
  const [toDate, setToDate] = React.useState<string>((toDateParam as string) ?? '')

  // Lightbox state
  const [lightbox, setLightbox] = React.useState<{ src: string; alt: string } | null>(null)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-history', 'me', { page, searchType: activeType, fromDate, toDate }],
    queryFn: () =>
      getMySearchHistory({
        page,
        limit: PAGE_SIZE,
        searchType: activeType || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      }),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
    retry: false,
  })

  const items = data?.data ?? []
  const totalPages = data?.meta?.totalPages ?? 1
  const totalDocs = data?.meta?.totalDocs ?? 0
  const currentPage = page ?? 1

  function goToPage(p: number) {
    navigate({
      to: '/admin/history',
      search: {
        page: p,
        searchType: activeType,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      },
    })
  }

  function changeType(type: SearchTypeKey) {
    navigate({
      to: '/admin/history',
      search: {
        page: 1,
        searchType: type,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      },
    })
  }

  function handleFromDateChange(v: string) {
    setFromDate(v)
    navigate({
      to: '/admin/history',
      search: {
        page: 1,
        searchType: activeType,
        fromDate: v || undefined,
        toDate: toDate || undefined,
      },
    })
  }

  function handleToDateChange(v: string) {
    setToDate(v)
    navigate({
      to: '/admin/history',
      search: {
        page: 1,
        searchType: activeType,
        fromDate: fromDate || undefined,
        toDate: v || undefined,
      },
    })
  }

  function clearDateFilter() {
    setFromDate('')
    setToDate('')
    navigate({
      to: '/admin/history',
      search: { page: 1, searchType: activeType },
    })
  }

  return (
    <>
      {/* Lightbox */}
      {lightbox && (
        <ImageLightbox
          src={lightbox.src}
          alt={lightbox.alt}
          onClose={() => setLightbox(null)}
        />
      )}

      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
        {/* ── Hero header ── */}
        <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-primary/3 to-transparent border border-border/60 rounded-2xl p-6 shadow-sm">
          {/* Decorative blob */}
          <div className="absolute -top-8 -right-8 size-40 rounded-full bg-primary/8 blur-3xl pointer-events-none" />

          <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
            {/* Avatar */}
            <div className="flex items-center justify-center size-16 rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-md shadow-primary/20 shrink-0">
              <History className="size-7" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-black text-foreground">Lịch sử tìm kiếm</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Xem lại các lượt tìm kiếm bằng ảnh, văn bản Semantic và OCR của bạn.
              </p>
            </div>

            {/* Stats */}
            {!isLoading && (
              <div className="flex flex-wrap gap-2 shrink-0">
                <StatBadge
                  icon={BarChart2}
                  label="Tổng lượt tìm"
                  value={totalDocs.toLocaleString('vi-VN')}
                />
                <StatBadge
                  icon={History}
                  label="Trang hiện tại"
                  value={`${currentPage} / ${totalPages}`}
                />
              </div>
            )}
          </div>
        </div>

        {/* ── Filters ── */}
        <div className="flex flex-col gap-3">
          {/* Search type tabs */}
          <div
            className="flex items-center gap-1 bg-muted/40 rounded-xl p-1 w-full overflow-x-auto scrollbar-none flex-nowrap"
            role="tablist"
            aria-label="Lọc theo loại tìm kiếm"
          >
            {TABS.map((tab) => {
              const cfg = SEARCH_TYPE_CONFIG[tab.value]
              const Icon = cfg.icon
              const isActive = activeType === tab.value
              return (
                <button
                  key={tab.value}
                  role="tab"
                  id={`admin-tab-${tab.value || 'all'}`}
                  aria-selected={isActive}
                  onClick={() => changeType(tab.value)}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-150',
                    isActive
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Icon className="size-3.5" />
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Date range filter */}
          <DateFilter
            fromDate={fromDate}
            toDate={toDate}
            onFromChange={handleFromDateChange}
            onToChange={handleToDateChange}
            onClear={clearDateFilter}
          />
        </div>

        {/* ── Content ── */}
        {isError ? (
          <div className="flex flex-col items-center gap-4 py-20 text-center bg-card border border-border/60 rounded-2xl">
            <div className="flex items-center justify-center size-14 rounded-2xl bg-destructive/10">
              <AlertCircle className="size-7 text-destructive" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Không thể tải lịch sử</p>
              <p className="text-sm text-muted-foreground mt-0.5">Đã xảy ra lỗi khi gọi API</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()} id="admin-retry-btn">
              Thử lại
            </Button>
          </div>
        ) : isLoading ? (
          <div className="space-y-0">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-20 text-center bg-card border border-border/60 rounded-2xl">
            <div className="flex items-center justify-center size-14 rounded-2xl bg-muted/60">
              <History className="size-7 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Chưa có lịch sử tìm kiếm</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {activeType
                  ? `Không có lịch sử cho loại "${SEARCH_TYPE_CONFIG[activeType].label}"`
                  : fromDate || toDate
                    ? 'Không có lịch sử trong khoảng thời gian này'
                    : 'Bạn chưa thực hiện lượt tìm kiếm nào'}
              </p>
            </div>
            {(activeType || fromDate || toDate) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  changeType('')
                  clearDateFilter()
                }}
              >
                Xem tất cả
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-0">
            {items.map((item, index) => (
              <HistoryCard
                key={item.id}
                item={item}
                index={index}
                onOpenImage={(src, alt) => setLightbox({ src, alt })}
              />
            ))}
          </div>
        )}

        {/* ── Pagination ── */}
        {!isLoading && !isError && (
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            totalDocs={totalDocs}
            onPrev={() => goToPage(currentPage - 1)}
            onNext={() => goToPage(currentPage + 1)}
          />
        )}
      </div>
    </>
  )
}
