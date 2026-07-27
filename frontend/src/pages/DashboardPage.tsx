import * as React from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import {
  Images,
  UploadCloud,
  History,
  Search,
  ArrowRight,
  ImageOff,
  Clock,
  Image as ImageIcon,
  FileText,
  ScanText,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { getMyImages, type UserImage } from '@/services/myImagesService'
import { getMySearchHistory } from '@/services/historyService'
import type { SearchHistoryItem } from '@/types/admin'
import { cn } from '@/lib/utils'

// ============================================================
// DashboardPage — Personal profile with previews
// ============================================================

// ── Helpers ───────────────────────────────────────────────────

function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return 'Vừa xong'
  if (diffMin < 60) return `${diffMin} phút trước`
  if (diffHour < 24) return `${diffHour} giờ trước`
  if (diffDay === 1) return 'Hôm qua'
  if (diffDay < 7) return `${diffDay} ngày trước`
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const SEARCH_TYPE_CONFIG = {
  IMAGE_ONLY: { label: 'Tìm bằng ảnh', icon: ImageIcon, color: 'text-violet-500', bg: 'bg-violet-500/10' },
  TEXT_SEMANTIC: { label: 'Semantic', icon: FileText, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  TEXT_OCR: { label: 'OCR', icon: ScanText, color: 'text-amber-500', bg: 'bg-amber-500/10' },
} as const

// ── Section: Uploaded images preview ─────────────────────────

function ImagesPreview({ images, loading }: { images: UserImage[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
        {Array.from({ length: 16 }).map((_, i) => (
          <div key={i} className="aspect-square rounded-xl bg-muted/60 animate-pulse" />
        ))}
      </div>
    )
  }

  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
        <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center">
          <ImageOff className="size-6 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">Chưa có ảnh nào được tải lên</p>
        <Button variant="outline" size="sm" asChild>
          <Link to="/upload">
            <UploadCloud className="size-3.5" />
            Tải ảnh lên ngay
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
      {images.map((img) => (
        <div
          key={img.id}
          className="aspect-square rounded-xl overflow-hidden bg-muted/40 group relative"
        >
          <img
            src={img.imageUrl}
            alt={img.filename}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        </div>
      ))}
    </div>
  )
}

// ── Section: Search history preview ──────────────────────────

function HistoryPreview({ items, loading }: { items: SearchHistoryItem[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 animate-pulse">
            <div className="w-8 h-8 rounded-lg bg-muted/60 shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 bg-muted/60 rounded w-2/3" />
              <div className="h-2.5 bg-muted/40 rounded w-1/4" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
        <Clock className="size-8 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">Chưa có lịch sử tìm kiếm</p>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      {items.map((item) => {
        const config = SEARCH_TYPE_CONFIG[item.searchType]
        const Icon = config.icon
        const label = item.searchType === 'IMAGE_ONLY'
          ? 'Tìm bằng ảnh'
          : item.queryText ?? '—'

        return (
          <div
            key={item.id}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/50 transition-colors group"
          >
            {/* Type icon */}
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', config.bg)}>
              <Icon className={cn('size-4', config.color)} />
            </div>

            {/* Query image thumbnail (if IMAGE_ONLY) */}
            {item.searchType === 'IMAGE_ONLY' && item.queryImage && (
              <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-border/40">
                <img
                  src={item.queryImage.imageUrl}
                  alt="query"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            )}

            {/* Label */}
            <span className="flex-1 text-sm text-foreground truncate">
              {label}
            </span>

            {/* Time */}
            <span className="text-xs text-muted-foreground shrink-0">
              {formatRelativeTime(item.createdAt)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Section wrapper ───────────────────────────────────────────

interface SectionProps {
  icon: React.ReactNode
  title: string
  count?: number
  linkTo: string
  linkLabel: string
  children: React.ReactNode
}

function Section({ icon, title, count, linkTo, linkLabel, children }: SectionProps) {
  return (
    <div className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center shadow-sm">
            {icon}
          </div>
          <div>
            <span className="font-semibold text-foreground text-sm">{title}</span>
            {count !== undefined && (
              <span className="ml-2 text-xs text-muted-foreground">({count})</span>
            )}
          </div>
        </div>
        <Button variant="ghost" size="sm" asChild className="gap-1 text-xs text-muted-foreground hover:text-foreground">
          <Link to={linkTo}>
            {linkLabel}
            <ArrowRight className="size-3.5" />
          </Link>
        </Button>
      </div>
      {/* Content */}
      <div className="p-5">
        {children}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────

export function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [images, setImages] = React.useState<UserImage[]>([])
  const [history, setHistory] = React.useState<SearchHistoryItem[]>([])
  const [imagesLoading, setImagesLoading] = React.useState(true)
  const [historyLoading, setHistoryLoading] = React.useState(true)
  const [totalImages, setTotalImages] = React.useState(0)
  const [totalHistory, setTotalHistory] = React.useState(0)

  // Fetch images and history in parallel on mount
  React.useEffect(() => {
    getMyImages({ page: 1, limit: 24 })
      .then((res) => {
        setImages(res.images)
        setTotalImages(res.totalDocs)
      })
      .catch(console.error)
      .finally(() => setImagesLoading(false))

    getMySearchHistory({ page: 1, limit: 20 })
      .then((res) => {
        setHistory(res.data)
        setTotalHistory(res.meta.totalDocs)
      })
      .catch(console.error)
      .finally(() => setHistoryLoading(false))
  }, [])

  const initials = user?.name
    ? user.name.split(' ').map((w) => w[0]).slice(-2).join('').toUpperCase()
    : 'U'

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">

      {/* ── Profile header ── */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 bg-card border border-border/60 rounded-2xl p-6 shadow-sm">
        {/* Avatar */}
        <div className="relative shrink-0">
          <div className="w-20 h-20 rounded-2xl gradient-brand flex items-center justify-center text-white font-black text-2xl shadow-brand select-none">
            {initials}
          </div>
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-500 border-2 border-background" title="Đang hoạt động" />
        </div>

        {/* Info */}
        <div className="flex-1 text-center sm:text-left space-y-1">
          <h1 className="text-2xl font-black text-foreground tracking-tight">{user?.name ?? 'Người dùng'}</h1>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
          <div className="flex items-center justify-center sm:justify-start gap-3 pt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Images className="size-3.5" />
              {imagesLoading ? '—' : totalImages} ảnh đã tải lên
            </span>
            <span className="w-1 h-1 rounded-full bg-border" />
            <span className="flex items-center gap-1">
              <History className="size-3.5" />
              {historyLoading ? '—' : totalHistory} lần tìm kiếm
            </span>
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex sm:flex-col gap-2 shrink-0">
          <Button variant="brand" size="sm" asChild>
            <Link to="/upload">
              <UploadCloud className="size-3.5" />
              Tải ảnh lên
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate({ to: '/search' })}>
            <Search className="size-3.5" />
            Tìm kiếm
          </Button>
        </div>
      </div>

      {/* ── Uploaded images preview ── */}
      <Section
        icon={<Images className="size-4 text-white" />}
        title="Ảnh đã tải lên"
        count={totalImages > 0 ? totalImages : undefined}
        linkTo="/my-images"
        linkLabel="Xem tất cả"
      >
        <ImagesPreview images={images} loading={imagesLoading} />
      </Section>

      {/* ── Search history preview ── */}
      <Section
        icon={<History className="size-4 text-white" />}
        title="Lịch sử tìm kiếm"
        count={totalHistory > 0 ? totalHistory : undefined}
        linkTo="/history"
        linkLabel="Xem toàn bộ"
      >
        <HistoryPreview items={history} loading={historyLoading} />
      </Section>

    </div>
  )
}
