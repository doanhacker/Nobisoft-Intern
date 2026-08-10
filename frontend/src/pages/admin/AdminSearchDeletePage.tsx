import * as React from 'react'
import { Link } from '@tanstack/react-router'
import {
  ArrowLeft,
  Trash2,
  CheckSquare,
  Square,
  AlertTriangle,
  Loader2,
  ImageOff,
  Search,
  Images,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  ResultsSearchBar,
  type ResultsSearchState,
  type SearchMode,
} from '@/components/results/ResultsSearchBar'
import { MasonryGrid, type SearchResult } from '@/components/results/MasonryGrid'
import { SkeletonGrid } from '@/components/results/SkeletonGrid'
import {
  searchByTextNew,
  searchByImageFile,
  searchByImagePage,
  searchByTextPage,
  setPendingImageFile,
} from '@/services/searchService'
import { bulkDeleteImages } from '@/services/myImagesService'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/button'

// ============================================================
// AdminSearchDeletePage — /admin/search-delete
// Tìm kiếm ảnh (4 mode) rồi chọn xoá nhiều ảnh.
// Tái sử dụng ResultsSearchBar + MasonryGrid với isSelectMode=true.
// ============================================================

type LoadStatus = 'idle' | 'loading' | 'success' | 'error' | 'empty'

// ── Confirm dialog ────────────────────────────────────────────

interface ConfirmDialogProps {
  count: number
  isDeleting: boolean
  onConfirm: () => void
  onCancel: () => void
}

