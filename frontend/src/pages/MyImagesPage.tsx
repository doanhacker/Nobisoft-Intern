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
} from 'lucide-react'
import {
  getMyImages,
  deleteMyImage,
  formatFileSize,
  type UserImage,
} from '@/services/myImagesService'
import { fetchImageAsFile, setPendingImageFile } from '@/services/searchService'
import { SkeletonGrid } from '@/components/results/SkeletonGrid'
import { MasonryGrid, type SearchResult } from '@/components/results/MasonryGrid'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'

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
    thumbnailUrl: img.imageUrl,
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
}

function DayGroup({ group, onImageClick, onSearchSimilar, onDelete }: DayGroupProps) {
  const searchResults = React.useMemo(
    () => group.images.map(mapUserImageToSearchResult),
    [group.images],
  )

  const handleCardClick = (result: SearchResult) => {
    const found = group.images.find((img) => img.id === result.id)
    if (found) {
      onImageClick(found, group.images)
    }
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
        <span className="text-xs text-muted-foreground font-medium">
          {group.images.length} ảnh
        </span>
        <div className="flex-1 h-px bg-border/50 ml-1" />
      </div>

      {/* Masonry Grid */}
      <MasonryGrid
        results={searchResults}
        onCardClick={handleCardClick}
        onSearchSimilar={onSearchSimilar}
        onDelete={handleDeleteCard}
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

  return ReactDOM.createPortal(
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

            {/* Delete button */}
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isDeleting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-destructive/80 text-white/80 hover:text-white text-xs font-semibold transition-all duration-150 border border-white/10 hover:border-destructive"
                title="Xoá ảnh (phím Delete)"
              >
                <Trash2 className="size-3.5" />
                Xoá
              </button>
            ) : (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-destructive/20 border border-destructive/40">
                <AlertTriangle className="size-3.5 text-amber-400 shrink-0" />
                <span className="text-xs text-white font-semibold">Xoá ảnh này?</span>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-2 py-0.5 rounded text-[11px] font-semibold bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  Huỷ
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-2 py-0.5 rounded text-[11px] font-semibold bg-destructive hover:bg-destructive/80 text-white transition-colors flex items-center gap-1 disabled:opacity-50"
                >
                  {isDeleting ? <Loader2 className="size-3 animate-spin" /> : null}
                  {isDeleting ? 'Đang xoá...' : 'Xác nhận'}
                </button>
              </div>
            )}

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

  // ── Load more ──────────────────────────────────────────────
  const handleLoadMore = async () => {
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
  }

  // ── Delete ────────────────────────────────────────────────
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

  // ── Search similar ─────────────────────────────────────────
  const handleSearchSimilar = async (result: SearchResult) => {
    try {
      const urlToFetch = result.fullUrl ?? result.thumbnailUrl
      const file = await fetchImageAsFile(urlToFetch)
      const newQueryId = `upload-${Date.now()}`
      setPendingImageFile(file)
      navigate({
        to: '/results',
        search: { mode: 'image', q: '', query_id: newQueryId, page: 1 },
      })
    } catch (err) {
      console.error(err)
      toast.error('Không thể tải ảnh để tìm kiếm')
    }
  }

  // ── Lightbox handlers ──────────────────────────────────────
  const handleImageClick = (image: UserImage, groupImages: UserImage[]) => {
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
                />
              ))}
            </div>
          )}

          {/* ── Load more ── */}
          {!isInitialLoading && images.length > 0 && (
            <div className="flex flex-col items-center gap-3 pt-4 pb-8">
              {hasMore ? (
                <Button
                  id="my-images-load-more"
                  variant="outline"
                  size="lg"
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  className="min-w-[200px]"
                >
                  {isLoadingMore ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Đang tải thêm...
                    </>
                  ) : (
                    <>
                      <Images className="size-4" />
                      Tải thêm ảnh
                    </>
                  )}
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground font-medium py-2">
                  ✓ Đã hiển thị tất cả {totalDocs.toLocaleString()} ảnh
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Lightbox ── */}
      {lightbox && (
        <Lightbox
          image={lightbox.image}
          allImages={lightbox.allImages}
          onClose={handleLightboxClose}
          onDelete={handleDelete}
          onSearchSimilar={handleSearchSimilar}
          onNavigate={handleLightboxNavigate}
        />
      )}
    </>
  )
}
