import * as React from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import {
  Search,
  ImageIcon,
  AlertCircle,
  RefreshCw,
  FileText,
  Eye,
  CheckCircle2,
} from 'lucide-react'
import { MasonryGrid, type SearchResult } from '@/components/results/MasonryGrid'
import { SkeletonGrid } from '@/components/results/SkeletonGrid'
import { ImageDetailModal } from '@/components/results/ImageDetailModal'
import { ResultsSidebar } from '@/components/results/ResultsSidebar'
import { ResultsSearchBar, type ResultsSearchState, type SearchMode } from '@/components/results/ResultsSearchBar'
import { ImageSearchModal } from '@/components/results/ImageSearchModal'
import { searchByImageFile, searchByImagePage, getPendingImageFile, setPendingImageFile, fetchImageAsFile, recordSearchClick, searchByTextNew, searchByTextPage } from '@/services/searchService'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'
import { AuthContext } from '@/context/AuthContext'

// ============================================================
// ResultsPage — Pinterest-style layout with Infinite Scroll
// - Vertical sidebar left (68px)
// - Sticky search bar at top
// - Split view for image mode (query image left, results right)
// - Full width for text modes (semantic/ocr)
// - Infinite scroll: IntersectionObserver on sentinel div
// ============================================================

interface ResultsSearch {
  mode: SearchMode
  q: string
  query_id?: string
  imageId?: string
}

// ── Mode display helpers ──────────────────────────────────────
const MODE_LABELS: Record<SearchMode, { label: string; icon: React.ElementType }> = {
  image: { label: 'Tìm bằng hình ảnh', icon: ImageIcon },
  semantic: { label: 'Tìm bằng mô tả', icon: Search },
  ocr: { label: 'Tìm bằng chữ trong ảnh', icon: FileText },
}

// ── Empty state ───────────────────────────────────────────────
function EmptyState({ mode, query }: { mode: SearchMode; query: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-4 text-center space-y-5">
      <div className="w-20 h-20 rounded-2xl bg-muted/60 border border-border/60 flex items-center justify-center">
        <Search className="size-8 text-muted-foreground/50" />
      </div>
      <div className="space-y-2 max-w-md">
        <h2 className="text-xl font-bold text-foreground">Không tìm thấy kết quả</h2>
        {mode === 'semantic' && (
          <p className="text-sm text-muted-foreground leading-relaxed">
            Không có ảnh phù hợp với mô tả{' '}
            <span className="text-foreground font-semibold">"{query}"</span>. Thử dùng từ khoá đơn giản hơn.
          </p>
        )}
        {mode === 'ocr' && (
          <p className="text-sm text-muted-foreground leading-relaxed">
            Không tìm thấy ảnh chứa chữ{' '}
            <span className="text-foreground font-semibold">"{query}"</span>.
          </p>
        )}
        {mode === 'image' && (
          <p className="text-sm text-muted-foreground leading-relaxed">
            Không tìm thấy ảnh tương tự. Thử ảnh khác hoặc giảm ngưỡng similarity.
          </p>
        )}
      </div>
    </div>
  )
}

// ── Error state ───────────────────────────────────────────────
function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-4 text-center space-y-5">
      <div className="w-20 h-20 rounded-2xl bg-destructive/10 border border-destructive/30 flex items-center justify-center">
        <AlertCircle className="size-8 text-destructive" />
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-foreground">Đã xảy ra lỗi</h2>
        <p className="text-sm text-muted-foreground max-w-sm">Hệ thống đang gặp sự cố. Vui lòng thử lại.</p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border/60 text-sm font-semibold text-foreground hover:bg-muted/60 transition-all duration-200"
      >
        <RefreshCw className="size-4" />
        Thử lại
      </button>
    </div>
  )
}

// ── Results info bar ──────────────────────────────────────────
function ResultsInfoBar({
  mode,
  query,
  queryId,
  count,
  total,
  isLoading,
}: {
  mode: SearchMode
  query: string
  queryId?: string
  count: number
  total: number
  isLoading: boolean
}) {
  const ModeIcon = MODE_LABELS[mode].icon
  return (
    <div className="flex items-center gap-3 mb-4 flex-wrap">
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
        <ModeIcon className="size-3.5" />
        {MODE_LABELS[mode].label}
      </div>
      {(query || queryId) && !isLoading && (
        <p className="text-sm text-muted-foreground">
          {query && (
            <>
              Kết quả cho{' '}
              <span className="text-foreground font-semibold">"{query}"</span>
            </>
          )}
          {queryId && !query && <>Kết quả tìm ảnh tương tự</>}
          {!isLoading && count > 0 && (
            <span className="text-muted-foreground/70">
              {' '}— {count}{total > count ? `/${total}` : ''} ảnh
            </span>
          )}
        </p>
      )}
    </div>
  )
}

