import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Zap, Images, Clock, TrendingUp, ImageIcon, ScanText, Sparkles } from 'lucide-react'
import { AnimatedBackground } from '@/components/ui/AnimatedBackground'
import { SearchBar, type SearchState } from '@/components/search/SearchBar'
import { useAuth } from '@/hooks/useAuth'
import { setPendingImageFile } from '@/services/searchService'
import { getMySearchHistory } from '@/services/historyService'
import type { SearchHistoryItem } from '@/types/admin'

// ============================================================
// SearchPage — Main landing after login
// ============================================================

// Stats strip
const STATS = [
  { icon: <Images className="size-4" />, label: '50K+ ảnh', sub: 'đã index' },
  { icon: <Zap className="size-4" />, label: '< 3s', sub: 'thời gian tìm' },
  { icon: <TrendingUp className="size-4" />, label: '4 chế độ', sub: 'tìm kiếm' },
  { icon: <Clock className="size-4" />, label: 'Real-time', sub: 'kết quả' },
]

/** Map searchType từ backend → mode của route /results */
function mapSearchTypeToMode(
  searchType: SearchHistoryItem['searchType'],
): 'semantic' | 'ocr' | 'image' | 'prompt' {
  switch (searchType) {
    case 'TEXT_SEMANTIC':
      return 'semantic'
    case 'TEXT_OCR':
      return 'ocr'
    case 'IMAGE_ONLY':
      return 'image'
    case 'TEXT_PROMPT':
      return 'prompt'
    default:
      return 'semantic'
  }
}

/** Hiển thị icon nhỏ phân biệt loại tìm kiếm */
function SearchTypeIcon({ type }: { type: SearchHistoryItem['searchType'] }) {
  switch (type) {
    case 'IMAGE_ONLY':
      return <ImageIcon className="size-3 shrink-0 opacity-60" />
    case 'TEXT_OCR':
      return <ScanText className="size-3 shrink-0 opacity-60" />
    case 'TEXT_PROMPT':
      return <Sparkles className="size-3 shrink-0 opacity-60" />
    default:
      return null
  }
}

export function SearchPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [isSearching, setIsSearching] = React.useState(false)

  // ── Gọi API lấy lịch sử gần nhất — dùng limit=20 giống SearchHistoryPage ──
  // (backend không chấp nhận limit tùy ý nhỏ hơn, e.g. 8 → 400)
  const { data: historyData } = useQuery({
    queryKey: ['history', 'me', { page: 1, limit: 20 }],
    queryFn: () =>
      getMySearchHistory({
        page: 1,
        limit: 20,
      }),
    staleTime: 30_000,
    retry: false,
  })

  // Lọc client-side: chỉ lấy text searches có nội dung, tối đa 8 chip
  const recentSearches = (historyData?.data ?? [])
    .filter((item) => item.searchType !== 'IMAGE_ONLY' && !!item.queryText)
    .slice(0, 8)

  const handleSearch = async (state: SearchState) => {
    setIsSearching(true)

    if (state.mode === 'image' && state.imageFile) {
      // Store the File object so ResultsPage can call the real API.
      setPendingImageFile(state.imageFile)

      // Also persist a data: URL preview so the QueryImagePanel can render
      // without re-reading the (potentially revoked) blob URL after navigation.
      try {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(state.imageFile!)
        })
        sessionStorage.setItem('pendingImagePreviewUrl', dataUrl)
      } catch {
        if (state.imagePreviewUrl) {
          sessionStorage.setItem('pendingImagePreviewUrl', state.imagePreviewUrl)
        }
      }
    } else {
      setPendingImageFile(null)
      sessionStorage.removeItem('pendingImagePreviewUrl')
    }

    setIsSearching(false)

    navigate({
      to: '/results',
      search: {
        mode: state.mode,
        q: state.textQuery || '',
        ...(state.mode === 'image' ? { query_id: `upload-${Date.now()}` } : {}),
      },
    })
  }

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex flex-col">
      {/* ── Animated Background ── */}
      <AnimatedBackground />

      {/* ── Page content ── */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-12">
        {/* ── Hero text ── */}
        <div className="text-center space-y-4 mb-10 animate-fade-slide-up">

          {/* Main heading */}
          <h1 className="text-5xl sm:text-6xl font-black tracking-tight leading-tight">
            <span className="text-foreground">Tìm kiếm </span>
            <span className="text-gradient-animated">mọi hình ảnh</span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg text-muted-foreground max-w-lg mx-auto leading-relaxed animate-fade-slide-up animation-delay-200">
            Sử dụng{' '}
            <span className="text-primary font-semibold">CLIP AI</span> để tìm ảnh bằng
            hình ảnh, mô tả ngôn ngữ tự nhiên, hoặc chữ trong ảnh.
          </p>
        </div>

        {/* ── Stats strip ── */}
        <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-6 mb-10 animate-fade-slide-up animation-delay-300">
          {STATS.map((s, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className="text-primary">{s.icon}</span>
              <div>
                <span className="font-bold text-foreground">{s.label}</span>
                <span className="text-muted-foreground ml-1">{s.sub}</span>
              </div>
            </div>
          ))}
        </div>

        {/* ── Search Bar ── */}
        <div className="w-full max-w-2xl animate-scale-in-spring animation-delay-200">
          <SearchBar onSearch={handleSearch} isLoading={isSearching} />
        </div>

        {/* ── Recent searches (từ API) ── */}
        {recentSearches.length > 0 && (
          <div className="w-full max-w-2xl mt-8 animate-fade-slide-up animation-delay-500">
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                <Clock className="size-3.5" /> Tìm kiếm gần đây
              </p>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      navigate({
                        to: '/results',
                        search: { mode: mapSearchTypeToMode(item.searchType), q: item.queryText! },
                      })
                    }
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-border/60 bg-background/60 hover:border-primary/50 hover:bg-primary/5 hover:text-primary transition-all duration-200 backdrop-blur-sm"
                  >
                    <SearchTypeIcon type={item.searchType} />
                    {item.queryText}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
