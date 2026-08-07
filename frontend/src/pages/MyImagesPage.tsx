import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { Link, useNavigate } from '@tanstack/react-router'
import {
  Images,
  UploadCloud,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Loader2,
  ImageOff,
  Info,
  AlertTriangle,
  Search,
  CheckCircle2,
  CheckSquare,
  Square,
} from 'lucide-react'
import {
  getMyImages,
  deleteMyImage,
  bulkDeleteImages,
  formatFileSize,
  type UserImage,
  type GetMyImagesParams,
} from '@/services/myImagesService'
import { DeleteConfirmModal } from '@/components/ui/DeleteConfirmModal'
import { fetchImageAsFile, setPendingImageFile } from '@/services/searchService'
import { SkeletonGrid } from '@/components/results/SkeletonGrid'
import { MasonryGrid, type SearchResult } from '@/components/results/MasonryGrid'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'
import { getThumbnailUrl } from '@/lib/imageUtils'

// ============================================================
// Constants
// ============================================================

const PAGE_SIZE = 20

// ============================================================
// Helper: Map UserImage -> SearchResult
// ============================================================

function mapUserImageToSearchResult(img: UserImage): SearchResult {
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

  if (isSameDay(date, today)) return 'Hôm nay'
  if (isSameDay(date, yesterday)) return 'Hôm qua'

  const diffMs = today.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  const weekdays = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy']
  const weekday = weekdays[date.getDay()]

  if (diffDays < 7) {
    return `${weekday}, ${day} tháng ${month}`
  }

  if (date.getFullYear() === today.getFullYear()) {
    return `${day} tháng ${month}`
  }

  return `${day} tháng ${month}, ${year}`
}

function formatFullDateTime(isoString: string): string {
  const d = new Date(isoString)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} lúc ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// ============================================================
// Group images by day
// ============================================================

interface ImageGroup {
  dateKey: string
  label: string
  images: UserImage[]
}

function groupByDay(images: UserImage[]): ImageGroup[] {
  const map = new Map<string, UserImage[]>()

  for (const img of images) {
    const key = getDateKey(img.uploadedAt)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(img)
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a)) // newest day first
    .map(([dateKey, imgs]) => ({
      dateKey,
      label: formatDayLabel(dateKey),
      images: imgs,
    }))
}

// ============================================================
// Empty state
// ============================================================

function EmptyState() {
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
        <h3 className="text-lg font-bold text-foreground">Chưa có ảnh nào</h3>
        <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
          Bạn chưa upload ảnh nào. Hãy tải ảnh lên để AI phân tích và giúp bạn tìm kiếm dễ dàng hơn.
        </p>
      </div>

      <Button id="my-images-upload-cta" variant="brand" size="lg" asChild>
        <Link to="/upload">
          <UploadCloud className="size-4" />
          Tải ảnh lên ngay
        </Link>
      </Button>
    </div>
  )
}

// ============================================================
// Day group
// ============================================================

interface DayGroupProps {
  group: ImageGroup
  onImageClick: (image: UserImage, groupImages: UserImage[]) => void
  onSearchSimilar: (result: SearchResult) => void
  onDelete: (id: string) => Promise<void>
  isSelectMode: boolean
  selectedIds: Set<string>
  onToggleSelect: (image: UserImage) => void
}

