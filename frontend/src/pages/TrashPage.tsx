import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { Link } from '@tanstack/react-router'
import {
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  CheckSquare,
  Square,
  RotateCcw,
  PackageOpen,
  Info,
} from 'lucide-react'
import {
  getTrashImages,
  bulkRestoreImages,
  permanentDeleteImages,
  type TrashImage,
} from '@/services/myImagesService'
import { SkeletonGrid } from '@/components/results/SkeletonGrid'
import { MasonryGrid, type SearchResult } from '@/components/results/MasonryGrid'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/Toast'
import { DeleteConfirmModal } from '@/components/ui/DeleteConfirmModal'
import { cn } from '@/lib/utils'
import { getThumbnailUrl } from '@/lib/imageUtils'
import { formatFileSize } from '@/services/myImagesService'

// ============================================================
// Constants
// ============================================================

const PAGE_SIZE = 20

// ============================================================
// Helper: Map TrashImage -> SearchResult
// ============================================================

function mapTrashImageToSearchResult(img: TrashImage): SearchResult {
  return {
    id: img.id,
    thumbnailUrl: getThumbnailUrl(img.imageUrl),
    fullUrl: img.imageUrl,
    title: img.filename,
    width: img.width ?? undefined,
    height: img.height ?? undefined,
    aspectRatio: img.width && img.height ? `${img.width} / ${img.height}` : undefined,
  }
}

// ============================================================
// Date utilities
// ============================================================

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

  if (isSameDay(date, today)) return 'Xoá hôm nay'
  if (isSameDay(date, yesterday)) return 'Xoá hôm qua'

  const weekdays = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy']
  const weekday = weekdays[date.getDay()]
  const diffMs = today.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 7) return `Xoá ${weekday}, ${day} tháng ${month}`
  if (date.getFullYear() === today.getFullYear()) return `Xoá ${day} tháng ${month}`
  return `Xoá ${day} tháng ${month}, ${year}`
}

// ============================================================
// Group images by deletion day
// ============================================================

interface TrashGroup {
  dateKey: string
  label: string
  images: TrashImage[]
}

