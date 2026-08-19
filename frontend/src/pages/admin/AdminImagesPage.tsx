import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import {
  Images,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  UploadCloud,
  AlertCircle,
  Filter,
  Loader2,
  CheckCircle2,
  CheckSquare,
  Square,
  ImageOff,
  Info,
  Search,
  SearchX,
} from 'lucide-react'
import { getImages } from '@/services/adminImageService'
import { bulkDeleteImages } from '@/services/myImagesService'
import { fetchImageAsFile, setPendingImageFile } from '@/services/searchService'
import { SkeletonGrid } from '@/components/results/SkeletonGrid'
import { MasonryGrid, type SearchResult } from '@/components/results/MasonryGrid'
import type { AdminImageItem } from '@/types/admin'
import { Button } from '@/components/ui/button'
import { DeleteConfirmModal } from '@/components/ui/DeleteConfirmModal'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'
import { getThumbnailUrl } from '@/lib/imageUtils'
import { formatFileSize } from '@/services/myImagesService'

// ============================================================
// AdminImagesPage — Kho ảnh cá nhân với UX đầy đủ
// Dùng API GET /admin/images, group theo ngày, lightbox toàn màn hình
// ============================================================

const PAGE_SIZE = 20

// ── Helpers ──────────────────────────────────────────────────

function getFilename(img: AdminImageItem): string {
  try {
    const url = new URL(img.imageUrl)
    const parts = url.pathname.split('/')
    const last = parts[parts.length - 1]
    if (last && last.includes('.')) return last
  } catch {
    // fallback
  }
  return `image-${img.id}.${img.fileFormat ?? 'jpg'}`
}

function mapAdminImageToSearchResult(img: AdminImageItem): SearchResult {
  return {
    id: img.id,
    thumbnailUrl: getThumbnailUrl(img.imageUrl),
    fullUrl: img.imageUrl,
    title: getFilename(img),
    width: img.width ?? undefined,
    height: img.height ?? undefined,
    aspectRatio: img.width && img.height ? `${img.width} / ${img.height}` : undefined,
    ocrText: img.imageIndex?.ocrLines?.map((l) => l.rawText).join(' '),
  }
}

// ── Date grouping ──────────────────────────────────────────────

function getDateKey(isoString: string): string {
  const d = new Date(isoString)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatDayLabel(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()

  if (isSameDay(date, today)) return 'Hôm nay'
  if (isSameDay(date, yesterday)) return 'Hôm qua'

  const diffMs = today.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const weekdays = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy']
  const weekday = weekdays[date.getDay()]

  if (diffDays < 7) return `${weekday}, ${day} tháng ${month}`
  if (date.getFullYear() === today.getFullYear()) return `${day} tháng ${month}`
  return `${day} tháng ${month}, ${year}`
}

function formatFullDateTime(isoString: string): string {
  const d = new Date(isoString)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} lúc ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

interface ImageGroup {
  dateKey: string
  label: string
  images: AdminImageItem[]
}

function groupByDay(images: AdminImageItem[]): ImageGroup[] {
  const map = new Map<string, AdminImageItem[]>()
  for (const img of images) {
    const key = getDateKey(img.createdAt)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(img)
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([dateKey, imgs]) => ({
      dateKey,
      label: formatDayLabel(dateKey),
      images: imgs,
    }))
}

// ── Filter bar ─────────────────────────────────────────────────

function getPreviousDay(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return ''
  date.setDate(date.getDate() - 1)
  return date.toISOString().split('T')[0]
}

function getNextDay(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return ''
  date.setDate(date.getDate() + 1)
  return date.toISOString().split('T')[0]
}

interface FilterBarProps {
  fileFormat: string
  fromDate: string
  toDate: string
  onFileFormatChange: (v: string) => void
  onFromDateChange: (v: string) => void
  onToDateChange: (v: string) => void
  onClear: () => void
  disabled?: boolean
}

function FilterBar({
  fileFormat,
  fromDate,
  toDate,
  onFileFormatChange,
  onFromDateChange,
  onToDateChange,
  onClear,
  disabled,
}: FilterBarProps) {
  const hasFilter = fileFormat || fromDate || toDate
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Filter className="size-4 text-muted-foreground shrink-0" />

      {/* Format */}
      <select
        id="img-format-filter"
        value={fileFormat}
        disabled={disabled}
        onChange={(e) => onFileFormatChange(e.target.value)}
        className="h-8 rounded-lg border border-border/60 bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
      >
        <option value="">Tất cả định dạng</option>
        <option value="jpg">JPG</option>
        <option value="png">PNG</option>
        <option value="webp">WebP</option>
      </select>

      {/* From date */}
      <input
        id="img-from-date"
        type="date"
        value={fromDate}
        disabled={disabled}
        max={toDate ? getPreviousDay(toDate) : undefined}
        onChange={(e) => onFromDateChange(e.target.value)}
        className="h-8 rounded-lg border border-border/60 bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
        placeholder="Từ ngày"
      />

      {/* To date */}
      <input
        id="img-to-date"
        type="date"
        value={toDate}
        disabled={disabled}
        min={fromDate ? getNextDay(fromDate) : undefined}
        onChange={(e) => onToDateChange(e.target.value)}
        className="h-8 rounded-lg border border-border/60 bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
        placeholder="Đến ngày"
      />

      {hasFilter && (
        <Button variant="ghost" size="sm" onClick={onClear} className="gap-1 text-muted-foreground" disabled={disabled}>
          <X className="size-3.5" />
          Xoá lọc
        </Button>
      )}
    </div>
  )
}