function DayGroup({ group, onImageClick, onSearchSimilar, onDelete, isSelectMode, selectedIds, onToggleSelect }: DayGroupProps) {
  const searchResults = React.useMemo(
    () => group.images.map(mapUserImageToSearchResult),
    [group.images],
  )

  const handleCardClick = (result: SearchResult) => {
    if (isSelectMode) return // handled by onToggleSelect
    const found = group.images.find((img) => img.id === result.id)
    if (found) {
      onImageClick(found, group.images)
    }
  }

  const handleToggleSelect = (result: SearchResult) => {
    const found = group.images.find((img) => img.id === result.id)
    if (found) onToggleSelect(found)
  }

  const handleDeleteCard = async (result: SearchResult) => {
    await onDelete(result.id)
  }

  return (
    <div className="space-y-3">
      {/* Sticky group header */}
      <div className="flex items-center gap-2.5 sticky top-[61px] z-10 py-2 bg-background/90 backdrop-blur-md">
        <div className="flex items-center justify-center size-7 rounded-lg bg-primary/10 shrink-0">
          <CalendarDays className="size-3.5 text-primary" />
        </div>
        <span className="font-bold text-sm text-foreground">{group.label}</span>
        <div className="flex-1 h-px bg-border/50 ml-1" />
      </div>

      {/* Masonry Grid */}
      <MasonryGrid
        results={searchResults}
        onCardClick={handleCardClick}
        onSearchSimilar={onSearchSimilar}
        onDelete={handleDeleteCard}
        isSelectMode={isSelectMode}
        selectedIds={selectedIds}
        onToggleSelect={handleToggleSelect}
      />
    </div>
  )
}

// ============================================================
// Lightbox
// ============================================================

interface LightboxProps {
  image: UserImage
  allImages: UserImage[]
  onClose: () => void
  onDelete: (id: string) => Promise<void>
  onSearchSimilar: (result: SearchResult) => void
  onNavigate: (image: UserImage) => void
}

