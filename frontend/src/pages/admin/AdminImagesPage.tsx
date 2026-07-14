import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import {
  Images,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Filter,
  X,
  FileImage,
  Loader2,
} from 'lucide-react'
import { getImages, getImageDetail, deleteImage } from '@/services/adminImageService'
import type { AdminImageItem } from '@/types/admin'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'

// ============================================================
// AdminImagesPage
// ============================================================

const PAGE_SIZE = 20

// ── Image card ────────────────────────────────────────────────

interface ImageCardProps {
  image: AdminImageItem
  onView: (image: AdminImageItem) => void
  onDelete: (image: AdminImageItem) => void
  isDeleting: boolean
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(dateStr))
}

function ImageCard({ image, onView, onDelete, isDeleting }: ImageCardProps) {
  const [imgError, setImgError] = React.useState(false)
  const indexedAt = image.imageIndex?.indexedAt
    ? formatDate(image.imageIndex.indexedAt)
    : formatDate(image.createdAt)
  const ocrPreview = image.imageIndex?.ocrLines
    ?.slice(0, 2)
    .map((l) => l.rawText)
    .join(' · ')

  return (
    <div className="group relative bg-card border border-border/60 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200">
      {/* Thumbnail */}
      <div className="relative aspect-square bg-muted/40 overflow-hidden">
        {imgError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-muted-foreground">
            <FileImage className="size-8" />
            <span className="text-xs">Không tải được</span>
          </div>
        ) : (
          <img
            src={image.imageUrl}
            alt={image.imageUrl.split('/').pop() ?? 'image'}
            className="size-full object-cover transition-transform duration-200 group-hover:scale-105"
            onError={() => setImgError(true)}
            loading="lazy"
          />
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
          <button
            onClick={() => onView(image)}
            className="flex items-center justify-center size-9 rounded-full bg-white/90 text-gray-800 hover:bg-white transition-colors shadow"
            title="Xem chi tiết"
          >
            <Eye className="size-4" />
          </button>
          <button
            onClick={() => onDelete(image)}
            disabled={isDeleting}
            className="flex items-center justify-center size-9 rounded-full bg-destructive/90 text-white hover:bg-destructive transition-colors shadow disabled:opacity-50"
            title="Xoá ảnh"
          >
            {isDeleting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
          </button>
        </div>

        {/* Format badge */}
        <div className="absolute top-2 right-2">
          <Badge variant="secondary" className="text-[10px] uppercase font-bold px-1.5 py-0.5">
            {image.fileFormat}
          </Badge>
        </div>
      </div>

      {/* Info */}
      <div className="p-2.5 space-y-0.5">
        <p className="text-xs font-semibold text-foreground truncate" title={image.imageUrl}>
          {image.imageUrl.split('/').pop() ?? image.id}
        </p>
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>
            {image.width}×{image.height}
          </span>
          <span>{formatBytes(image.fileSize)}</span>
        </div>
        <p className="text-[10px] text-muted-foreground">{indexedAt}</p>
        {ocrPreview && (
          <p className="text-[10px] text-muted-foreground truncate italic" title={ocrPreview}>
            "{ocrPreview}"
          </p>
        )}
      </div>
    </div>
  )
}

// ── Filter bar ────────────────────────────────────────────────

interface FilterBarProps {
  fileFormat: string
  fromDate: string
  toDate: string
  onFileFormatChange: (v: string) => void
  onFromDateChange: (v: string) => void
  onToDateChange: (v: string) => void
  onClear: () => void
}

function FilterBar({
  fileFormat,
  fromDate,
  toDate,
  onFileFormatChange,
  onFromDateChange,
  onToDateChange,
  onClear,
}: FilterBarProps) {
  const hasFilter = fileFormat || fromDate || toDate
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Filter className="size-4 text-muted-foreground shrink-0" />

      {/* Format */}
      <select
        id="img-format-filter"
        value={fileFormat}
        onChange={(e) => onFileFormatChange(e.target.value)}
        className="h-8 rounded-lg border border-border/60 bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
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
        onChange={(e) => onFromDateChange(e.target.value)}
        className="h-8 rounded-lg border border-border/60 bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        placeholder="Từ ngày"
      />

      {/* To date */}
      <input
        id="img-to-date"
        type="date"
        value={toDate}
        onChange={(e) => onToDateChange(e.target.value)}
        className="h-8 rounded-lg border border-border/60 bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        placeholder="Đến ngày"
      />

      {/* Clear */}
      {hasFilter && (
        <Button variant="ghost" size="sm" onClick={onClear} className="gap-1 text-muted-foreground">
          <X className="size-3.5" />
          Xoá lọc
        </Button>
      )}
    </div>
  )
}

// ── Image detail modal ─────────────────────────────────────────

interface ImageDetailModalProps {
  imageId: string | null
  onClose: () => void
  onDelete: (id: string) => void
  isDeleting: boolean
}

function ImageDetailModal({ imageId, onClose, onDelete, isDeleting }: ImageDetailModalProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'images', imageId],
    queryFn: () => getImageDetail(imageId!),
    enabled: !!imageId,
  })

  const image = data?.data

  if (!imageId) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative bg-card border border-border/60 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 flex items-center justify-center size-8 rounded-full bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="size-4" />
        </button>

        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="w-full aspect-video rounded-xl" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : image ? (
          <>
            {/* Image preview */}
            <div className="aspect-video bg-muted/50 overflow-hidden rounded-t-2xl">
              <img src={image.imageUrl} alt="preview" className="size-full object-contain" />
            </div>

            {/* Metadata */}
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <MetaItem label="ID" value={image.id} mono />
                <MetaItem label="Định dạng" value={image.fileFormat.toUpperCase()} />
                <MetaItem label="Kích thước" value={`${image.width}×${image.height}px`} />
                <MetaItem label="Dung lượng" value={formatBytes(image.fileSize)} />
                <MetaItem
                  label="Ngày index"
                  value={
                    image.imageIndex?.indexedAt
                      ? formatDate(image.imageIndex.indexedAt)
                      : '—'
                  }
                />
                <MetaItem
                  label="Thời gian xử lý"
                  value={
                    image.imageIndex?.processDurationMs
                      ? `${image.imageIndex.processDurationMs}ms`
                      : '—'
                  }
                />
              </div>

              {/* OCR lines */}
              {image.imageIndex?.ocrLines && image.imageIndex.ocrLines.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">
                    OCR Text
                  </p>
                  <div className="bg-muted/40 rounded-lg p-3 space-y-1 max-h-32 overflow-y-auto">
                    {image.imageIndex.ocrLines.map((line, i) => (
                      <p key={i} className="text-xs text-foreground">
                        {line.rawText}{' '}
                        <span className="text-muted-foreground">
                          ({Math.round(line.confidenceScore * 100)}%)
                        </span>
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end pt-2 border-t border-border/50">
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-1.5"
                  disabled={isDeleting}
                  onClick={() => onDelete(image.id)}
                >
                  {isDeleting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                  Xoá ảnh này
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="p-6 text-center text-muted-foreground">Không tìm thấy ảnh</div>
        )}
      </div>
    </div>
  )
}

function MetaItem({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div>
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={cn('text-sm text-foreground truncate', mono && 'font-mono text-xs')}>{value}</p>
    </div>
  )
}

// ── Delete confirm dialog ──────────────────────────────────────

interface DeleteConfirmProps {
  image: AdminImageItem | null
  onConfirm: () => void
  onCancel: () => void
  isDeleting: boolean
}

function DeleteConfirmDialog({ image, onConfirm, onCancel, isDeleting }: DeleteConfirmProps) {
  if (!image) return null
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="bg-card border border-border/60 rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-xl bg-destructive/10">
            <Trash2 className="size-5 text-destructive" />
          </div>
          <div>
            <p className="font-bold text-foreground">Xác nhận xoá ảnh</p>
            <p className="text-xs text-muted-foreground">Hành động này không thể hoàn tác</p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-3 py-2 font-mono truncate">
          {image.imageUrl.split('/').pop() ?? image.id}
        </p>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={isDeleting}>
            Huỷ
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={onConfirm}
            disabled={isDeleting}
            className="gap-1.5"
          >
            {isDeleting && <Loader2 className="size-3.5 animate-spin" />}
            Xoá ảnh
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────

export function AdminImagesPage() {
  const navigate = useNavigate()
  const { page, fileFormat, fromDate, toDate } = useSearch({ from: '/admin/images' })
  const toast = useToast()
  const queryClient = useQueryClient()

  const [viewingImageId, setViewingImageId] = React.useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = React.useState<AdminImageItem | null>(null)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'images', { page, fileFormat, fromDate, toDate }],
    queryFn: () =>
      getImages({
        page,
        limit: PAGE_SIZE,
        fileFormat: (fileFormat as 'jpg' | 'png' | 'webp') || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      }),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteImage(id),
    onMutate: (id) => setDeletingId(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'images'] })
      toast.success('Đã xoá ảnh thành công')
      setPendingDelete(null)
      setViewingImageId(null)
      setDeletingId(null)
    },
    onError: () => {
      toast.error('Xoá ảnh thất bại, vui lòng thử lại')
      setDeletingId(null)
    },
  })

  const images = data?.data ?? []
  const totalPages = data?.meta?.totalPages ?? 1
  const totalDocs = data?.meta?.totalDocs ?? 0
  const hasFilter = fileFormat || fromDate || toDate

  const clearFilter = () =>
    navigate({ to: '/admin/images', search: { page: 1, fileFormat: '', fromDate: '', toDate: '' } })

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
            <Images className="size-6 text-primary" />
            Kho ảnh
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isLoading ? 'Đang tải...' : `${totalDocs.toLocaleString('vi-VN')} ảnh đã index`}
          </p>
        </div>
      </div>

      {/* Filters */}
      <FilterBar
        fileFormat={fileFormat ?? ''}
        fromDate={fromDate ?? ''}
        toDate={toDate ?? ''}
        onFileFormatChange={(v) =>
          navigate({ to: '/admin/images', search: { page: 1, fileFormat: v, fromDate: fromDate ?? '', toDate: toDate ?? '' } })
        }
        onFromDateChange={(v) =>
          navigate({ to: '/admin/images', search: { page: 1, fileFormat: fileFormat ?? '', fromDate: v, toDate: toDate ?? '' } })
        }
        onToDateChange={(v) =>
          navigate({ to: '/admin/images', search: { page: 1, fileFormat: fileFormat ?? '', fromDate: fromDate ?? '', toDate: v } })
        }
        onClear={clearFilter}
      />

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="rounded-xl overflow-hidden">
              <Skeleton className="aspect-square w-full" />
              <div className="p-2.5 space-y-1.5">
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-2.5 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <AlertCircle className="size-10 text-destructive" />
          <p className="font-semibold">Không thể tải danh sách ảnh</p>
          <Button variant="outline" onClick={() => refetch()}>
            Thử lại
          </Button>
        </div>
      ) : images.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="flex items-center justify-center size-16 rounded-2xl bg-muted/50">
            <Images className="size-8 text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold text-foreground">
              {hasFilter ? 'Không có ảnh phù hợp với bộ lọc' : 'Chưa có ảnh nào được index'}
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {hasFilter ? 'Thử thay đổi bộ lọc' : 'Vào trang Index ảnh để thêm ảnh mới'}
            </p>
          </div>
          {!hasFilter && (
            <Button variant="brand" asChild>
              <a href="/admin/indexing">Index ảnh đầu tiên</a>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {images.map((image) => (
            <ImageCard
              key={image.id}
              image={image}
              onView={(img) => setViewingImageId(img.id)}
              onDelete={(img) => setPendingDelete(img)}
              isDeleting={deletingId === image.id}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
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
                  to: '/admin/images',
                  search: { page: (page ?? 1) - 1, fileFormat: fileFormat ?? '', fromDate: fromDate ?? '', toDate: toDate ?? '' },
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
                  to: '/admin/images',
                  search: { page: (page ?? 1) + 1, fileFormat: fileFormat ?? '', fromDate: fromDate ?? '', toDate: toDate ?? '' },
                })
              }
            >
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <ImageDetailModal
        imageId={viewingImageId}
        onClose={() => setViewingImageId(null)}
        onDelete={(id) => {
          const img = images.find((i) => i.id === id)
          if (img) setPendingDelete(img)
        }}
        isDeleting={deletingId === viewingImageId}
      />

      {/* Delete Confirm */}
      <DeleteConfirmDialog
        image={pendingDelete}
        onConfirm={() => pendingDelete && deleteMutation.mutate(pendingDelete.id)}
        onCancel={() => setPendingDelete(null)}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  )
}
