import * as React from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import {
  Sparkles,
  Search,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  Clock,
  ThumbsUp,
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
// RecommendationsPage — Personalized image recommendations
// Based on 30 recent clicks with time decay
// ============================================================

interface RecommendationsSearch {
  page?: number
  imageId?: string
}

function InsufficientHistoryState() {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center space-y-5 bg-card border border-border/60 rounded-3xl p-8 max-w-lg mx-auto shadow-sm">
      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
        <Sparkles className="size-8" />
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-foreground">Chưa đủ dữ liệu gợi ý</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Hệ thống cần ít nhất <strong className="text-foreground font-semibold">3 lượt click ảnh</strong> trong các kết quả tìm kiếm để phân tích sở thích và đưa ra gợi ý phù hợp cho bạn.
        </p>
      </div>
      <Button
        variant="brand"
        onClick={() => navigate({ to: '/search' })}
        className="gap-2"
      >
        <Search className="size-4" />
        Khám phá và tìm kiếm ngay
      </Button>
    </div>
  )
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center space-y-4 bg-card border border-border/60 rounded-3xl p-8 max-w-lg mx-auto">
      <div className="w-14 h-14 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive">
        <AlertCircle className="size-7" />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-bold text-foreground">Không thể tải gợi ý</h2>
        <p className="text-xs text-muted-foreground">Đã xảy ra lỗi kết nối. Vui lòng thử lại.</p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry} className="gap-1.5">
        <RefreshCw className="size-3.5" />
        Thử lại
      </Button>
    </div>
  )
}

export function RecommendationsPage() {
  const search = useSearch({ strict: false }) as RecommendationsSearch
  const navigate = useNavigate()
  const { error: toastError } = useToast()

  const currentPage = search.page ?? 1
  const activeImageId = search.imageId

  const [results, setResults] = React.useState<SearchResult[]>([])
  const [total, setTotal] = React.useState<number>(0)
  const [limit, setLimit] = React.useState<number>(20)
  const [clickCount, setClickCount] = React.useState<number>(0)
  const [status, setStatus] = React.useState<'loading' | 'success' | 'insufficient' | 'error'>('loading')
  const [selectedResult, setSelectedResult] = React.useState<SearchResult | null>(null)

  const savedScrollY = React.useRef<number>(0)

  const fetchRecommendations = React.useCallback(async (page: number) => {
    setStatus('loading')
    try {
      const res = await getRecommendations(page, 20)
      if (res.insufficientHistory) {
        setStatus('insufficient')
        setResults([])
        setTotal(0)
      } else {
        setResults(res.results)
        setTotal(res.total)
        setLimit(res.limit)
        setClickCount(res.clickCount)
        setStatus('success')
      }
    } catch (err) {
      console.error('Error fetching recommendations:', err)
      setStatus('error')
      toastError('Không thể tải gợi ý ảnh')
    }
  }, [toastError])

  React.useEffect(() => {
    fetchRecommendations(currentPage)
  }, [currentPage, fetchRecommendations])

  // Sync selected image modal with URL param
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

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 min-h-[calc(100vh-4rem)]">
      {/* ── Hero Banner ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-transparent border border-violet-500/20 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="absolute -top-10 -right-10 size-48 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="flex items-center justify-center size-14 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-600 text-white shadow-md shadow-violet-500/20 shrink-0">
              <Sparkles className="size-7" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-600 dark:text-violet-300 text-xs font-semibold mb-1">
                <ThumbsUp className="size-3" />
                Dành riêng cho bạn
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                Gợi ý hình ảnh thông minh
              </h1>
              <p className="text-sm text-muted-foreground mt-1 max-w-xl leading-relaxed">
                Hệ thống AI tự động phân tích gu thẩm mỹ dựa trên các ảnh bạn đã xem gần đây để gợi ý những hình ảnh tương tự.
              </p>
            </div>
          </div>

          {status === 'success' && clickCount > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-card/80 backdrop-blur border border-border/60 rounded-2xl shadow-sm shrink-0">
              <Clock className="size-4 text-violet-500" />
              <div className="text-xs">
                <p className="text-muted-foreground font-medium">Dựa trên</p>
                <p className="font-bold text-foreground">{clickCount} ảnh đã tương tác</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Content States ── */}
      {status === 'loading' && <SkeletonGrid count={20} />}

      {status === 'insufficient' && <InsufficientHistoryState />}

      {status === 'error' && <ErrorState onRetry={() => fetchRecommendations(currentPage)} />}

      {status === 'success' && results.length > 0 && (
        <>
          <MasonryGrid
            results={results}
            onCardClick={handleCardClick}
            onSearchSimilar={handleSearchSimilar}
          />

          {/* ── Pagination ── */}
          {total > limit && (
            <div className="mt-8 mb-4 flex justify-center items-center gap-2">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => {
                  navigate({ to: '.', search: { page: currentPage - 1 } } as any)
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
                className="p-2 border border-border/60 bg-background rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted transition-colors"
                title="Trang trước"
              >
                <ChevronLeft className="size-4" />
              </button>

              {(() => {
                const totalPages = Math.ceil(total / limit)
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

                return pages.map((p, i) => (
                  <button
                    key={`${p}-${i}`}
                    disabled={p === '...'}
                    onClick={() => {
                      if (p !== '...') {
                        navigate({ to: '.', search: { page: p as number } } as any)
                        window.scrollTo({ top: 0, behavior: 'smooth' })
                      }
                    }}
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
                ))
              })()}

              <button
                type="button"
                disabled={currentPage >= Math.ceil(total / limit)}
                onClick={() => {
                  navigate({ to: '.', search: { page: currentPage + 1 } } as any)
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
                className="p-2 border border-border/60 bg-background rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted transition-colors"
                title="Trang sau"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Modal ── */}
      <ImageDetailModal
        result={selectedResult}
        onClose={handleModalClose}
        onSearchSimilar={handleSearchSimilar}
      />
    </div>
  )
}