// ── Empty state ────────────────────────────────────────────────

function EmptyState({ hasFilter }: { hasFilter: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center space-y-5">
      <div className="relative">
        <div className="h-24 w-24 rounded-3xl bg-muted/60 border border-border/50 flex items-center justify-center">
          <ImageOff className="size-10 text-muted-foreground/50" strokeWidth={1.5} />
        </div>
        <div className="absolute -bottom-2 -right-2 h-8 w-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <UploadCloud className="size-4 text-primary" />
        </div>
      </div>

      <div className="space-y-1.5">
        <h3 className="text-lg font-bold text-foreground">
          {hasFilter ? 'Không có ảnh phù hợp với bộ lọc' : 'Chưa có ảnh nào'}
        </h3>
        <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
          {hasFilter ? 'Thử thay đổi bộ lọc hoặc xoá lọc để xem tất cả ảnh.' : 'Tải ảnh lên để AI phân tích và giúp bạn tìm kiếm dễ dàng hơn.'}
        </p>
      </div>

      {!hasFilter && (
        <Button id="admin-images-upload-cta" variant="brand" size="lg" asChild>
          <Link to="/upload">
            <UploadCloud className="size-4" />
            Tải ảnh lên ngay
          </Link>
        </Button>
      )}
    </div>
  )
}

// ── Day group ──────────────────────────────────────────────────

interface DayGroupProps {
  group: ImageGroup
  onImageClick: (image: AdminImageItem, groupImages: AdminImageItem[]) => void
  onSearchSimilar: (result: SearchResult) => void
  onDelete: (id: string) => void
  isSelectMode: boolean
  selectedIds: Set<string>
  onToggleSelect: (image: AdminImageItem) => void
}

function DayGroup({ group, onImageClick, onSearchSimilar, onDelete, isSelectMode, selectedIds, onToggleSelect }: DayGroupProps) {
  const searchResults = React.useMemo(
    () => group.images.map(mapAdminImageToSearchResult),
    [group.images],
  )

  const handleCardClick = (result: SearchResult) => {
    if (isSelectMode) return
    const found = group.images.find((img) => img.id === result.id)
    if (found) onImageClick(found, group.images)
  }

  const handleToggleSelect = (result: SearchResult) => {
    const found = group.images.find((img) => img.id === result.id)
    if (found) onToggleSelect(found)
  }

  const handleDeleteCard = (result: SearchResult) => {
    onDelete(result.id)
  }

  return (
    <div className="space-y-3">
      {/* Sticky group header */}
      <div className="flex items-center gap-3 sticky top-0 z-10 py-2.5 -mx-1 px-1 bg-background/80 backdrop-blur-md">
        <div className="flex items-center gap-2 pl-3 pr-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 shadow-sm shrink-0">
          <CalendarDays className="size-3.5 text-primary" />
          <span className="font-bold text-sm text-primary">{group.label}</span>
        </div>
        <div className="flex-1 h-px bg-border/40" />
      </div>

      {/* Masonry Grid — 5 columns default */}
      <MasonryGrid
        results={searchResults}
        onCardClick={handleCardClick}
        onSearchSimilar={onSearchSimilar}
        onDelete={handleDeleteCard}
        isSelectMode={isSelectMode}
        selectedIds={selectedIds}
        onToggleSelect={handleToggleSelect}
        breakpointCols={{
          default: 5,
          1536: 5,
          1280: 5,
          1024: 4,
          768: 3,
          640: 2,
          480: 2,
          380: 2,
        }}
      />
    </div>
  )
}