// ── Load More Indicator ──────────────────────────────────────
function LoadMoreIndicator({
  isLoading,
  hasMore,
  total,
  count,
  compact,
}: {
  isLoading: boolean
  hasMore: boolean
  total: number
  count: number
  compact?: boolean
}) {
  if (isLoading) {
    return <SkeletonGrid count={8} compact={compact} className="mt-3" />
  }
  if (!hasMore && count > 0) {
    return (
      <div className="flex justify-center items-center gap-2 py-8 animate-fade-in">
        <CheckCircle2 className="size-4 text-muted-foreground/50" />
        <span className="text-sm text-muted-foreground/70">
          Đã hiển thị tất cả {total} ảnh
        </span>
      </div>
    )
  }
  return null
}

// ── Query Image Panel (split-view left panel) ─────────────────
function QueryImagePanel({
  previewUrl,
  onChangeImage,
}: {
  previewUrl: string
  onChangeImage: () => void
}) {
  return (
    <div className="shrink-0 w-64 xl:w-72 sticky top-0 self-start">
      <div className="rounded-2xl border border-border/50 bg-background/60 backdrop-blur-sm overflow-hidden shadow-sm">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border/40">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ảnh tìm kiếm</p>
        </div>
        {/* Image */}
        <div className="p-3">
          <img
            src={previewUrl}
            alt="Ảnh dùng để tìm kiếm"
            className="w-full rounded-xl object-cover border border-border/40"
          />
        </div>
        {/* Action */}
        <div className="px-3 pb-3">
          <button
            type="button"
            onClick={onChangeImage}
            className={cn(
              'w-full flex items-center justify-center gap-1.5 py-2 rounded-xl',
              'border border-border/60 bg-background hover:bg-muted',
              'text-xs font-medium text-muted-foreground hover:text-foreground transition-all duration-150',
            )}
          >
            <RefreshCw className="size-3.5" />
            Đổi ảnh tìm kiếm
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Results Page ─────────────────────────────────────────
export function ResultsPage() {
  const search = useSearch({ from: '/results' }) as ResultsSearch
  const navigate = useNavigate()
  const { error: toastError } = useToast()
  const auth = React.useContext(AuthContext)

  // ── State ──

  // Accumulated results (append-only while scrolling)
  const [results, setResults] = React.useState<SearchResult[]>([])
  // Total result count returned by backend
  const [total, setTotal] = React.useState<number>(0)
  // Initial load status
  const [status, setStatus] = React.useState<'idle' | 'loading' | 'success' | 'error' | 'empty'>('loading')
  // Selected result for detail modal
  const [selectedResult, setSelectedResult] = React.useState<SearchResult | null>(null)

  // ── Infinite scroll state ──
  // Internal page counter (not in URL)
  const [currentPage, setCurrentPage] = React.useState<number>(1)
  // Are there more pages to load?
  const [hasMore, setHasMore] = React.useState<boolean>(false)
  // Is a "load more" request in-flight?
  const [isLoadingMore, setIsLoadingMore] = React.useState<boolean>(false)

  // Image mode state — persisted across searches
  const [queryImageFile, setQueryImageFile] = React.useState<File | null>(null)
  const [queryImagePreviewUrl, setQueryImagePreviewUrl] = React.useState<string | null>(null)
  const [showImageModalFromPanel, setShowImageModalFromPanel] = React.useState(false)

  // searchHistoryId returned by the backend on the first search of a session.
  // Passed to subsequent fetchMore calls so the backend does NOT create a duplicate history.
  const [searchHistoryId, setSearchHistoryId] = React.useState<string | null>(null)

  // Sentinel div ref for IntersectionObserver
  const sentinelRef = React.useRef<HTMLDivElement>(null)
  const savedScrollY = React.useRef<number>(0)
  const abortRef = React.useRef<AbortController | null>(null)
  // Track the abort controller for load-more requests separately
  const loadMoreAbortRef = React.useRef<AbortController | null>(null)

  // On mount: restore query image preview from sessionStorage when coming from /search page.
  React.useEffect(() => {
    if (mode === 'image') {
      const pending = sessionStorage.getItem('pendingImagePreviewUrl')
      if (pending) {
        setQueryImagePreviewUrl(pending)
        sessionStorage.removeItem('pendingImagePreviewUrl')
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // intentionally run only on mount

  const { mode, q, query_id, imageId } = search
  // Show similarity badge only to ADMIN users, and only for image/semantic modes (not OCR)
  const showSimilarityBadge = Boolean(auth?.isAdmin) && (mode === 'image' || mode === 'semantic')

  // ── fetchInitial: page 1 — always a NEW search session ───────
  // Called when mode/query changes. Resets all state and creates a new SearchHistory.
  const fetchInitial = React.useCallback(
    async (fetchMode: SearchMode, fetchQuery: string, fetchQueryId?: string, overrideFile?: File | null) => {
      if (abortRef.current) abortRef.current.abort()
      if (loadMoreAbortRef.current) loadMoreAbortRef.current.abort()
      const controller = new AbortController()
      abortRef.current = controller

      if (fetchMode !== 'image' && !fetchQuery.trim()) {
        setStatus('idle')
        return
      }

      setStatus('loading')
      setResults([])
      setCurrentPage(1)
      setHasMore(false)
      setIsLoadingMore(false)

      try {
        let data: SearchResult[]
        let fetchedTotal = 0
        let fetchedLimit = 20
        let historyId: string

        if (fetchMode === 'image') {
          // Determine file: override > pending > none
          const pendingFile = getPendingImageFile()
          const file = overrideFile !== undefined ? overrideFile : pendingFile

          if (file) {
            // ── Mode A: New search — send file, get back a fresh searchHistoryId ──
            const response = await searchByImageFile(file, controller.signal)
            setPendingImageFile(null)
            historyId = response.searchHistoryId
            data = response.results
            fetchedTotal = response.total
            fetchedLimit = response.limit
          } else if (searchHistoryId) {
            // ── Fallback: has history (e.g. switching pages then coming back) ──
            // Use page 1 with the existing history — does NOT create a new history record
            const response = await searchByImagePage(searchHistoryId, 1, controller.signal)
            historyId = response.searchHistoryId
            data = response.results
            fetchedTotal = response.total
            fetchedLimit = response.limit
          } else {
            // No file and no history (e.g. user refreshed directly on /results?mode=image)
            setStatus('idle')
            return
          }
        } else {
          // ── Text modes: semantic / ocr ──
          // Always send `q` for new search (never send searchHistoryId here)
          // Backend rule: q XOR searchHistoryId — never send both
          const response = await searchByTextNew(
            fetchMode as 'semantic' | 'ocr',
            fetchQuery,
            20,
            controller.signal,
          )
          historyId = response.searchHistoryId
          data = response.results
          fetchedTotal = response.total
          fetchedLimit = response.limit
        }

        setSearchHistoryId(historyId)

        if (data.length === 0) {
          setStatus('empty')
          setTotal(0)
          setHasMore(false)
        } else {
          setResults(data)
          setTotal(fetchedTotal)
          setCurrentPage(1)
          // Has more if fetched items < total
          setHasMore(data.length < fetchedTotal)
          setStatus('success')
          // Store the page limit for load-more calls
          _limitRef.current = fetchedLimit
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError' || (err as { code?: string }).code === 'ERR_CANCELED') return
        console.error(err)
        setStatus('error')
        toastError('Không thể tải kết quả', {
          description: 'Kiểm tra kết nối mạng và thử lại.',
          onRetry: () => fetchInitial(fetchMode, fetchQuery, fetchQueryId, overrideFile),
        })
      }
    },
    // searchHistoryId intentionally excluded: only used as fallback for image mode on re-mount.
    // Including it would cause re-fetch loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [toastError],
  )

  // Limit ref so fetchMore closure has access without stale closure issue
  const _limitRef = React.useRef<number>(20)

  // ── fetchMore: load next page — uses searchHistoryId (no new history created) ──
  const fetchMore = React.useCallback(async () => {
    if (!searchHistoryId || isLoadingMore || !hasMore) return

    if (loadMoreAbortRef.current) loadMoreAbortRef.current.abort()
    const controller = new AbortController()
    loadMoreAbortRef.current = controller

    const nextPage = currentPage + 1
    setIsLoadingMore(true)

    try {
      let data: SearchResult[]
      let fetchedTotal = 0

      if (mode === 'image') {
        // Mode B: Page navigation — send searchHistoryId only, no new history created
        const response = await searchByImagePage(searchHistoryId, nextPage, controller.signal)
        data = response.results
        fetchedTotal = response.total
      } else {
        // Text modes: send searchHistoryId only (never send q here — backend XOR rule)
        const response = await searchByTextPage(
          mode as 'semantic' | 'ocr',
          searchHistoryId,
          nextPage,
          _limitRef.current,
          controller.signal,
        )
        data = response.results
        fetchedTotal = response.total
      }

      setResults((prev) => [...prev, ...data])
      setTotal(fetchedTotal)
      setCurrentPage(nextPage)
      // Check if we have loaded everything
      const allLoaded = results.length + data.length >= fetchedTotal
      setHasMore(!allLoaded && data.length > 0)
    } catch (err) {
      if ((err as Error).name === 'AbortError' || (err as { code?: string }).code === 'ERR_CANCELED') return
      // Handle "page out of range" gracefully — just mark hasMore as false
      if ((err as { response?: { status?: number } }).response?.status === 400) {
        setHasMore(false)
        return
      }
      console.error(err)
      toastError('Không thể tải thêm kết quả', {
        description: 'Kiểm tra kết nối mạng và thử lại.',
      })
    } finally {
      setIsLoadingMore(false)
    }
  }, [searchHistoryId, isLoadingMore, hasMore, currentPage, mode, results.length, toastError])

  // ── Effect: fire fetchInitial when URL search params change ──
  React.useEffect(() => {
    fetchInitial(mode, q, query_id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, q, query_id])

  // ── Effect: IntersectionObserver for infinite scroll sentinel ──
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

  // ── Effect: Sync modal from URL ───────────────────────────────
  React.useEffect(() => {
    if (imageId) {
      const found = results.find((r) => r.id === imageId)
      if (found) setSelectedResult(found)
    } else {
      setSelectedResult(null)
    }
  }, [imageId, results])

  // ── Handlers ─────────────────────────────────────────────────

  const handleSearch = async (state: ResultsSearchState) => {
    const params: Record<string, string> = { mode: state.mode, q: state.textQuery ?? '' }
    if (state.imageFile) {
      params.query_id = `upload-${Date.now()}`
      delete params.q
      // Persist query image for split view and for the next fetchInitial call
      setQueryImageFile(state.imageFile)
      setQueryImagePreviewUrl(state.imagePreviewUrl)
      // Store in module singleton so fetchInitial can access it via URL-triggered effect
      setPendingImageFile(state.imageFile)
      // Reset history so fetchInitial uses Mode A (new search with file)
      setSearchHistoryId(null)
    } else {
      // Clear image state when switching to text mode.
      // Reset searchHistoryId so the new query triggers a fresh search.
      setQueryImageFile(null)
      setQueryImagePreviewUrl(null)
      setPendingImageFile(null)
      setSearchHistoryId(null)
    }
    navigate({ to: '/results', search: params as unknown as ResultsSearch })
  }

  const handleCardClick = (result: SearchResult) => {
    savedScrollY.current = window.scrollY
    // Record the user's click for search history tracking (all modes)
    if (searchHistoryId) {
      recordSearchClick(searchHistoryId, result.id)
    }
    setSelectedResult(result)
    navigate({
      to: '/results',
      search: { ...search, imageId: result.id },
      replace: true,
      resetScroll: false,
    })
  }

  const handleModalClose = () => {
    const targetY = savedScrollY.current
    setSelectedResult(null)
    navigate({
      to: '/results',
      search: { mode: search.mode, q: search.q, query_id: search.query_id },
      replace: true,
      resetScroll: false,
    })
    requestAnimationFrame(() => {
      window.scrollTo({ top: targetY, behavior: 'instant' })
    })
  }

  const handleSearchSimilar = async (result: SearchResult) => {
    try {
      setStatus('loading')
      const urlToFetch = result.fullUrl ?? result.thumbnailUrl
      const file = await fetchImageAsFile(urlToFetch)

      const newQueryId = `upload-${Date.now()}`
      setQueryImageFile(file)
      setQueryImagePreviewUrl(urlToFetch)
      setPendingImageFile(file)
      // New image = new search session — reset history so fetchInitial uses Mode A
      setSearchHistoryId(null)

      navigate({
        to: '/results',
        search: { mode: 'image', q: '', query_id: newQueryId },
      })
    } catch (err) {
      console.error(err)
      toastError('Không thể tải ảnh để tìm kiếm')
      setStatus('error')
    }
  }

  const handleRetry = () => fetchInitial(mode, q, query_id)

  // Is split view active: image mode + we have a query image
  const isSplitView = mode === 'image' && !!queryImagePreviewUrl

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen bg-background">
      {/* ── Sidebar (fixed, 68px) ── */}
      <ResultsSidebar />

      {/* ── Main area (offset by sidebar) ── */}
      <div className="flex-1 flex flex-col min-w-0" style={{ marginLeft: '68px' }}>

        {/* ── Sticky Search Bar ── */}
        <div className="sticky top-0 z-30 shadow-sm">
          <ResultsSearchBar
            onSearch={handleSearch}
            isLoading={status === 'loading'}
            initialMode={mode}
            initialTextQuery={q}
            initialImagePreviewUrl={queryImagePreviewUrl}
          />
        </div>

        {/* ── Content: split or full ── */}
        <div
          className={cn(
            'flex flex-1 gap-5 px-5 py-5',
            isSplitView ? 'items-start' : '',
          )}
        >
          {/* ── Query Image panel (only in split view) ── */}
          {isSplitView && (
            <QueryImagePanel
              previewUrl={queryImagePreviewUrl!}
              onChangeImage={() => setShowImageModalFromPanel(true)}
            />
          )}

          {/* ── Results area ── */}
          <div className="flex-1 min-w-0">
            {/* Info bar */}
            {status !== 'idle' && (
              <ResultsInfoBar
                mode={mode}
                query={q}
                queryId={query_id}
                count={results.length}
                total={total}
                isLoading={status === 'loading'}
              />
            )}

            {/* Initial loading skeleton */}
            {status === 'loading' && <SkeletonGrid count={20} compact={isSplitView} />}

            {/* Results grid */}
            {status === 'success' && results.length > 0 && (
              <>
                <MasonryGrid
                  results={results}
                  onCardClick={handleCardClick}
                  onSearchSimilar={handleSearchSimilar}
                  compact={isSplitView}
                  showSimilarityBadge={showSimilarityBadge}
                  isLoadingMore={isLoadingMore}
                />

                {/* ── Infinite scroll sentinel ── */}
                <div ref={sentinelRef} className="w-full h-4" aria-hidden="true" />

                {/* Load more indicator / end of results */}
                <LoadMoreIndicator
                  isLoading={isLoadingMore}
                  hasMore={hasMore}
                  total={total}
                  count={results.length}
                  compact={isSplitView}
                />
              </>
            )}

            {/* Empty */}
            {status === 'empty' && <EmptyState mode={mode} query={q} />}

            {/* Error */}
            {status === 'error' && <ErrorState onRetry={handleRetry} />}

            {/* Idle */}
            {status === 'idle' && (
              <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
                <Eye className="size-12 text-muted-foreground/30" />
                <p className="text-muted-foreground text-sm">Nhập từ khoá hoặc tải ảnh để bắt đầu tìm kiếm.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Image Detail Modal ── */}
      <ImageDetailModal
        result={selectedResult}
        onClose={handleModalClose}
        onSearchSimilar={handleSearchSimilar}
      />

      {/* ── Change Query Image Modal (from QueryImagePanel "Đổi ảnh" button) ── */}
      {showImageModalFromPanel && (
        <ImageSearchModal
          initialFile={queryImageFile}
          initialPreviewUrl={queryImagePreviewUrl}
          onConfirm={(file, previewUrl) => {
            setShowImageModalFromPanel(false)
            setQueryImageFile(file)
            setQueryImagePreviewUrl(previewUrl)
            // Trigger a new image search with the new file
            handleSearch({ mode: 'image', textQuery: '', imageFile: file, imagePreviewUrl: previewUrl })
          }}
          onClose={() => setShowImageModalFromPanel(false)}
        />
      )}
    </div>
  )
}