function Lightbox({ image, allImages, onClose, onDelete, onSearchSimilar, onNavigate }: LightboxProps) {
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
              <p className="text-sm font-semibold text-white truncate">{image.filename}</p>
              <p className="text-xs text-white/60">
                {formatFullDateTime(image.uploadedAt)}{image.size !== null ? ` · ${formatFileSize(image.size)}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Search similar button */}
            <button
              onClick={() => {
                onSearchSimilar(mapUserImageToSearchResult(image))
                onClose()
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/90 text-xs font-semibold transition-all duration-150 border border-white/10"
              title="Tìm ảnh tương tự"
            >
              <Search className="size-3.5" />
              <span className="hidden sm:inline">Tìm tương tự</span>
            </button>

            {/* Delete button — triggers centered modal */}
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
          {/* Prev button */}
          <button
            onClick={handlePrev}
            disabled={!hasPrev}
            className={cn(
              'flex items-center justify-center size-10 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all duration-150 border border-white/10 shrink-0',
              !hasPrev && 'opacity-30 cursor-not-allowed hover:bg-white/10',
            )}
            aria-label="Ảnh trước (←)"
            title="Ảnh trước (←)"
          >
            <ChevronLeft className="size-5" />
          </button>

          {/* Image */}
          <div className="flex-1 flex items-center justify-center min-w-0">
            <img
              src={image.imageUrl}
              alt={image.filename}
              className="max-h-[75vh] max-w-full object-contain rounded-xl shadow-2xl"
              style={{ display: 'block' }}
            />
          </div>

          {/* Next button */}
          <button
            onClick={handleNext}
            disabled={!hasNext}
            className={cn(
              'flex items-center justify-center size-10 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all duration-150 border border-white/10 shrink-0',
              !hasNext && 'opacity-30 cursor-not-allowed hover:bg-white/10',
            )}
            aria-label="Ảnh tiếp (→)"
            title="Ảnh tiếp (→)"
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
      imageTitle={image.filename}
      isDeleting={isDeleting}
      onConfirm={handleDelete}
      onCancel={() => setShowDeleteConfirm(false)}
    />
  )}
  </>
  )
}

// ============================================================
// MyImagesPage
// ============================================================

interface LightboxState {
  image: UserImage
  allImages: UserImage[]
}

export function MyImagesPage() {
  const navigate = useNavigate()
  const toast = useToast()

  // ── Data state ────────────────────────────────────────────
  const [images, setImages] = React.useState<UserImage[]>([])
  const [totalDocs, setTotalDocs] = React.useState(0)
  const [, setTotalPages] = React.useState(1)
  const [hasMore, setHasMore] = React.useState(false)
  const [page, setPage] = React.useState(1)

  // ── Loading state ──────────────────────────────────────────
  const [isInitialLoading, setIsInitialLoading] = React.useState(true)
  const [isLoadingMore, setIsLoadingMore] = React.useState(false)

  // ── Lightbox ───────────────────────────────────────────────
  const [lightbox, setLightbox] = React.useState<LightboxState | null>(null)

  // ── Bulk select ────────────────────────────────────────────
  const [isSelectMode, setIsSelectMode] = React.useState(false)
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())
  const [isBulkDeleting, setIsBulkDeleting] = React.useState(false)
  const [showBulkConfirm, setShowBulkConfirm] = React.useState(false)

  // ── Initial fetch ──────────────────────────────────────────
  React.useEffect(() => {
    let cancelled = false

    async function fetchInitial() {
      setIsInitialLoading(true)
      try {
        const result = await getMyImages({ page: 1, limit: PAGE_SIZE })
        if (!cancelled) {
          setImages(result.images)
          setTotalDocs(result.totalDocs)
          setTotalPages(result.totalPages)
          setHasMore(result.hasMore)
          setPage(1)
        }
      } catch {
        if (!cancelled) toast.error('Không thể tải danh sách ảnh. Vui lòng thử lại.')
      } finally {
        if (!cancelled) setIsInitialLoading(false)
      }
    }

    fetchInitial()
    return () => {
      cancelled = true
    }
  }, [])

  // Refs
  const sentinelRef = React.useRef<HTMLDivElement>(null)

  // ── Load more ──────────────────────────────────────────────
  const handleLoadMore = React.useCallback(async () => {
    if (isLoadingMore || !hasMore) return
    setIsLoadingMore(true)
    try {
      const nextPage = page + 1
      const result = await getMyImages({ page: nextPage, limit: PAGE_SIZE })
      setImages((prev) => [...prev, ...result.images])
      setTotalDocs(result.totalDocs)
      setTotalPages(result.totalPages)
      setHasMore(result.hasMore)
      setPage(nextPage)
    } catch {
      toast.error('Không thể tải thêm ảnh. Vui lòng thử lại.')
    } finally {
      setIsLoadingMore(false)
    }
  }, [isLoadingMore, hasMore, page, toast])

  // ── Effect: IntersectionObserver ──────────────────────────────
  React.useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !isLoadingMore) {
          handleLoadMore()
        }
      },
      { threshold: 0.1, rootMargin: '300px 0px' },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, isLoadingMore, handleLoadMore])

  // ── Delete (single) ────────────────────────────────────────
  const handleDelete = async (id: string) => {
    try {
      await deleteMyImage(id)
      setImages((prev) => prev.filter((img) => img.id !== id))
      setTotalDocs((prev) => Math.max(0, prev - 1))
      // Also update lightbox allImages if open
      if (lightbox) {
        const updated = lightbox.allImages.filter((img) => img.id !== id)
        setLightbox((prev) => (prev ? { ...prev, allImages: updated } : null))
      }
      toast.success('Đã xoá ảnh thành công.')
    } catch {
      toast.error('Không thể xoá ảnh. Vui lòng thử lại.')
      throw new Error('Delete failed') // re-throw so card UI can reset
    }
  }

  // ── Bulk select handlers ────────────────────────────────────
  const toggleSelectMode = React.useCallback(() => {
    setIsSelectMode((prev) => {
      if (prev) {
        // Exiting: clear selection
        setSelectedIds(new Set())
        setShowBulkConfirm(false)
      }
      return !prev
    })
  }, [])

  const toggleSelectImage = React.useCallback((image: UserImage) => {
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
      // Remove successfully-deleted images from local state
      const deletedSet = new Set(
        result.failedIds.length > 0
          ? ids.filter((id) => !result.failedIds.includes(id))
          : ids,
      )
      setImages((prev) => prev.filter((img) => !deletedSet.has(img.id)))
      setTotalDocs((prev) => Math.max(0, prev - deletedSet.size))
      if (result.failedIds.length > 0) {
        toast.error(`Xoá ${result.deleted}/${result.requested} ảnh. ${result.failedIds.length} ảnh thất bại.`)
      } else {
        toast.success(`Đã xoá ${result.deleted} ảnh vào thùng rác.`)
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

  // ── Search similar ─────────────────────────────────────────
  const handleSearchSimilar = async (result: SearchResult) => {
    try {
      const urlToFetch = result.fullUrl ?? result.thumbnailUrl
      const file = await fetchImageAsFile(urlToFetch)
      const newQueryId = `upload-${Date.now()}`
      setPendingImageFile(file)
      navigate({
        to: '/results',
        search: { mode: 'image', q: '', query_id: newQueryId },
      })
    } catch (err) {
      console.error(err)
      toast.error('Không thể tải ảnh để tìm kiếm')
    }
  }

  // ── Lightbox handlers — disabled in select mode ──────────────
  const handleImageClick = (image: UserImage, groupImages: UserImage[]) => {
    if (isSelectMode) return
    setLightbox({ image, allImages: groupImages })
  }

  const handleLightboxNavigate = (image: UserImage) => {
    setLightbox((prev) => (prev ? { ...prev, image } : null))
  }

  const handleLightboxClose = () => {
    setLightbox(null)
  }

  // ── Derived: grouped images ────────────────────────────────
  const groups = React.useMemo(() => groupByDay(images), [images])

  // ── Render ────────────────────────────────────────────────

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

        <div className="relative z-[1] max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
          {/* ── Page Header ── */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center size-10 rounded-2xl gradient-brand shadow-brand">
                  <Images className="size-5 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                    Ảnh của tôi
                  </h1>
                  {!isInitialLoading && totalDocs > 0 && (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground">{totalDocs.toLocaleString()}</span> ảnh đã upload
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Nút chọn để xoá */}
              {!isInitialLoading && images.length > 0 && (
                <button
                  id="my-images-select-mode-btn"
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
                      Chọn để xoá
                    </>
                  )}
                </button>
              )}

              <Button
                id="my-images-trash-btn"
                variant="ghost"
                size="sm"
                asChild
                className="shrink-0 text-muted-foreground hover:text-foreground"
              >
                <Link to="/my-images/trash">
                  <Trash2 className="size-4" />
                  Thùng rác
                </Link>
              </Button>

              <Button
                id="my-images-upload-btn"
                variant="brand"
                size="sm"
                asChild
                className="shrink-0"
              >
                <Link to="/upload">
                  <UploadCloud className="size-4" />
                  Tải thêm ảnh
                </Link>
              </Button>
            </div>
          </div>


          {/* ── Loading state ── */}
          {isInitialLoading && <SkeletonGrid count={12} />}

          {/* ── Empty state ── */}
          {!isInitialLoading && images.length === 0 && <EmptyState />}

          {/* ── Image groups ── */}
          {!isInitialLoading && groups.length > 0 && (
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

          {/* ── Load more indicator / end of results ── */}
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
                    Đã hiển thị tất cả {totalDocs.toLocaleString('vi-VN')} ảnh
                  </span>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* ── Lightbox ── */}
      {lightbox && !isSelectMode && (
        <Lightbox
          image={lightbox.image}
          allImages={lightbox.allImages}
          onClose={handleLightboxClose}
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
              {/* Cancel */}
              <button
                id="bulk-delete-cancel-btn"
                onClick={toggleSelectMode}
                disabled={isBulkDeleting}
                className="px-3 py-1.5 rounded-xl text-sm font-semibold bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60 transition-all duration-150 disabled:opacity-50"
              >
                Huỷ
              </button>

              {/* Delete trigger */}
              <button
                id="bulk-delete-trigger-btn"
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
          description="Các ảnh này sẽ được chuyển vào Thùng rác và có thể khôi phục trong vòng 30 ngày."
          isDeleting={isBulkDeleting}
          onConfirm={handleBulkDelete}
          onCancel={() => setShowBulkConfirm(false)}
          confirmLabel={`Xoá ${selectedIds.size} ảnh`}
        />
      )}

    </>
  )
}