// ── Lightbox ────────────────────────────────────────────────────

interface LightboxProps {
  image: AdminImageItem
  allImages: AdminImageItem[]
  onClose: () => void
  onDelete: (id: string) => void
  onSearchSimilar: (result: SearchResult) => void
  onNavigate: (image: AdminImageItem) => void
}

function Lightbox({ image, allImages, onClose, onDelete, onSearchSimilar, onNavigate }: LightboxProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)

  const currentIndex = allImages.findIndex((img) => img.id === image.id)
  const hasPrev = currentIndex > 0
  const hasNext = currentIndex < allImages.length - 1

  const handlePrev = React.useCallback(() => {
    if (hasPrev) onNavigate(allImages[currentIndex - 1])
  }, [hasPrev, allImages, currentIndex, onNavigate])

  const handleNext = React.useCallback(() => {
    if (hasNext) onNavigate(allImages[currentIndex + 1])
  }, [hasNext, allImages, currentIndex, onNavigate])

  const handleDelete = async () => {
    setIsDeleting(true)
    await onDelete(image.id)
    setIsDeleting(false)
    setShowDeleteConfirm(false)
    onClose()
  }

  // Keyboard navigation
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') handlePrev()
      if (e.key === 'ArrowRight') handleNext()
      if (e.key === 'Delete') setShowDeleteConfirm(true)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, handlePrev, handleNext])

  // Prevent body scroll
  React.useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  const filename = getFilename(image)

  return (
    <>
    {ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-[9500] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={`Xem ảnh: ${filename}`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/92 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-5xl px-4 py-6 max-h-screen">
        {/* Top bar */}
        <div className="w-full flex items-center justify-between mb-4 gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex items-center justify-center size-7 rounded-lg bg-white/10 shrink-0">
              <Info className="size-3.5 text-white/70" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{filename}</p>
              <p className="text-xs text-white/60">
                {formatFullDateTime(image.createdAt)}{image.fileSize ? ` · ${formatFileSize(image.fileSize)}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Search similar button */}
            <button
              onClick={() => {
                onSearchSimilar(mapAdminImageToSearchResult(image))
                onClose()
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/90 text-xs font-semibold transition-all duration-150 border border-white/10"
              title="Tìm ảnh tương tự"
            >
              <Search className="size-3.5" />
              <span className="hidden sm:inline">Tìm tương tự</span>
            </button>

            {/* Delete button */}
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isDeleting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-destructive/80 text-white/80 hover:text-white text-xs font-semibold transition-all duration-150 border border-white/10 hover:border-destructive"
              title="Xoá ảnh (phím Delete)"
            >
              <Trash2 className="size-3.5" />
              Xoá
            </button>

            {/* Close button */}
            <button
              onClick={onClose}
              className="flex items-center justify-center size-8 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/10"
              aria-label="Đóng (Esc)"
              title="Đóng (Esc)"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Image + nav */}
        <div className="relative flex items-center gap-3 w-full justify-center">
          <button
            onClick={handlePrev}
            disabled={!hasPrev}
            className={cn(
              'flex items-center justify-center size-10 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all duration-150 border border-white/10 shrink-0',
              !hasPrev && 'opacity-30 cursor-not-allowed hover:bg-white/10',
            )}
            aria-label="Ảnh trước (←)"
          >
            <ChevronLeft className="size-5" />
          </button>

          <div className="flex-1 flex items-center justify-center min-w-0">
            <img
              src={image.imageUrl}
              alt={filename}
              className="max-h-[75vh] max-w-full object-contain rounded-xl shadow-2xl"
              style={{ display: 'block' }}
            />
          </div>

          <button
            onClick={handleNext}
            disabled={!hasNext}
            className={cn(
              'flex items-center justify-center size-10 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all duration-150 border border-white/10 shrink-0',
              !hasNext && 'opacity-30 cursor-not-allowed hover:bg-white/10',
            )}
            aria-label="Ảnh tiếp (→)"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>

        {/* Counter */}
        <p className="mt-3 text-xs text-white/50 font-medium">
          {currentIndex + 1} / {allImages.length}
        </p>

        {/* Keyboard hints */}
        <div className="flex items-center gap-4 mt-2 text-[10px] text-white/30 font-medium">
          <span>← → điều hướng</span>
          <span>Esc đóng</span>
          <span>Del xoá</span>
        </div>
      </div>
    </div>,
    document.body,
  )}
  {showDeleteConfirm && (
    <DeleteConfirmModal
      imageTitle={filename}
      isDeleting={isDeleting}
      onConfirm={handleDelete}
      onCancel={() => setShowDeleteConfirm(false)}
    />
  )}
  </>
  )
}

// ── Load more indicator ────────────────────────────────────────

function LoadMoreIndicator({
  isLoading,
  hasMore,
  total,
  count,
}: {
  isLoading: boolean
  hasMore: boolean
  total: number
  count: number
}) {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center gap-2 py-4 animate-fade-in">
        <Loader2 className="size-4 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Đang tải thêm ảnh...</span>
      </div>
    )
  }
  if (!hasMore && count > 0) {
    return (
      <div className="flex justify-center items-center gap-2 py-8 animate-fade-in">
        <CheckCircle2 className="size-4 text-muted-foreground/50" />
        <span className="text-sm text-muted-foreground/70">
          Đã hiển thị tất cả {total.toLocaleString('vi-VN')} ảnh
        </span>
      </div>
    )
  }
  return null
}

// ── Lightbox state ─────────────────────────────────────────────

interface LightboxState {
  image: AdminImageItem
  allImages: AdminImageItem[]
}

// ── Main page ──────────────────────────────────────────────────

export function AdminImagesPage() {
  const navigate = useNavigate()
  const { fileFormat, fromDate, toDate } = useSearch({ from: '/admin/images' })
  const toast = useToast()

  // ── UI state
  const [lightbox, setLightbox] = React.useState<LightboxState | null>(null)
  const [isSelectMode, setIsSelectMode] = React.useState(false)
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())
  const [isBulkDeleting, setIsBulkDeleting] = React.useState(false)
  const [showBulkConfirm, setShowBulkConfirm] = React.useState(false)

  // ── Infinite scroll state
  const [images, setImages] = React.useState<AdminImageItem[]>([])
  const [total, setTotal] = React.useState<number>(0)
  const [currentPage, setCurrentPage] = React.useState<number>(1)
  const [hasMore, setHasMore] = React.useState<boolean>(false)
  const [status, setStatus] = React.useState<'loading' | 'success' | 'empty' | 'error'>('loading')
  const [isLoadingMore, setIsLoadingMore] = React.useState<boolean>(false)

  // Refs
  const abortRef = React.useRef<AbortController | null>(null)
  const loadMoreAbortRef = React.useRef<AbortController | null>(null)
  const sentinelRef = React.useRef<HTMLDivElement>(null)

  const filterKey = `${fileFormat ?? ''}|${fromDate ?? ''}|${toDate ?? ''}`

  // ── fetchInitial ──────────────────────────────────────────────
  const fetchInitial = React.useCallback(async (
    fmt?: string,
    from?: string,
    to?: string,
  ) => {
    abortRef.current?.abort()
    loadMoreAbortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setStatus('loading')
    setImages([])
    setCurrentPage(1)
    setHasMore(false)
    setIsLoadingMore(false)

    try {
      const res = await getImages({
        page: 1,
        limit: PAGE_SIZE,
        fileFormat: (fmt as 'jpg' | 'png' | 'webp') || undefined,
        fromDate: from || undefined,
        toDate: to || undefined,
      })

      const items = res.data ?? []
      setImages(items)
      setTotal(res.meta.totalDocs)
      setCurrentPage(1)
      setHasMore(items.length < res.meta.totalDocs)
      setStatus(items.length === 0 ? 'empty' : 'success')
    } catch (err: unknown) {
      if ((err as { name?: string }).name === 'CanceledError' || (err as { name?: string }).name === 'AbortError') return
      console.error(err)
      setStatus('error')
      toast.error('Không thể tải danh sách ảnh')
    }
  }, [toast])

  // ── fetchMore ──────────────────────────────────────────────────
  const fetchMore = React.useCallback(async () => {
    if (isLoadingMore || !hasMore) return

    loadMoreAbortRef.current?.abort()
    const controller = new AbortController()
    loadMoreAbortRef.current = controller

    const nextPage = currentPage + 1
    setIsLoadingMore(true)

    try {
      const res = await getImages({
        page: nextPage,
        limit: PAGE_SIZE,
        fileFormat: (fileFormat as 'jpg' | 'png' | 'webp') || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      })

      const items = res.data ?? []
      setImages((prev) => [...prev, ...items])
      setTotal(res.meta.totalDocs)
      setCurrentPage(nextPage)
      setHasMore(nextPage < res.meta.totalPages)
    } catch (err: unknown) {
      if ((err as { name?: string }).name === 'CanceledError' || (err as { name?: string }).name === 'AbortError') return
      console.error(err)
      toast.error('Không thể tải thêm ảnh')
    } finally {
      setIsLoadingMore(false)
    }
  }, [isLoadingMore, hasMore, currentPage, fileFormat, fromDate, toDate, toast])

  // ── Effect: reload when filters change ────────────────────────
  React.useEffect(() => {
    fetchInitial(fileFormat ?? '', fromDate ?? '', toDate ?? '')
    return () => {
      abortRef.current?.abort()
      loadMoreAbortRef.current?.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey])

  // ── Effect: IntersectionObserver ───────────────────────────────
  React.useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !isLoadingMore) {
          fetchMore()
        }
      },
      { threshold: 0.1, rootMargin: '300px 0px' },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, isLoadingMore, fetchMore])

  // ── Derived: grouped images ────────────────────────────────────
  const groups = React.useMemo(() => groupByDay(images), [images])

  // ── Delete single ──────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    try {
      const result = await bulkDeleteImages([id])
      if (result.failedIds.length > 0) {
        toast.error('Xoá ảnh thất bại, vui lòng thử lại')
      } else {
        setImages((prev) => prev.filter((img) => img.id !== id))
        setTotal((prev) => Math.max(0, prev - 1))
        toast.success('Đã chuyển ảnh vào thùng rác')
      }
    } catch {
      toast.error('Xoá ảnh thất bại, vui lòng thử lại')
    }
  }

  // ── Bulk select ────────────────────────────────────────────────
  const toggleSelectMode = React.useCallback(() => {
    setIsSelectMode((prev) => {
      if (prev) {
        setSelectedIds(new Set())
        setShowBulkConfirm(false)
      }
      return !prev
    })
  }, [])

  const toggleSelectImage = React.useCallback((image: AdminImageItem) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(image.id)) {
        next.delete(image.id)
      } else {
        next.add(image.id)
      }
      return next
    })
  }, [])

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    setIsBulkDeleting(true)
    try {
      const ids = Array.from(selectedIds)
      const result = await bulkDeleteImages(ids)
      const deletedSet = new Set(
        result.failedIds.length > 0
          ? ids.filter((id) => !result.failedIds.includes(id))
          : ids,
      )
      setImages((prev) => prev.filter((img) => !deletedSet.has(img.id)))
      setTotal((prev) => Math.max(0, prev - deletedSet.size))
      if (result.failedIds.length > 0) {
        toast.error(`Xoá ${result.deleted}/${result.requested} ảnh. ${result.failedIds.length} ảnh thất bại.`)
      } else {
        toast.success(`Đã xoá ${result.deleted} ảnh thành công.`)
      }
      setSelectedIds(new Set())
      setIsSelectMode(false)
      setShowBulkConfirm(false)
    } catch {
      toast.error('Không thể xoá ảnh. Vui lòng thử lại.')
    } finally {
      setIsBulkDeleting(false)
    }
  }

  // ── Search similar ────────────────────────────────────────────
  const handleSearchSimilar = async (result: SearchResult) => {
    try {
      const urlToFetch = result.fullUrl ?? result.thumbnailUrl
      const file = await fetchImageAsFile(urlToFetch)
      const newQueryId = `upload-${Date.now()}`
      setPendingImageFile(file)
      navigate({ to: '/results', search: { mode: 'image', q: '', query_id: newQueryId } })
    } catch (err) {
      console.error(err)
      toast.error('Không thể tải ảnh để tìm kiếm')
    }
  }

  // ── Lightbox handlers ─────────────────────────────────────────
  const handleImageClick = (image: AdminImageItem, groupImages: AdminImageItem[]) => {
    if (isSelectMode) return
    setLightbox({ image, allImages: groupImages })
  }

  const handleLightboxNavigate = (image: AdminImageItem) => {
    setLightbox((prev) => (prev ? { ...prev, image } : null))
  }

  // ── Filter handlers ────────────────────────────────────────────
  const hasFilter = fileFormat || fromDate || toDate
  const isFilterDisabled = status === 'loading' || isLoadingMore

  const handleFilterChange = (patch: { fileFormat?: string; fromDate?: string; toDate?: string }) => {
    const newFromDate = patch.fromDate !== undefined ? patch.fromDate : (fromDate ?? '')
    const newToDate = patch.toDate !== undefined ? patch.toDate : (toDate ?? '')

    if (newFromDate && newToDate && newFromDate >= newToDate) {
      toast.error('Từ ngày phải nhỏ hơn Đến ngày')
      return
    }

    navigate({
      to: '/admin/images',
      search: {
        fileFormat: patch.fileFormat ?? fileFormat ?? '',
        fromDate: newFromDate,
        toDate: newToDate,
      },
    })
  }

  const clearFilter = () =>
    navigate({ to: '/admin/images', search: { fileFormat: '', fromDate: '', toDate: '' } })

  // ── Render ────────────────────────────────────────────────────
  return (
    <>
      <div className="min-h-[calc(100vh-4rem)] bg-background">
        {/* Hero gradient backdrop */}
        <div
          className="absolute top-0 left-0 right-0 h-64 pointer-events-none -z-0 opacity-30"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 50% -10%, oklch(0.52 0.22 268 / 0.4), transparent)',
          }}
        />

        <div className="relative z-[1] max-w-[1600px] mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
          {/* ── Page Header ── */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center size-10 rounded-2xl gradient-brand shadow-brand">
                  <Images className="size-5 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                    Kho ảnh
                  </h1>
                  {status !== 'loading' && total > 0 && (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground">{total.toLocaleString()}</span> ảnh đã index
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
              {/* Select mode toggle */}
              {status === 'success' && images.length > 0 && (
                <button
                  id="admin-images-select-mode-btn"
                  onClick={toggleSelectMode}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all duration-200',
                    isSelectMode
                      ? 'bg-destructive/10 border-destructive/40 text-destructive hover:bg-destructive/20'
                      : 'bg-muted/60 border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  {isSelectMode ? (
                    <>
                      <X className="size-3.5" />
                      <span className="hidden sm:inline">Huỷ chọn</span>
                      {selectedIds.size > 0 && (
                        <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
                          {selectedIds.size}
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <CheckSquare className="size-3.5" />
                      <span className="hidden sm:inline">Chọn để xoá</span>
                    </>
                  )}
                </button>
              )}

              <Button
                id="admin-images-search-delete-btn"
                variant="outline"
                size="sm"
                asChild
                className="shrink-0 text-destructive border-destructive/30 hover:bg-destructive/8 hover:border-destructive/50 hover:text-destructive"
              >
                <Link to="/admin/search-delete">
                  <SearchX className="size-4" />
                  <span className="hidden sm:inline">Tìm &amp; Xoá</span>
                </Link>
              </Button>

              <Button
                id="admin-images-trash-btn"
                variant="ghost"
                size="sm"
                asChild
                className="shrink-0 text-muted-foreground hover:text-foreground"
              >
                <Link to="/admin/trash">
                  <Trash2 className="size-4" />
                  <span className="hidden sm:inline">Thùng rác</span>
                </Link>
              </Button>

              <Button
                id="admin-images-upload-btn"
                variant="brand"
                size="sm"
                asChild
                className="shrink-0"
              >
                <Link to="/upload">
                  <UploadCloud className="size-4" />
                  <span className="hidden sm:inline">Tải thêm ảnh</span>
                </Link>
              </Button>
            </div>
          </div>

          {/* ── Filter bar ── */}
          <FilterBar
            fileFormat={fileFormat ?? ''}
            fromDate={fromDate ?? ''}
            toDate={toDate ?? ''}
            onFileFormatChange={(v) => handleFilterChange({ fileFormat: v })}
            onFromDateChange={(v) => handleFilterChange({ fromDate: v })}
            onToDateChange={(v) => handleFilterChange({ toDate: v })}
            onClear={clearFilter}
            disabled={isFilterDisabled}
          />

          {/* ── Loading state ── */}
          {status === 'loading' && <SkeletonGrid count={12} />}

          {/* ── Error state ── */}
          {status === 'error' && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <AlertCircle className="size-10 text-destructive" />
              <p className="font-semibold">Không thể tải danh sách ảnh</p>
              <Button variant="outline" onClick={() => fetchInitial(fileFormat ?? '', fromDate ?? '', toDate ?? '')}>
                Thử lại
              </Button>
            </div>
          )}

          {/* ── Empty state ── */}
          {status === 'empty' && <EmptyState hasFilter={!!hasFilter} />}

          {/* ── Image groups ── */}
          {status === 'success' && groups.length > 0 && (
            <div className="space-y-10">
              {groups.map((group) => (
                <DayGroup
                  key={group.dateKey}
                  group={group}
                  onImageClick={handleImageClick}
                  onSearchSimilar={handleSearchSimilar}
                  onDelete={handleDelete}
                  isSelectMode={isSelectMode}
                  selectedIds={selectedIds}
                  onToggleSelect={toggleSelectImage}
                />
              ))}
            </div>
          )}

          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} className="w-full h-4" aria-hidden="true" />

          {/* ── Load more indicator ── */}
          {status === 'success' && images.length > 0 && (
            <div className="flex flex-col items-center gap-3 pt-4 pb-8">
              <LoadMoreIndicator
                isLoading={isLoadingMore}
                hasMore={hasMore}
                total={total}
                count={images.length}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Lightbox ── */}
      {lightbox && !isSelectMode && (
        <Lightbox
          image={lightbox.image}
          allImages={lightbox.allImages}
          onClose={() => setLightbox(null)}
          onDelete={handleDelete}
          onSearchSimilar={handleSearchSimilar}
          onNavigate={handleLightboxNavigate}
        />
      )}

      {/* ── Bulk Delete Floating Toolbar ── */}
      {isSelectMode && ReactDOM.createPortal(
        <div
          className={cn(
            'fixed bottom-0 left-0 right-0 z-[9000] flex justify-center px-4 pb-6 pt-3',
            'animate-slide-up',
          )}
          style={{
            animation: 'slideUpFade 0.25s cubic-bezier(0.34,1.56,0.64,1) both',
          }}
        >
          <div className="w-full max-w-lg bg-card/95 backdrop-blur-xl border border-border/60 rounded-2xl shadow-2xl px-4 py-3 flex items-center justify-between gap-4">
            {/* Left: selection info */}
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center size-8 rounded-xl bg-primary/10 shrink-0">
                {selectedIds.size > 0
                  ? <CheckSquare className="size-4 text-primary" />
                  : <Square className="size-4 text-muted-foreground" />
                }
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">
                  {selectedIds.size > 0
                    ? `Đã chọn ${selectedIds.size} ảnh`
                    : 'Chưa chọn ảnh nào'
                  }
                </p>
                <p className="text-[11px] text-muted-foreground">Click vào ảnh để chọn</p>
              </div>
            </div>

            {/* Right: action buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                id="admin-bulk-delete-cancel-btn"
                onClick={toggleSelectMode}
                disabled={isBulkDeleting}
                className="px-3 py-1.5 rounded-xl text-sm font-semibold bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60 transition-all duration-150 disabled:opacity-50"
              >
                Huỷ
              </button>

              <button
                id="admin-bulk-delete-trigger-btn"
                onClick={() => setShowBulkConfirm(true)}
                disabled={selectedIds.size === 0 || isBulkDeleting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold bg-destructive hover:bg-destructive/90 text-destructive-foreground border border-destructive/60 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
              >
                <Trash2 className="size-3.5" />
                Xoá {selectedIds.size > 0 ? `${selectedIds.size} ảnh` : 'ảnh'}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* Bulk Delete Confirm Modal */}
      {showBulkConfirm && (
        <DeleteConfirmModal
          imageTitle={`Xoá ${selectedIds.size} ảnh đã chọn`}
          description="Các ảnh sẽ được xoá vĩnh viễn khỏi hệ thống."
          isDeleting={isBulkDeleting}
          onConfirm={handleBulkDelete}
          onCancel={() => setShowBulkConfirm(false)}
          confirmLabel={`Xoá ${selectedIds.size} ảnh`}
        />
      )}
    </>
  )
}
