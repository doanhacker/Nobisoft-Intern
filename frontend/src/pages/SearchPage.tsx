import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Zap, Images, Clock, TrendingUp } from 'lucide-react'
import { AnimatedBackground } from '@/components/ui/AnimatedBackground'
import { SearchBar, type SearchState } from '@/components/search/SearchBar'
import { useAuth } from '@/hooks/useAuth'
import { setPendingImageFile } from '@/services/searchService'

// ============================================================
// SearchPage — Main landing after login
// ============================================================

// Mock recent searches (replace with API when ready)
const RECENT_SEARCHES = [
  { q: 'sunset over ocean', mode: 'semantic' },
  { q: 'STOP sign', mode: 'ocr' },
  { q: 'mountain landscape', mode: 'semantic' },
  { q: 'Nike logo', mode: 'ocr' },
]

// Mock trending
const TRENDING = [
  'golden hour photography',
  'urban street art',
  'minimalist architecture',
  'vintage car',
  'forest at dawn',
  'abstract watercolor',
]

// Stats strip
const STATS = [
  { icon: <Images className="size-4" />, label: '50K+ ảnh', sub: 'đã index' },
  { icon: <Zap className="size-4" />, label: '< 3s', sub: 'thời gian tìm' },
  { icon: <TrendingUp className="size-4" />, label: '3 chế độ', sub: 'tìm kiếm' },
  { icon: <Clock className="size-4" />, label: 'Real-time', sub: 'kết quả' },
]

export function SearchPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [isSearching, setIsSearching] = React.useState(false)

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
        page: 1,
      },
    })
  }

  const greeting = React.useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Chào buổi sáng'
    if (hour < 18) return 'Chào buổi chiều'
    return 'Chào buổi tối'
  }, [])

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex flex-col">
      {/* ── Animated Background ── */}
      <AnimatedBackground />

      {/* ── Page content ── */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-12">
        {/* ── Hero text ── */}
        <div className="text-center space-y-4 mb-10 animate-fade-slide-up">
          {/* Greeting */}
          {user && (
            <p className="text-sm font-medium text-muted-foreground animate-fade-in animation-delay-100">
              {greeting},{' '}
              <span className="text-primary font-semibold">{user.name?.split(' ').at(-1)}</span> 👋
            </p>
          )}

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
        <div className="flex items-center gap-6 mb-10 animate-fade-slide-up animation-delay-300">
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

        {/* ── Recent & Trending ── */}
        <div className="w-full max-w-2xl mt-8 grid sm:grid-cols-2 gap-6 animate-fade-slide-up animation-delay-500">
          {/* Recent searches */}
          {RECENT_SEARCHES.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                <Clock className="size-3.5" /> Tìm kiếm gần đây
              </p>
              <div className="flex flex-wrap gap-2">
                {RECENT_SEARCHES.map((r, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() =>
                      navigate({ to: '/results', search: { mode: r.mode as 'semantic' | 'ocr' | 'image', q: r.q } })
                    }
                    className="px-3 py-1.5 rounded-full text-xs font-medium border border-border/60 bg-background/60 hover:border-primary/50 hover:bg-primary/5 hover:text-primary transition-all duration-200 backdrop-blur-sm"
                  >
                    {r.q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Trending */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
              <TrendingUp className="size-3.5" /> Xu hướng
            </p>
            <div className="flex flex-wrap gap-2">
              {TRENDING.map((t, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() =>
                    navigate({ to: '/results', search: { mode: 'semantic', q: t } })
                  }
                  className="px-3 py-1.5 rounded-full text-xs font-medium border border-border/60 bg-background/60 hover:border-primary/50 hover:bg-primary/5 hover:text-primary transition-all duration-200 backdrop-blur-sm"
                >
                  #{t.replace(/\s/g, '')}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