function groupByDeletionDay(images: TrashImage[]): TrashGroup[] {
  const map = new Map<string, TrashImage[]>()
  for (const img of images) {
    const key = getDateKey(img.deletedAt)
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

// ============================================================
// Remaining days badge
// ============================================================

function RemainingDaysBadge({ days }: { days: number }) {
  return (
    <div
      className={cn(
        'px-2 py-0.5 rounded-full text-[10px] font-bold',
        'backdrop-blur-sm border shadow-sm',
        days <= 3
          ? 'bg-destructive/80 border-destructive/60 text-white'
          : days <= 7
            ? 'bg-amber-500/80 border-amber-400/60 text-white'
            : 'bg-black/50 border-white/20 text-white/90',
      )}
      title={`Còn ${days} ngày trước khi bị xoá vĩnh viễn`}
    >
      {days <= 1 ? '< 1 ngày' : `${days} ngày`}
    </div>
  )
}

// ============================================================
// Helper: format date-time
// ============================================================

function formatFullDateTime(isoString: string): string {
  const d = new Date(isoString)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} lúc ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// ============================================================
// Trash Lightbox
// ============================================================

interface TrashLightboxProps {
  image: TrashImage
  allImages: TrashImage[]
  onClose: () => void
  onRestore: (id: string) => Promise<void>
  onPermanentDelete: (id: string) => Promise<void>
  onNavigate: (image: TrashImage) => void
}

function TrashLightbox({ image, allImages, onClose, onRestore, onPermanentDelete, onNavigate }: TrashLightboxProps) {
  const [isRestoring, setIsRestoring] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false)

  const currentIndex = allImages.findIndex((img) => img.id === image.id)
  const hasPrev = currentIndex > 0
  const hasNext = currentIndex < allImages.length - 1

  const handlePrev = React.useCallback(() => {
    if (hasPrev) onNavigate(allImages[currentIndex - 1])
  }, [hasPrev, allImages, currentIndex, onNavigate])

  const handleNext = React.useCallback(() => {
    if (hasNext) onNavigate(allImages[currentIndex + 1])
  }, [hasNext, allImages, currentIndex, onNavigate])

  const handleRestore = async () => {
    setIsRestoring(true)
    await onRestore(image.id)
    setIsRestoring(false)
    onClose()
  }

  const handlePermanentDelete = async () => {
    setIsDeleting(true)
    await onPermanentDelete(image.id)
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
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, handlePrev, handleNext])

  // Prevent body scroll
  React.useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const isBusy = isRestoring || isDeleting

  return (
    <>
    {ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-[9500] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={`Xem ảnh: ${image.filename}`}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/92 backdrop-blur-md" onClick={onClose} />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-5xl px-4 py-6 max-h-screen">
        {/* Top bar */}
        <div className="w-full flex items-center justify-between mb-4 gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex items-center justify-center size-7 rounded-lg bg-white/10 shrink-0">
              <Info className="size-3.5 text-white/70" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{image.filename}</p>
              <p className="text-xs text-white/60">
                Xoá {formatFullDateTime(image.deletedAt)}
                {image.size ? ` · ${formatFileSize(image.size)}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Remaining days badge */}
            <div
              className={cn(
                'px-2.5 py-1 rounded-full text-xs font-bold border',
                image.remainingDays <= 3
                  ? 'bg-destructive/80 border-destructive/60 text-white'
                  : image.remainingDays <= 7
                    ? 'bg-amber-500/80 border-amber-400/60 text-white'
                    : 'bg-white/10 border-white/20 text-white/80',
              )}
            >
              Còn {image.remainingDays <= 1 ? '< 1 ngày' : `${image.remainingDays} ngày`}
            </div>

            {/* Restore button */}
            <button
              onClick={handleRestore}
              disabled={isBusy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/80 hover:bg-emerald-500 text-white text-xs font-semibold transition-all duration-150 border border-emerald-400/40 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Khôi phục ảnh"
            >
              {isRestoring ? <Loader2 className="size-3.5 animate-spin" /> : <RotateCcw className="size-3.5" />}
              <span className="hidden sm:inline">Khôi phục</span>
            </button>

            {/* Permanent delete button */}
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isBusy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-destructive/80 text-white/80 hover:text-white text-xs font-semibold transition-all duration-150 border border-white/10 hover:border-destructive disabled:opacity-50 disabled:cursor-not-allowed"
              title="Xoá vĩnh viễn"
            >
              <Trash2 className="size-3.5" />
              <span className="hidden sm:inline">Xoá vĩnh viễn</span>
            </button>

            {/* Close button */}
            <button
              onClick={onClose}
              className="flex items-center justify-center size-8 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/10"
              aria-label="Đóng (Esc)"
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
              alt={image.filename}
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

        {/* Counter + hints */}
        <p className="mt-3 text-xs text-white/50 font-medium">
          {currentIndex + 1} / {allImages.length}
        </p>
        <div className="flex items-center gap-4 mt-2 text-[10px] text-white/30 font-medium">
          <span>← → điều hướng</span>
          <span>Esc đóng</span>
        </div>
      </div>
    </div>,
    document.body,
  )}
  {showDeleteConfirm && (
    <DeleteConfirmModal
      imageTitle={image.filename}
      description="Ảnh sẽ bị XOÁ VĨNH VIỄN và KHÔNG THỂ KHÔI PHỤC."
      isDeleting={isDeleting}
      onConfirm={handlePermanentDelete}
      onCancel={() => setShowDeleteConfirm(false)}
      confirmLabel="Xoá vĩnh viễn"
    />
  )}
  </>
  )
}

// ============================================================
// Empty state
// ============================================================

function EmptyState({ backTo, backLabel }: { backTo: string; backLabel: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center space-y-5">
      <div className="relative">
        <div className="h-24 w-24 rounded-3xl bg-muted/60 border border-border/50 flex items-center justify-center">
          <PackageOpen className="size-10 text-muted-foreground/50" strokeWidth={1.5} />
        </div>
        <div className="absolute -bottom-2 -right-2 h-8 w-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <CheckCircle2 className="size-4 text-emerald-500" />
        </div>
      </div>
      <div className="space-y-1.5">
        <h3 className="text-lg font-bold text-foreground">Thùng rác trống</h3>
        <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
          Không có ảnh nào trong thùng rác. Các ảnh bị xoá sẽ được giữ ở đây trước khi bị xoá vĩnh viễn.
        </p>
      </div>
      <Button id="trash-back-btn" variant="brand" size="lg" asChild>
        <Link to={backTo}>
          <ChevronLeft className="size-4" />
          {backLabel}
        </Link>
      </Button>
    </div>
  )
}

// ============================================================
// Day group
// ============================================================

interface TrashGroupProps {
  group: TrashGroup
  isSelectMode: boolean
  selectedIds: Set<string>
  onToggleSelect: (image: TrashImage) => void
  onImageClick: (image: TrashImage, groupImages: TrashImage[]) => void
  remainingDaysMap: Map<string, number>
}

function TrashDayGroup({ group, isSelectMode, selectedIds, onToggleSelect, onImageClick, remainingDaysMap }: TrashGroupProps) {
  const searchResults = React.useMemo(
    () => group.images.map(mapTrashImageToSearchResult),
    [group.images],
  )

  const handleToggleSelect = (result: SearchResult) => {
    const found = group.images.find((img) => img.id === result.id)
    if (found) onToggleSelect(found)
  }

  const handleCardClick = (result: SearchResult) => {
    if (isSelectMode) return
    const found = group.images.find((img) => img.id === result.id)
    if (found) onImageClick(found, group.images)
  }

  return (
    <div className="space-y-3">
      {/* Sticky group header */}
      <div className="flex items-center gap-2.5 sticky top-[61px] z-10 py-2 bg-background/90 backdrop-blur-md">
        <div className="flex items-center justify-center size-7 rounded-lg bg-destructive/10 shrink-0">
          <CalendarDays className="size-3.5 text-destructive" />
        </div>
        <span className="font-bold text-sm text-foreground">{group.label}</span>
        <div className="flex-1 h-px bg-border/50 ml-1" />
        {/* Show min remainingDays of this group */}
        {(() => {
          const days = group.images.map((img) => remainingDaysMap.get(img.id) ?? 999)
          const minDays = Math.min(...days)
          if (minDays < 999) {
            return (
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs text-muted-foreground">sớm nhất còn</span>
                <RemainingDaysBadge days={minDays} />
              </div>
            )
          }
          return null
        })()}
      </div>

      {/* Masonry Grid */}
      <MasonryGrid
        results={searchResults}
        onCardClick={handleCardClick}
        isSelectMode={isSelectMode}
        selectedIds={selectedIds}
        onToggleSelect={handleToggleSelect}
      />
    </div>
  )
}

// ============================================================
// TrashPage
// ============================================================

export function TrashPage() {
  const toast = useToast()
  const backTo = '/admin/images'
  const backLabel = 'Kho ảnh'

  // ── Data state ────────────────────────────────────────────
  const [images, setImages] = React.useState<TrashImage[]>([])
  const [totalDocs, setTotalDocs] = React.useState(0)
  const [hasMore, setHasMore] = React.useState(false)
  const [page, setPage] = React.useState(1)

  // ── Loading state ──────────────────────────────────────────
  const [isInitialLoading, setIsInitialLoading] = React.useState(true)
  const [isLoadingMore, setIsLoadingMore] = React.useState(false)

  // ── Lightbox state ──────────────────────────────────────────
  const [lightbox, setLightbox] = React.useState<{ image: TrashImage; allImages: TrashImage[] } | null>(null)

  // ── Bulk select ────────────────────────────────────────────
  const [isSelectMode, setIsSelectMode] = React.useState(false)
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())
  const [isBulkRestoring, setIsBulkRestoring] = React.useState(false)
  const [isBulkPermanentDeleting, setIsBulkPermanentDeleting] = React.useState(false)
  const [showPermanentConfirm, setShowPermanentConfirm] = React.useState(false)

  // ── RemainingDays map (id → days) ──────────────────────────
  const remainingDaysMap = React.useMemo(() => {
    const map = new Map<string, number>()
    for (const img of images) map.set(img.id, img.remainingDays)
    return map
  }, [images])

  // ── Refs ──────────────────────────────────────────────────
  const sentinelRef = React.useRef<HTMLDivElement>(null)

  // ── Initial fetch ─────────────────────────────────────────
  React.useEffect(() => {
    let cancelled = false
    async function fetchInitial() {
      setIsInitialLoading(true)
      try {
        const result = await getTrashImages({ page: 1, limit: PAGE_SIZE })
        if (!cancelled) {
          setImages(result.images)
          setTotalDocs(result.totalDocs)
          setHasMore(result.hasMore)
          setPage(1)
        }
      } catch {
        if (!cancelled) toast.error('Không thể tải danh sách thùng rác. Vui lòng thử lại.')
      } finally {
        if (!cancelled) setIsInitialLoading(false)
      }
    }
    fetchInitial()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Load more ─────────────────────────────────────────────
  const handleLoadMore = React.useCallback(async () => {
    if (isLoadingMore || !hasMore) return
    setIsLoadingMore(true)
    try {
      const nextPage = page + 1
      const result = await getTrashImages({ page: nextPage, limit: PAGE_SIZE })
      setImages((prev) => [...prev, ...result.images])
      setTotalDocs(result.totalDocs)
      setHasMore(result.hasMore)
      setPage(nextPage)
    } catch {
      toast.error('Không thể tải thêm ảnh. Vui lòng thử lại.')
    } finally {
      setIsLoadingMore(false)
    }
  }, [isLoadingMore, hasMore, page, toast])

  // ── IntersectionObserver ──────────────────────────────────
  React.useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && hasMore && !isLoadingMore) handleLoadMore() },
      { threshold: 0.1, rootMargin: '300px 0px' },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, isLoadingMore, handleLoadMore])

  // ── Select mode handlers ──────────────────────────────────
  const toggleSelectMode = React.useCallback(() => {
    setIsSelectMode((prev) => {
      if (prev) {
        setSelectedIds(new Set())
        setShowPermanentConfirm(false)
      }
      return !prev
    })
  }, [])

  const toggleSelectImage = React.useCallback((image: TrashImage) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(image.id)) next.delete(image.id)
      else next.add(image.id)
      return next
    })
  }, [])

  // ── Bulk Restore ──────────────────────────────────────────
  const handleBulkRestore = async () => {
    if (selectedIds.size === 0) return
    setIsBulkRestoring(true)
    try {
      const ids = Array.from(selectedIds)
      const result = await bulkRestoreImages(ids)
      const restoredSet = new Set(
        result.failedIds.length > 0
          ? ids.filter((id) => !result.failedIds.includes(id))
          : ids,
      )
      setImages((prev) => prev.filter((img) => !restoredSet.has(img.id)))
      setTotalDocs((prev) => Math.max(0, prev - restoredSet.size))
      if (result.failedIds.length > 0) {
        toast.error(`Khôi phục ${result.restored}/${result.requested} ảnh. ${result.failedIds.length} ảnh thất bại.`)
      } else {
        toast.success(`Đã khôi phục ${result.restored} ảnh thành công.`)
      }
      setSelectedIds(new Set())
      setIsSelectMode(false)
    } catch {
      toast.error('Không thể khôi phục ảnh. Vui lòng thử lại.')
    } finally {
      setIsBulkRestoring(false)
    }
  }

  // ── Permanent Delete ──────────────────────────────────────
  const handlePermanentDelete = async () => {
    if (selectedIds.size === 0) return
    setIsBulkPermanentDeleting(true)
    try {
      const ids = Array.from(selectedIds)
      const result = await permanentDeleteImages(ids)
      const deletedSet = new Set(result.deletedIds)
      setImages((prev) => prev.filter((img) => !deletedSet.has(img.id)))
      setTotalDocs((prev) => Math.max(0, prev - deletedSet.size))
      if (result.failedIds.length > 0) {
        toast.error(`Xoá vĩnh viễn ${result.deleted}/${result.requested} ảnh. ${result.failedIds.length} thất bại.`)
      } else {
        toast.success(`Đã xoá vĩnh viễn ${result.deleted} ảnh.`)
      }
      setSelectedIds(new Set())
      setIsSelectMode(false)
      setShowPermanentConfirm(false)
    } catch {
      toast.error('Không thể xoá vĩnh viễn ảnh. Vui lòng thử lại.')
    } finally {
      setIsBulkPermanentDeleting(false)
    }
  }

  // ── Single image handlers (from Lightbox) ───────────────────
  const handleImageClick = (image: TrashImage, groupImages: TrashImage[]) => {
    if (isSelectMode) return
    setLightbox({ image, allImages: groupImages })
  }

  const handleLightboxNavigate = (image: TrashImage) => {
    setLightbox((prev) => (prev ? { ...prev, image } : null))
  }

  const handleSingleRestore = async (id: string) => {
    try {
      await bulkRestoreImages([id])
      setImages((prev) => prev.filter((img) => img.id !== id))
      setTotalDocs((prev) => Math.max(0, prev - 1))
      toast.success('Đã khôi phục ảnh thành công.')
    } catch {
      toast.error('Không thể khôi phục ảnh. Vui lòng thử lại.')
    }
  }

  const handleSinglePermanentDelete = async (id: string) => {
    try {
      const result = await permanentDeleteImages([id])
      if (result.deleted > 0) {
        setImages((prev) => prev.filter((img) => !result.deletedIds.includes(img.id)))
        setTotalDocs((prev) => Math.max(0, prev - result.deleted))
        toast.success('Đã xoá vĩnh viễn ảnh.')
      } else {
        toast.error('Không thể xoá vĩnh viễn ảnh. Vui lòng thử lại.')
      }
    } catch {
      toast.error('Không thể xoá vĩnh viễn ảnh. Vui lòng thử lại.')
    }
  }

  // ── Derived ────────────────────────────────────────────────
  const groups = React.useMemo(() => groupByDeletionDay(images), [images])
  const isBusy = isBulkRestoring || isBulkPermanentDeleting

  // ── Render ────────────────────────────────────────────────
  return (
    <>
      <div className="min-h-[calc(100vh-4rem)] bg-background">
        {/* Hero gradient backdrop — warm red/orange for trash theme */}
        <div
          className="absolute top-0 left-0 right-0 h-64 pointer-events-none -z-0 opacity-25"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 50% -10%, oklch(0.55 0.18 30 / 0.5), transparent)',
          }}
        />

        <div className="relative z-[1] max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
          {/* ── Page Header ── */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center size-10 rounded-2xl bg-destructive/10 border border-destructive/20 shadow-sm shrink-0">
                  <Trash2 className="size-5 text-destructive" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                    Thùng rác
                  </h1>
                  {!isInitialLoading && totalDocs > 0 && (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground">{totalDocs.toLocaleString()}</span> ảnh đang chờ xoá vĩnh viễn
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Header actions */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Select mode toggle */}
              {!isInitialLoading && images.length > 0 && (
                <button
                  id="trash-select-mode-btn"
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
                      Huỷ chọn
                      {selectedIds.size > 0 && (
                        <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
                          {selectedIds.size}
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <CheckSquare className="size-3.5" />
                      Chọn ảnh
                    </>
                  )}
                </button>
              )}

              <Button
                id="trash-back-to-images-btn"
                variant="ghost"
                size="sm"
                asChild
                className="shrink-0 text-muted-foreground"
              >
                <Link to={backTo}>
                  <ChevronLeft className="size-4" />
                  {backLabel}
                </Link>
              </Button>
            </div>
          </div>

          {/* ── Info banner ── */}
          {!isInitialLoading && images.length > 0 && (
            <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
              <AlertTriangle className="size-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground leading-relaxed">
                Ảnh trong thùng rác sẽ bị xoá vĩnh viễn tự động sau một khoảng thời gian nhất định.
                Bạn có thể <strong className="text-foreground">khôi phục</strong> hoặc <strong className="text-destructive">xoá ngay lập tức</strong>.
              </p>
            </div>
          )}

          {/* ── Loading state ── */}
          {isInitialLoading && <SkeletonGrid count={12} />}

          {/* ── Empty state ── */}
          {!isInitialLoading && images.length === 0 && <EmptyState backTo={backTo} backLabel={backLabel} />}

          {/* ── Image groups ── */}
          {!isInitialLoading && groups.length > 0 && (
            <div className="space-y-10">
              {groups.map((group) => (
                <TrashDayGroup
                  key={group.dateKey}
                  group={group}
                  isSelectMode={isSelectMode}
                  selectedIds={selectedIds}
                  onToggleSelect={toggleSelectImage}
                  onImageClick={handleImageClick}
                  remainingDaysMap={remainingDaysMap}
                />
              ))}
            </div>
          )}

          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} className="w-full h-4" aria-hidden="true" />

          {/* ── Load more indicator ── */}
          {!isInitialLoading && images.length > 0 && (
            <div className="flex flex-col items-center gap-3 pt-4 pb-8">
              {isLoadingMore ? (
                <div className="flex justify-center items-center gap-2 py-4 animate-fade-in">
                  <Loader2 className="size-4 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Đang tải thêm ảnh...</span>
                </div>
              ) : !hasMore ? (
                <div className="flex justify-center items-center gap-2 py-8 animate-fade-in">
                  <CheckCircle2 className="size-4 text-muted-foreground/50" />
                  <span className="text-sm text-muted-foreground/70">
                    Đã hiển thị tất cả {totalDocs.toLocaleString('vi-VN')} ảnh trong thùng rác
                  </span>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* ── Floating Toolbar ── */}
      {isSelectMode && ReactDOM.createPortal(
        <div
          style={{ animation: 'slideUpFade 0.25s cubic-bezier(0.34,1.56,0.64,1) both' }}
          className="fixed bottom-0 left-0 right-0 z-[9000] flex justify-center px-4 pb-6 pt-3"
        >
          <div className="w-full max-w-xl bg-card/95 backdrop-blur-xl border border-border/60 rounded-2xl shadow-2xl px-4 py-3 flex items-center justify-between gap-3">
            {/* Left: selection info */}
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex items-center justify-center size-8 rounded-xl bg-primary/10 shrink-0">
                {selectedIds.size > 0
                  ? <CheckSquare className="size-4 text-primary" />
                  : <Square className="size-4 text-muted-foreground" />
                }
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground truncate">
                  {selectedIds.size > 0 ? `Đã chọn ${selectedIds.size} ảnh` : 'Chưa chọn ảnh nào'}
                </p>
                <p className="text-[11px] text-muted-foreground">Click vào ảnh để chọn</p>
              </div>
            </div>

            {/* Right: action buttons */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Cancel */}
              <button
                id="trash-toolbar-cancel-btn"
                onClick={toggleSelectMode}
                disabled={isBusy}
                className="px-3 py-1.5 rounded-xl text-sm font-semibold bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60 transition-all duration-150 disabled:opacity-50"
              >
                Huỷ
              </button>

              {/* Restore button */}
              <button
                id="trash-restore-btn"
                onClick={handleBulkRestore}
                disabled={selectedIds.size === 0 || isBusy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500/60 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
              >
                {isBulkRestoring
                  ? <Loader2 className="size-3.5 animate-spin" />
                  : <RotateCcw className="size-3.5" />
                }
                {isBulkRestoring
                  ? 'Đang khôi phục...'
                  : `Khôi phục${selectedIds.size > 0 ? ` ${selectedIds.size}` : ''}`
                }
              </button>

              {/* Permanent delete — triggers modal */}
              <button
                id="trash-permanent-delete-trigger-btn"
                onClick={() => setShowPermanentConfirm(true)}
                disabled={selectedIds.size === 0 || isBusy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold bg-destructive hover:bg-destructive/90 text-destructive-foreground border border-destructive/60 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
              >
                <Trash2 className="size-3.5" />
                Xoá vĩnh viễn{selectedIds.size > 0 ? ` ${selectedIds.size}` : ''}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* Permanent Delete Confirm Modal */}
      {showPermanentConfirm && (
        <DeleteConfirmModal
          imageTitle={`Xoá vĩnh viễn ${selectedIds.size} ảnh đã chọn`}
          description="Hành động này KHÔNG THỂ HOÀN TÁC. Tất cả ảnh đã chọn sẽ bị xoá vĩnh viễn khỏi hệ thống."
          isDeleting={isBulkPermanentDeleting}
          onConfirm={handlePermanentDelete}
          onCancel={() => setShowPermanentConfirm(false)}
          confirmLabel="Xoá vĩnh viễn"
        />
      )}

      {/* Lightbox for viewing single trash image detail */}
      {lightbox && !isSelectMode && (
        <TrashLightbox
          image={lightbox.image}
          allImages={lightbox.allImages}
          onClose={() => setLightbox(null)}
          onRestore={handleSingleRestore}
          onPermanentDelete={handleSinglePermanentDelete}
          onNavigate={handleLightboxNavigate}
        />
      )}
    </>
  )
}
