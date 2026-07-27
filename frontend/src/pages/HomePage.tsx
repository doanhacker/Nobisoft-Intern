import * as React from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import {
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Compass,
} from 'lucide-react'
import { MasonryGrid, type SearchResult } from '@/components/results/MasonryGrid'
import { SkeletonGrid } from '@/components/results/SkeletonGrid'
import { ImageDetailModal } from '@/components/results/ImageDetailModal'
import { getRecommendations } from '@/services/recommendationService'
import { fetchImageAsFile, setPendingImageFile } from '@/services/searchService'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ============================================================
// HomePage — Pinterest-style recommendations feed
// No banner, no explanatory text — pure image grid
// ============================================================

interface HomeSearch {
  page?: number
  imageId?: string
}

// ── Empty state when user has no click history ────────────────

function DiscoverState() {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center justify-center py-24 px-4 text-center space-y-5">
      <div className="relative">
        <div className="w-20 h-20 rounded-3xl gradient-brand flex items-center justify-center shadow-brand glow-brand">
          <Compass className="size-10 text-white" />
        </div>
        {/* Floating dots */}
        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="absolute -bottom-1 -left-1 w-3 h-3 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
      </div>
      <div className="space-y-2 max-w-sm">
        <h2 className="text-xl font-bold text-foreground">Khám phá bắt đầu từ đây</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Tìm kiếm một vài ảnh để hệ thống học sở thích của bạn và hiển thị nội dung phù hợp hơn.
        </p>
      </div>
      <Button
        variant="brand"
        onClick={() => navigate({ to: '/search' })}
        className="gap-2"
      >
        <Search className="size-4" />
        Bắt đầu tìm kiếm
      </Button>
    </div>
  )
}

// ── Error state ───────────────────────────────────────────────

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-4 text-center space-y-4">
      <p className="text-sm text-muted-foreground">Không thể tải nội dung.</p>
      <Button variant="outline" size="sm" onClick={onRetry} className="gap-1.5">
        <RefreshCw className="size-3.5" />
        Thử lại
      </Button>
    </div>
  )
}

// ── Pagination ────────────────────────────────────────────────

interface PaginationProps {
  currentPage: number
  total: number
  limit: number
  onPageChange: (page: number) => void
}

function Pagination({ currentPage, total, limit, onPageChange }: PaginationProps) {
  const totalPages = Math.ceil(total / limit)
  if (totalPages <= 1) return null

  const pages: (number | string)[] = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i)
  } else {
    pages.push(1)
    if (currentPage > 3) pages.push('...')
    const start = Math.max(2, currentPage - 1)
    const end = Math.min(totalPages - 1, currentPage + 1)
    for (let i = start; i <= end; i++) pages.push(i)
    if (currentPage < totalPages - 2) pages.push('...')
    pages.push(totalPages)
  }

  return (
    <div className="mt-10 mb-6 flex justify-center items-center gap-2">
      <button
        type="button"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
        className="p-2 border border-border/60 bg-background rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted transition-colors"
        title="Trang trước"
      >
        <ChevronLeft className="size-4" />
      </button>

      {pages.map((p, i) => (
        <button
          key={`${p}-${i}`}
          disabled={p === '...'}
          onClick={() => { if (p !== '...') onPageChange(p as number) }}
          className={cn(
            'w-9 h-9 flex items-center justify-center rounded-xl border text-sm font-medium transition-colors',
            p === '...'
              ? 'border-transparent bg-transparent cursor-default'
              : currentPage === p
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border/60 bg-background hover:bg-muted cursor-pointer',
          )}
        >
          {p}
        </button>
      ))}

      <button
        type="button"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        className="p-2 border border-border/60 bg-background rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted transition-colors"
        title="Trang sau"
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────

export function HomePage() {
  const search = useSearch({ strict: false }) as HomeSearch
  const navigate = useNavigate()
  const { error: toastError } = useToast()

  const currentPage = search.page ?? 1
  const activeImageId = search.imageId

  const [results, setResults] = React.useState<SearchResult[]>([])
  const [total, setTotal] = React.useState<number>(0)
  const [limit, setLimit] = React.useState<number>(20)
  const [status, setStatus] = React.useState<'loading' | 'success' | 'insufficient' | 'error'>('loading')
  const [selectedResult, setSelectedResult] = React.useState<SearchResult | null>(null)

  const savedScrollY = React.useRef<number>(0)
  const abortRef = React.useRef<AbortController | null>(null)

  const fetchRecommendations = React.useCallback(async (page: number) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setStatus('loading')
    try {
      const res = await getRecommendations(page, 20, controller.signal)
      if (res.insufficientHistory) {
        setStatus('insufficient')
        setResults([])
        setTotal(0)
      } else {
        setResults(res.results)
        setTotal(res.total)
        setLimit(res.limit)
        setStatus('success')
      }
    } catch (err: unknown) {
      if ((err as { name?: string }).name === 'CanceledError' || (err as { name?: string }).name === 'AbortError') return
      console.error('Error fetching recommendations:', err)
      setStatus('error')
      toastError('Không thể tải nội dung')
    }
  }, [toastError])

  React.useEffect(() => {
    fetchRecommendations(currentPage)
    return () => abortRef.current?.abort()
  }, [currentPage, fetchRecommendations])

  // Sync modal with URL param
  React.useEffect(() => {
    if (activeImageId) {
      const found = results.find((r) => r.id === activeImageId)
      if (found) setSelectedResult(found)
    } else {
      setSelectedResult(null)
    }
  }, [activeImageId, results])

  const handleCardClick = (result: SearchResult) => {
    savedScrollY.current = window.scrollY
    setSelectedResult(result)
    navigate({
      to: '.',
      search: { page: currentPage, imageId: result.id },
      replace: true,
      resetScroll: false,
    } as any)
  }

  const handleModalClose = () => {
    const targetY = savedScrollY.current
    setSelectedResult(null)
    navigate({
      to: '.',
      search: { page: currentPage },
      replace: true,
      resetScroll: false,
    } as any)
    requestAnimationFrame(() => {
      window.scrollTo({ top: targetY, behavior: 'instant' })
    })
  }

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
      toastError('Không thể tải ảnh để tìm kiếm')
    }
  }

  const handlePageChange = (page: number) => {
    navigate({ to: '.', search: { page } } as any)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-[1800px] mx-auto min-h-[calc(100vh-4rem)]">
      {status === 'loading' && <SkeletonGrid count={20} />}
      {status === 'insufficient' && <DiscoverState />}
      {status === 'error' && <ErrorState onRetry={() => fetchRecommendations(currentPage)} />}

      {status === 'success' && results.length > 0 && (
        <>
          <MasonryGrid
            results={results}
            onCardClick={handleCardClick}
            onSearchSimilar={handleSearchSimilar}
          />
          <Pagination
            currentPage={currentPage}
            total={total}
            limit={limit}
            onPageChange={handlePageChange}
          />
        </>
      )}

      <ImageDetailModal
        result={selectedResult}
        onClose={handleModalClose}
        onSearchSimilar={handleSearchSimilar}
      />
    </div>
  )
}
