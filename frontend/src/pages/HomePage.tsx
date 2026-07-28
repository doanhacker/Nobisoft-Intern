import * as React from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Sparkles,
  ImageIcon,
  FileText,
  Zap,
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
// HomePage — Pinterest-style recommendations feed + hero section
// ============================================================

interface HomeSearch {
  page?: number
  imageId?: string
}

// ── Hero Section ─────────────────────────────────────────────

const FEATURES = [
  { icon: ImageIcon, label: 'Tìm bằng ảnh', desc: 'Upload ảnh để tìm ảnh tương tự' },
  { icon: Sparkles, label: 'Semantic AI', desc: 'Mô tả bằng ngôn ngữ tự nhiên' },
  { icon: FileText, label: 'OCR Search', desc: 'Tìm theo chữ có trong ảnh' },
]

function HeroSection({ compact = false }: { compact?: boolean }) {
  if (compact) {
    // Compact banner shown above the masonry grid — info only, no action buttons
    return (
      <div
        className="relative overflow-hidden rounded-2xl mb-6 px-6 py-5"
        style={{
          background: 'linear-gradient(135deg, oklch(0.22 0.04 268) 0%, oklch(0.18 0.06 280) 50%, oklch(0.20 0.05 260) 100%)',
          border: '1px solid oklch(0.35 0.08 268 / 0.5)',
        }}
      >
        {/* Floating orbs */}
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl opacity-20" style={{ background: 'oklch(0.65 0.22 280)' }} />
        <div className="absolute bottom-0 left-20 w-32 h-32 rounded-full blur-2xl opacity-15" style={{ background: 'oklch(0.60 0.20 250)' }} />

        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-xl gradient-brand shadow-brand shrink-0">
              <Zap className="size-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Khám phá với Visual Search AI</p>
              <p className="text-xs text-white/50 mt-0.5">Tìm kiếm bằng ảnh, mô tả, hoặc chữ trong ảnh</p>
            </div>
          </div>
          {/* Feature badges — display only */}
          <div className="flex items-center gap-2">
            {FEATURES.map((f) => (
              <span
                key={f.label}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)' }}
              >
                <f.icon className="size-3" />
                {f.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Full hero — shown when user hasn't built history yet (info only, no CTA buttons)
  return (
    <div
      className="relative overflow-hidden rounded-3xl mb-8 px-8 py-16 sm:py-20"
      style={{
        background: 'linear-gradient(135deg, oklch(0.20 0.06 275) 0%, oklch(0.16 0.08 285) 40%, oklch(0.13 0.05 260) 100%)',
        border: '1px solid oklch(0.32 0.10 275 / 0.6)',
      }}
    >
      {/* Background glows */}
      <div
        className="absolute -top-24 -right-24 w-80 h-80 rounded-full blur-3xl opacity-25 animate-pulse"
        style={{ background: 'oklch(0.65 0.25 285)', animationDuration: '4s' }}
      />
      <div
        className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full blur-3xl opacity-20 animate-pulse"
        style={{ background: 'oklch(0.60 0.22 255)', animationDuration: '6s', animationDelay: '1s' }}
      />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-32 rounded-full blur-3xl opacity-10"
        style={{ background: 'oklch(0.75 0.18 300)' }}
      />

      {/* Subtle dot grid */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      <div className="relative text-center space-y-6 max-w-xl mx-auto">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold" style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.80)' }}>
          <Sparkles className="size-3" />
          Powered by AI
        </div>

        {/* Title */}
        <div className="space-y-3">
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight">
            <span className="text-white">Khám phá thế giới</span>{' '}
            <br />
            <span
              className="inline-block"
              style={{
                background: 'linear-gradient(135deg, oklch(0.75 0.18 280) 0%, oklch(0.82 0.15 300) 50%, oklch(0.78 0.20 260) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              bằng hình ảnh AI
            </span>
          </h1>
          <p className="text-white/55 text-base leading-relaxed max-w-md mx-auto">
            Tìm kiếm ảnh bằng cách upload ảnh, mô tả bằng ngôn ngữ tự nhiên, hoặc tìm theo chữ trong ảnh — nhanh, chính xác, thông minh.
          </p>
        </div>

        {/* Feature cards — display only */}
        <div className="grid grid-cols-3 gap-3 pt-2">
          {FEATURES.map((f) => (
            <div
              key={f.label}
              className="flex flex-col items-center gap-2 p-3 rounded-xl text-center"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <div className="flex items-center justify-center size-8 rounded-lg gradient-brand shadow-brand">
                <f.icon className="size-4 text-white" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">{f.label}</p>
                <p className="text-[11px] text-white/40 leading-snug mt-0.5 hidden sm:block">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Empty state when user has no click history ────────────────
// Replaced by HeroSection (full variant) below

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

      {/* Full hero replaces the old DiscoverState */}
      {status === 'insufficient' && <HeroSection compact={false} />}

      {status === 'error' && <ErrorState onRetry={() => fetchRecommendations(currentPage)} />}

      {status === 'success' && results.length > 0 && (
        <>
          {/* Compact hero banner above the grid */}
          <HeroSection compact={true} />

          {/* Title: Đề xuất cho bạn */}
          <div className="flex items-center justify-between mt-6 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center size-8 rounded-xl bg-primary/10 text-primary">
                <Sparkles className="size-4" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                Đề xuất cho bạn
              </h2>
            </div>
          </div>

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