function ConfirmDialog({ count, isDeleting, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={!isDeleting ? onCancel : undefined}
      />
      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-border/60 bg-card shadow-2xl p-6 space-y-5 animate-scale-in-spring">
        <div className="flex items-center justify-center size-14 rounded-2xl bg-destructive/10 border border-destructive/20 mx-auto">
          <AlertTriangle className="size-7 text-destructive" />
        </div>
        <div className="text-center space-y-1.5">
          <h3 className="font-bold text-lg text-foreground">Xác nhận xoá</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Bạn sắp chuyển{' '}
            <span className="text-foreground font-semibold">{count} ảnh</span> vào thùng rác.
            Ảnh sẽ bị xoá vĩnh viễn sau 30 ngày.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1 py-2.5 rounded-xl border border-border/60 text-sm font-semibold text-foreground hover:bg-muted/60 transition-all duration-150 disabled:opacity-50"
          >
            Huỷ
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white',
              'bg-destructive hover:bg-destructive/90 active:scale-[0.97] disabled:opacity-60 transition-all duration-150',
            )}
          >
            {isDeleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            {isDeleting ? 'Đang xoá...' : `Xoá ${count} ảnh`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Empty / Idle states ───────────────────────────────────────

function EmptyState({ query, mode }: { query: string; mode: SearchMode }) {
  const modeLabel: Record<SearchMode, string> = {
    semantic: 'mô tả',
    ocr: 'chữ',
    image: 'ảnh tương tự',
    prompt: 'prompt',
  }
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
      <div className="size-20 rounded-2xl bg-muted/60 border border-border/60 flex items-center justify-center">
        <ImageOff className="size-9 text-muted-foreground/50" />
      </div>
      <div className="space-y-1.5 max-w-sm">
        <p className="font-bold text-lg text-foreground">Không tìm thấy ảnh nào</p>
        <p className="text-sm text-muted-foreground">
          {mode === 'image'
            ? 'Không có ảnh tương tự với ảnh bạn chọn.'
            : `Không có ảnh phù hợp với ${modeLabel[mode]} "${query}".`}
        </p>
      </div>
    </div>
  )
}

function IdleState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
      <div className="size-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
        <Search className="size-9 text-primary/60" />
      </div>
      <div className="space-y-2 max-w-sm">
        <p className="font-bold text-lg text-foreground">Tìm ảnh muốn xoá</p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Sử dụng thanh tìm kiếm bên trên để tìm ảnh.
          Sau đó click chọn ảnh và nhấn Xoá.
        </p>
        <div className="flex flex-wrap justify-center gap-2 pt-2">
          {['Tìm bằng mô tả', 'Tìm bằng chữ', 'Tìm bằng ảnh', 'Tìm bằng Prompt AI'].map((tip) => (
            <span
              key={tip}
              className="px-2.5 py-1 rounded-full text-xs font-medium bg-muted/60 border border-border/50 text-muted-foreground"
            >
              {tip}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────

export function AdminSearchDeletePage() {
  const toast = useToast()

  // ── Search state ──────────────────────────────────────────────
  const [searchMode, setSearchMode] = React.useState<SearchMode>('semantic')
  const [searchQuery, setSearchQuery] = React.useState('')
  const [searchImagePreviewUrl, setSearchImagePreviewUrl] = React.useState<string | null>(null)

  // ── Results state ─────────────────────────────────────────────
  const [results, setResults] = React.useState<SearchResult[]>([])
  const [status, setStatus] = React.useState<LoadStatus>('idle')
  const [total, setTotal] = React.useState(0)
  const [currentPage, setCurrentPage] = React.useState(1)
  const [hasMore, setHasMore] = React.useState(false)
  const [isLoadingMore, setIsLoadingMore] = React.useState(false)
  const [searchHistoryId, setSearchHistoryId] = React.useState<string | null>(null)

  // ── Selection state ───────────────────────────────────────────
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())

  // ── Delete state ──────────────────────────────────────────────
  const [showConfirm, setShowConfirm] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)

  // ── Refs ──────────────────────────────────────────────────────
  const abortRef = React.useRef<AbortController | null>(null)
  const sentinelRef = React.useRef<HTMLDivElement>(null)

  // ── Perform initial search ────────────────────────────────────
  const performSearch = React.useCallback(async (state: ResultsSearchState) => {
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    setResults([])
    setSelectedIds(new Set())
    setCurrentPage(1)
    setHasMore(false)
    setSearchHistoryId(null)
    setSearchMode(state.mode)
    setSearchQuery(state.textQuery)
    setSearchImagePreviewUrl(state.imagePreviewUrl)
    setStatus('loading')

    if (state.mode === 'image' && state.imageFile) {
      setPendingImageFile(state.imageFile)
    } else {
      setPendingImageFile(null)
    }

    try {
      let res
      if (state.mode === 'image' && state.imageFile) {
        res = await searchByImageFile(state.imageFile, ctrl.signal)
      } else if (state.mode === 'image') {
        setStatus('idle')
        return
      } else {
        res = await searchByTextNew(state.mode, state.textQuery, 20, ctrl.signal)
      }

      setSearchHistoryId(res.searchHistoryId)
      setTotal(res.total)
      setCurrentPage(res.page)
      setHasMore(res.page < Math.ceil(res.total / res.limit))
      setResults(res.results)
      setStatus(res.results.length === 0 ? 'empty' : 'success')
    } catch (err: any) {
      if (err?.name === 'AbortError' || err?.code === 'ERR_CANCELED') return
      console.error('[SearchDeletePage] Search error:', err)
      setStatus('error')
      toast.error('Tìm kiếm thất bại. Vui lòng thử lại.')
    }
  }, [toast])

  // ── Load more ─────────────────────────────────────────────────
  const loadMore = React.useCallback(async () => {
    if (!hasMore || isLoadingMore || !searchHistoryId) return

    setIsLoadingMore(true)
    const nextPage = currentPage + 1

    try {
      let res
      if (searchMode === 'image') {
        res = await searchByImagePage(searchHistoryId, nextPage)
      } else {
        res = await searchByTextPage(searchMode, searchHistoryId, nextPage)
      }

      setResults((prev) => [...prev, ...res.results])
      setCurrentPage(res.page)
      setHasMore(res.page < Math.ceil(res.total / res.limit))
    } catch (err: any) {
      if (err?.name === 'AbortError' || err?.code === 'ERR_CANCELED') return
      toast.error('Không thể tải thêm. Vui lòng thử lại.')
    } finally {
      setIsLoadingMore(false)
    }
  }, [hasMore, isLoadingMore, searchHistoryId, currentPage, searchMode, toast])

  // ── IntersectionObserver ──────────────────────────────────────
  React.useEffect(() => {
    if (!sentinelRef.current) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !isLoadingMore) loadMore()
      },
      { threshold: 0.1, rootMargin: '300px 0px' },
    )
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [hasMore, isLoadingMore, loadMore])

  // ── Selection helpers ─────────────────────────────────────────
  const handleToggleSelect = React.useCallback((result: SearchResult) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(result.id)) next.delete(result.id)
      else next.add(result.id)
      return next
    })
  }, [])

  const isAllSelected = results.length > 0 && selectedIds.size === results.length

  const handleSelectAll = () => setSelectedIds(new Set(results.map((r) => r.id)))
  const handleDeselectAll = () => setSelectedIds(new Set())

  // ── Delete handler ────────────────────────────────────────────
  const handleDelete = async () => {
    if (selectedIds.size === 0) return
    setIsDeleting(true)
    const ids = Array.from(selectedIds)

    try {
      const result = await bulkDeleteImages(ids)

      if (result.failedIds.length === 0) {
        toast.success(`Đã chuyển ${result.deleted} ảnh vào thùng rác.`)
      } else if (result.deleted > 0) {
        toast.warning(`Đã xoá ${result.deleted}/${ids.length} ảnh. ${result.failedIds.length} ảnh thất bại.`)
      } else {
        toast.error('Xoá ảnh thất bại. Vui lòng thử lại.')
      }

      const deletedSet = new Set(result.deletedIds)
      setResults((prev) => prev.filter((r) => !deletedSet.has(r.id)))
      setTotal((prev) => Math.max(0, prev - result.deleted))
      setSelectedIds(new Set())
    } catch (err: any) {
      console.error('[SearchDeletePage] Delete error:', err)
      toast.error(err?.response?.data?.message || 'Xoá ảnh thất bại. Vui lòng thử lại.')
    } finally {
      setIsDeleting(false)
      setShowConfirm(false)
    }
  }

  const selectedCount = selectedIds.size

  // ── Render ────────────────────────────────────────────────────
  return (
    <>
      <div className="min-h-[calc(100vh-4rem)] bg-background">
        {/* Hero gradient */}
        <div
          className="absolute top-0 left-0 right-0 h-64 pointer-events-none -z-0 opacity-30"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 50% -10%, oklch(0.53 0.24 20 / 0.35), transparent)',
          }}
        />

        <div className="relative z-[1] max-w-[1600px] mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">

          {/* ── Page Header ── */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">

              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center size-9 rounded-xl bg-destructive/10 border border-destructive/20 shrink-0">
                  <Trash2 className="size-4.5 text-destructive" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                    Tìm &amp; Xoá ảnh
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    Tìm kiếm bằng 4 chế độ, chọn ảnh và xoá hàng loạt
                  </p>
                </div>
              </div>
            </div>

            {/* Right: gallery link shortcut */}
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="shrink-0 text-muted-foreground hover:text-foreground self-start sm:self-auto"
            >
              <Link to="/admin/images">
                <Images className="size-4" />
                Xem kho ảnh
              </Link>
            </Button>
          </div>

          {/* ── Search Bar ── */}
          <div className="relative z-20 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm shadow-sm">
            <ResultsSearchBar
              onSearch={performSearch}
              isLoading={status === 'loading'}
              initialMode={searchMode}
              initialTextQuery={searchQuery}
              initialImagePreviewUrl={searchImagePreviewUrl}
            />
          </div>

          {/* ── Results area ── */}
          <div className="space-y-4">
            {/* ── Status: idle ── */}
            {status === 'idle' && <IdleState />}

            {/* ── Status: loading ── */}
            {status === 'loading' && <SkeletonGrid count={12} />}

            {/* ── Status: error ── */}
            {status === 'error' && (
              <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
                <div className="size-20 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center">
                  <AlertTriangle className="size-9 text-destructive" />
                </div>
                <div className="space-y-1.5">
                  <p className="font-bold text-lg text-foreground">Tìm kiếm thất bại</p>
                  <p className="text-sm text-muted-foreground">Vui lòng kiểm tra kết nối và thử lại.</p>
                </div>
              </div>
            )}

            {/* ── Status: empty ── */}
            {status === 'empty' && <EmptyState query={searchQuery} mode={searchMode} />}

            {/* ── Status: success ── */}
            {status === 'success' && results.length > 0 && (
              <div className="space-y-4">
                {/* Info bar + select-all */}
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    {selectedCount > 0 ? (
                      <p className="text-sm font-semibold text-primary">
                        Đã chọn {selectedCount}/{results.length} ảnh
                        {total > results.length && (
                          <span className="text-muted-foreground font-normal">
                            {' '}(tổng {total} ảnh)
                          </span>
                        )}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Hiển thị{' '}
                        <span className="text-foreground font-semibold">{results.length}</span>
                        {total > results.length && (
                          <> / <span className="text-foreground font-semibold">{total}</span></>
                        )}{' '}
                        ảnh — Click vào ảnh để chọn
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Select all / deselect all */}
                    <button
                      type="button"
                      onClick={isAllSelected ? handleDeselectAll : handleSelectAll}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all duration-150"
                    >
                      {isAllSelected ? (
                        <>
                          <CheckSquare className="size-3.5 text-primary" />
                          Bỏ chọn tất cả
                        </>
                      ) : (
                        <>
                          <Square className="size-3.5" />
                          Chọn tất cả ({results.length})
                        </>
                      )}
                    </button>

                    {/* Delete button (visible when items selected) */}
                    {selectedCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowConfirm(true)}
                        disabled={isDeleting}
                        className={cn(
                          'flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold text-white',
                          'bg-destructive hover:bg-destructive/90 active:scale-[0.97]',
                          'transition-all duration-150 disabled:opacity-50',
                          'shadow-[0_0_16px_oklch(0.53_0.24_20/0.30)]',
                        )}
                      >
                        <Trash2 className="size-3.5" />
                        Xoá {selectedCount} ảnh
                      </button>
                    )}
                  </div>
                </div>

                {/* Masonry grid in select mode */}
                <MasonryGrid
                  results={results}
                  onCardClick={handleToggleSelect}
                  isSelectMode={true}
                  selectedIds={selectedIds}
                  onToggleSelect={handleToggleSelect}
                  isLoadingMore={isLoadingMore}
                  skeletonCount={6}
                  breakpointCols={{
                    default: 6,
                    1536: 6,
                    1280: 5,
                    1024: 4,
                    768: 3,
                    640: 2,
                    480: 2,
                  }}
                />

                {/* Infinite scroll sentinel */}
                <div ref={sentinelRef} className="h-2" aria-hidden="true" />

                {/* End of results */}
                {!hasMore && !isLoadingMore && (
                  <p className="text-center text-xs text-muted-foreground/60 py-6">
                    Đã hiển thị tất cả {results.length} ảnh
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Floating action bar (shows when ≥ 1 selected) ── */}
      {selectedCount > 0 && !showConfirm && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-scale-in-spring">
          <div className={cn(
            'flex items-center gap-4 px-5 py-3 rounded-2xl shadow-2xl',
            'bg-card border border-border/60 backdrop-blur-xl',
            'shadow-[0_8px_32px_rgba(0,0,0,0.25)]',
          )}>
            <div>
              <p className="text-sm font-bold text-foreground">
                Đã chọn <span className="text-destructive">{selectedCount}</span> ảnh
              </p>
              <p className="text-xs text-muted-foreground">Sẽ được chuyển vào Thùng rác</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDeselectAll}
                className="px-3 py-1.5 rounded-xl border border-border/60 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
              >
                Bỏ chọn
              </button>
              <button
                type="button"
                onClick={() => setShowConfirm(true)}
                disabled={isDeleting}
                className={cn(
                  'flex items-center gap-2 px-4 py-1.5 rounded-xl text-sm font-semibold text-white',
                  'bg-destructive hover:bg-destructive/90 active:scale-[0.97]',
                  'transition-all disabled:opacity-50',
                  'shadow-[0_0_20px_oklch(0.53_0.24_20/0.40)]',
                )}
              >
                <Trash2 className="size-4" />
                Xoá {selectedCount} ảnh
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm dialog ── */}
      {showConfirm && (
        <ConfirmDialog
          count={selectedCount}
          isDeleting={isDeleting}
          onConfirm={handleDelete}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </>
  )
}
