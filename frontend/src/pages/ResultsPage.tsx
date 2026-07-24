import * as React from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import {
  Search,
  ImageIcon,
  AlertCircle,
  RefreshCw,
  FileText,
  Eye,
  ChevronLeft,
  ChevronRight,
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

// ============================================================
// ResultsPage — Pinterest-style layout
// - Vertical sidebar left (68px)
// - Sticky search bar at top
// - Split view for image mode (query image left, results right)
// - Full width for text modes (semantic/ocr)
// ============================================================

interface ResultsSearch {
  mode: SearchMode
  q: string
  query_id?: string
  page: number
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
  isLoading,
}: {
  mode: SearchMode
  query: string
  queryId?: string
  count: number
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
            <span className="text-muted-foreground/70"> — {count} ảnh</span>
          )}
        </p>
      )}
    </div>
  )
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

  // ── State ──
  const [results, setResults] = React.useState<SearchResult[]>([])
  const [total, setTotal] = React.useState<number>(0)
  const [limit, setLimit] = React.useState<number>(20)
  const [status, setStatus] = React.useState<'idle' | 'loading' | 'success' | 'error' | 'empty'>('loading')
  const [selectedResult, setSelectedResult] = React.useState<SearchResult | null>(null)

  // Image mode state — persisted across searches
  const [queryImageFile, setQueryImageFile] = React.useState<File | null>(null)
  const [queryImagePreviewUrl, setQueryImagePreviewUrl] = React.useState<string | null>(null)
  const [showImageModalFromPanel, setShowImageModalFromPanel] = React.useState(false)

  // searchHistoryId returned by the backend on the first image search of a session.
  // Passed to subsequent page-change calls so the backend does NOT create a duplicate history.
  const [searchHistoryId, setSearchHistoryId] = React.useState<string | null>(null)

  // On mount: restore query image preview from sessionStorage when coming from /search page.
  // The File object cannot be passed via URL, so SearchPage stores the blob URL in sessionStorage
  // before navigating here. We read it once and clear it to avoid stale data.
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

  const savedScrollY = React.useRef<number>(0)
  const abortRef = React.useRef<AbortController | null>(null)

  const { mode, q, query_id, imageId } = search

  // ── Fetch results ─────────────────────────────────────────
  const fetchResults = React.useCallback(
    async (fetchMode: SearchMode, fetchQuery: string, fetchPage: number, fetchQueryId?: string, overrideFile?: File | null) => {
      if (abortRef.current) abortRef.current.abort()
      const controller = new AbortController()
      abortRef.current = controller

      if (fetchMode !== 'image' && !fetchQuery.trim()) {
        setStatus('idle')
        return
      }

      setStatus('loading')
      setResults([])

      try {
        let data: SearchResult[]
        let currentTotal = 0
        let currentLimit = 20

        if (fetchMode === 'image') {
          // Determine whether this is a NEW search (has a file) or a PAGE CHANGE (has searchHistoryId).
          //
          // Priority:
          //   1. overrideFile — explicit re-search triggered by handleSearch / handleSearchSimilar
          //   2. pendingImageFile — file stored by SearchPage before navigating here
          //   3. current searchHistoryId in state — pure page navigation (no new file)
          // getPendingImageFile() peeks without clearing. We clear it explicitly
          // with setPendingImageFile(null) only after Mode A succeeds. This is safe
          // for React 18 Strict Mode: the double-invocation aborts the first request
          // before it resolves, so setPendingImageFile(null) is never called by the
          // first invocation — the file is still available for the second invocation.
          const pendingFile = getPendingImageFile()
          const file = overrideFile !== undefined ? overrideFile : pendingFile

          if (file) {
            // ── Mode A: New search — send file, get back a fresh searchHistoryId ──
            const response = await searchByImageFile(file, controller.signal)
            // Clear pending file only after a successful response so Strict Mode's
            // second invocation (after abort) can still find and use the file.
            setPendingImageFile(null)
            setSearchHistoryId(response.searchHistoryId)
            data = response.results
            currentTotal = response.total
            currentLimit = response.limit
          } else if (searchHistoryId) {
            // ── Mode B: Page navigation — send searchHistoryId, no new history created ──
            const response = await searchByImagePage(searchHistoryId, fetchPage, controller.signal)
            data = response.results
            currentTotal = response.total
            currentLimit = response.limit
          } else {
            // No file and no history (e.g. user refreshed directly on /results?mode=image)
            setStatus('idle')
            return
          }
        } else {
          // Text-based modes (semantic / ocr) — call the real backend API.
          // Strategy:
          //   • If searchHistoryId is already in state AND the page hasn't reset to 1,
          //     this is a pagination request → send searchHistoryId (no q).
          //   • Otherwise this is a new search → send q from page 1.
          //
          // Note: the backend enforces that q and searchHistoryId are mutually exclusive.
          const isTextMode = fetchMode === 'semantic' || fetchMode === 'ocr'
          if (!isTextMode) return // guard: should never happen

          if (searchHistoryId && fetchPage > 1) {
            // ── Pagination: reuse existing session ──
            const response = await searchByTextPage(
              fetchMode as 'semantic' | 'ocr',
              searchHistoryId,
              fetchPage,
              20,
              controller.signal,
            )
            setSearchHistoryId(response.searchHistoryId)
            data = response.results
            currentTotal = response.total
            currentLimit = response.limit
          } else {
            // ── New search: send q, always start at page 1 ──
            const response = await searchByTextNew(
              fetchMode as 'semantic' | 'ocr',
              fetchQuery,
              20,
              controller.signal,
            )
            setSearchHistoryId(response.searchHistoryId)
            data = response.results
            currentTotal = response.total
            currentLimit = response.limit
          }
        }

        if (data.length === 0) {
          setStatus('empty')
          setTotal(0)
        } else {
          setResults(data)
          setTotal(currentTotal)
          setLimit(currentLimit)
          setStatus('success')
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError' || (err as { code?: string }).code === 'ERR_CANCELED') return
        console.error(err)
        setStatus('error')
        toastError('Không thể tải kết quả', {
          description: 'Kiểm tra kết nối mạng và thử lại.',
          onRetry: () => fetchResults(fetchMode, fetchQuery, fetchPage, fetchQueryId, overrideFile),
        })
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // queryImageFile removed: it is display-only; file selection is handled via
    // consumePendingImageFile() and overrideFile, not via state fallback.
    [toastError, searchHistoryId],
  )

  React.useEffect(() => {
    fetchResults(mode, q, search.page, query_id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, q, search.page, query_id])

  // Sync modal from URL
  React.useEffect(() => {
    if (imageId) {
      const found = results.find((r) => r.id === imageId)
      if (found) setSelectedResult(found)
    } else {
      setSelectedResult(null)
    }
  }, [imageId, results])

  // ── Handlers ─────────────────────────────────────────────

  const handleSearch = async (state: ResultsSearchState) => {
    const params: Record<string, string | number> = { mode: state.mode, q: state.textQuery ?? '', page: 1 }
    if (state.imageFile) {
      params.query_id = `upload-${Date.now()}`
      delete params.q
      // Persist query image for split view and for the next fetchResults call
      setQueryImageFile(state.imageFile)
      setQueryImagePreviewUrl(state.imagePreviewUrl)
      // Store in module singleton so fetchResults can access it via URL-triggered effect
      setPendingImageFile(state.imageFile)
      // Reset history so fetchResults uses Mode A (new search with file)
      setSearchHistoryId(null)
    } else {
      // Clear image state when switching to text mode.
      // Always reset searchHistoryId so the new query triggers a fresh search (not pagination).
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
      search: { mode: search.mode, q: search.q, query_id: search.query_id, page: search.page },
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
      // New image = new search session — reset history so fetchResults uses Mode A
      setSearchHistoryId(null)
      
      navigate({
        to: '/results',
        search: { mode: 'image', q: '', query_id: newQueryId, page: 1 },
      })
    } catch (err) {
      console.error(err)
      toastError('Không thể tải ảnh để tìm kiếm')
      setStatus('error')
    }
  }

  const handleRetry = () => fetchResults(mode, q, search.page, query_id)

  // Is split view active: image mode + we have a query image
  const isSplitView = mode === 'image' && !!queryImagePreviewUrl

  // ── Render ────────────────────────────────────────────────
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
                count={total > 0 ? total : results.length}
                isLoading={status === 'loading'}
              />
            )}

            {/* Loading skeleton */}
            {status === 'loading' && <SkeletonGrid count={20} />}

            {/* Results grid */}
            {status === 'success' && results.length > 0 && (
              <>
                <MasonryGrid
                  results={results}
                  onCardClick={handleCardClick}
                  onSearchSimilar={handleSearchSimilar}
                  compact={isSplitView}
                />
                
                {/* Pagination */}
                {total > limit && (
                  <div className="mt-8 mb-4 flex justify-center items-center gap-2 animate-fade-in">
                    <button
                      type="button"
                      disabled={search.page <= 1}
                      onClick={() => {
                        navigate({ to: '/results', search: { ...search, page: search.page - 1 } })
                        window.scrollTo({ top: 0, behavior: 'smooth' })
                      }}
                      className="p-2 border border-border/60 bg-background/60 backdrop-blur-sm rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted/80 hover:text-foreground transition-colors"
                      title="Trang trước"
                    >
                      <ChevronLeft className="size-4" />
                    </button>
                    
                    {(() => {
                      const totalPages = Math.ceil(total / limit);
                      const pages: (number | string)[] = [];
                      if (totalPages <= 7) {
                        for (let i = 1; i <= totalPages; i++) pages.push(i);
                      } else {
                        pages.push(1);
                        if (search.page > 3) pages.push('...');
                        const start = Math.max(2, search.page - 1);
                        const end = Math.min(totalPages - 1, search.page + 1);
                        for (let i = start; i <= end; i++) pages.push(i);
                        if (search.page < totalPages - 2) pages.push('...');
                        pages.push(totalPages);
                      }
                      
                      return pages.map((p, i) => (
                         <button
                           key={`${p}-${i}`}
                           disabled={p === '...'}
                           onClick={() => {
                             if (p !== '...') {
                               navigate({ to: '/results', search: { ...search, page: p as number } })
                               window.scrollTo({ top: 0, behavior: 'smooth' })
                             }
                           }}
                           className={cn(
                             "w-9 h-9 flex items-center justify-center rounded-xl border text-sm font-medium transition-colors",
                             p === '...' ? "border-transparent bg-transparent cursor-default" :
                             search.page === p
                               ? "bg-primary text-primary-foreground border-primary"
                               : "border-border/60 bg-background hover:bg-muted/80 cursor-pointer"
                           )}
                         >
                           {p}
                         </button>
                      ));
                    })()}

                    <button
                      type="button"
                      disabled={search.page >= Math.ceil(total / limit)}
                      onClick={() => {
                        navigate({ to: '/results', search: { ...search, page: search.page + 1 } })
                        window.scrollTo({ top: 0, behavior: 'smooth' })
                      }}
                      className="p-2 border border-border/60 bg-background/60 backdrop-blur-sm rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted/80 hover:text-foreground transition-colors"
                      title="Trang sau"
                    >
                      <ChevronRight className="size-4" />
                    </button>
                  </div>
                )}
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
