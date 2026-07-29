import * as React from 'react'
import { Search, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SearchMode } from './SearchModeToggle'

// ============================================================
// TextSearchInput — Animated search input for Semantic & OCR
// ============================================================

const PLACEHOLDERS: Record<SearchMode, string[]> = {
  image: [],
  semantic: [
    'a golden sunset over the ocean...',
    'woman in red dress at a cafe...',
    'mountain landscape with snow...',
    'cat sitting on a window sill...',
    'city at night with neon lights...',
  ],
  ocr: [
    'STOP',
    'Sale 50%',
    'Nike',
    'Open 24 Hours',
    'Coca-Cola',
  ],
}

interface TextSearchInputProps {
  mode: Exclude<SearchMode, 'image'>
  value: string
  onChange: (v: string) => void
  onSearch: () => void
  isLoading?: boolean
  className?: string
}

// Detect Vietnamese diacritics (spec 3.3 alternate path — OCR beta badge)
function hasVietnamese(text: string): boolean {
  return /[àáâãèéêìíòóôõùúýăđơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i.test(text)
}

export function TextSearchInput({
  mode,
  value,
  onChange,
  onSearch,
  isLoading = false,
  className,
}: TextSearchInputProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [placeholderIdx, setPlaceholderIdx] = React.useState(0)
  const [isFocused, setIsFocused] = React.useState(false)

  // Rotate placeholder text
  const placeholders = PLACEHOLDERS[mode]
  React.useEffect(() => {
    if (isFocused || value) return
    const t = setInterval(() => {
      setPlaceholderIdx((i) => (i + 1) % placeholders.length)
    }, 2800)
    return () => clearInterval(t)
  }, [isFocused, value, placeholders.length])

  // Reset placeholder when mode changes
  React.useEffect(() => setPlaceholderIdx(0), [mode])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (value.trim()) onSearch()
  }

  const modeConfig = {
    semantic: {
      label: 'Nhập mô tả ảnh',
      hint: 'Semantic AI — CLIP model',
      color: 'oklch(0.60 0.22 290)',
    },
    ocr: {
      label: 'Nhập chữ trong ảnh',
      hint: 'OCR Text Search',
      color: 'oklch(0.72 0.15 200)',
    },
  }

  const config = modeConfig[mode]
  const showBetaBadge = mode === 'ocr' && value.length > 0 && hasVietnamese(value)

  return (
    <form
      onSubmit={handleSubmit}
      className={cn('relative group border-glow-animated rounded-2xl', className)}
    >
      {/* ── Inner container ── */}
      <div
        className={cn(
          'flex items-center gap-2 sm:gap-3 rounded-2xl border bg-background/80 backdrop-blur-sm',
          'transition-all duration-300 px-3 sm:px-4 py-2.5 sm:py-3',
          isFocused
            ? 'border-primary/60 shadow-[0_0_0_3px_oklch(0.52_0.22_268/0.15)]'
            : 'border-border/60 hover:border-border',
        )}
      >
        {/* Search icon */}
        <Search
          className="size-5 shrink-0 transition-colors duration-200"
          style={{ color: isFocused ? config.color : undefined }}
        />

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholders[placeholderIdx]}
          aria-label={config.label}
          className={cn(
            'flex-1 bg-transparent text-foreground placeholder:text-muted-foreground/60',
            'text-sm sm:text-base outline-none border-none focus:ring-0',
            'transition-colors duration-200 min-w-0',
          )}
          disabled={isLoading}
        />

        {/* OCR Beta badge (spec 3.3 — Vietnamese diacritics detected) */}
        {showBetaBadge && (
          <span className="shrink-0 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-600 border border-amber-500/30 animate-fade-in">
            Beta
          </span>
        )}

        {/* Clear button */}
        {value && !isLoading && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="shrink-0 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Xoá"
          >
            <X className="size-3.5" />
          </button>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={!value.trim() || isLoading}
          className={cn(
            'shrink-0 flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-sm font-semibold',
            'transition-all duration-200',
            'disabled:opacity-40 disabled:cursor-not-allowed',
            'gradient-brand text-white shadow-brand hover:shadow-[0_0_20px_oklch(0.52_0.22_268/0.5)]',
            'active:scale-95',
          )}
        >
          {isLoading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Search className="size-4" />
          )}
          <span className="hidden sm:inline">Tìm kiếm</span>
        </button>
      </div>

      {/* ── Mode hint + Beta tooltip ── */}
      <div className="absolute -bottom-5 right-0 flex items-center gap-2">
        <span
          className="text-[11px] font-medium opacity-60"
          style={{ color: config.color }}
        >
          {config.hint}
        </span>
        {showBetaBadge && (
          <span className="text-[10px] text-amber-500/80 font-medium">
            · OCR tiếng Việt chưa hỗ trợ đầy đủ
          </span>
        )}
      </div>
    </form>
  )
}
