import * as React from 'react'
import { Search, ImageIcon, ChevronDown, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ImageSearchModal } from './ImageSearchModal'

// ============================================================
// ResultsSearchBar — Compact single-row search bar for Results page
// - Text input for semantic/ocr modes
// - Dropdown to select search mode
// - Image thumbnail + "Open modal" button for image mode
// ============================================================

export type SearchMode = 'image' | 'semantic' | 'ocr'

export interface ResultsSearchState {
  mode: SearchMode
  textQuery: string
  imageFile: File | null
  imagePreviewUrl: string | null
}

interface ResultsSearchBarProps {
  onSearch: (state: ResultsSearchState) => void
  isLoading?: boolean
  initialMode?: SearchMode
  initialTextQuery?: string
  initialImagePreviewUrl?: string | null
  className?: string
}

const MODE_OPTIONS: { id: SearchMode; label: string; shortLabel: string }[] = [
  { id: 'image', label: 'Tìm bằng Ảnh', shortLabel: 'Ảnh' },
  { id: 'semantic', label: 'Tìm bằng Mô tả', shortLabel: 'Mô tả' },
  { id: 'ocr', label: 'Tìm bằng Chữ', shortLabel: 'Chữ' },
]

export function ResultsSearchBar({
  onSearch,
  isLoading = false,
  initialMode = 'semantic',
  initialTextQuery = '',
  initialImagePreviewUrl = null,
  className,
}: ResultsSearchBarProps) {
  const [mode, setMode] = React.useState<SearchMode>(initialMode)
  const [textQuery, setTextQuery] = React.useState(initialTextQuery)
  const [imageFile, setImageFile] = React.useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = React.useState<string | null>(initialImagePreviewUrl)
  const [dropdownOpen, setDropdownOpen] = React.useState(false)
  const [showImageModal, setShowImageModal] = React.useState(false)
  const dropdownRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  // Sync with URL changes (browser back/forward)
  React.useEffect(() => { setMode(initialMode) }, [initialMode])
  React.useEffect(() => { setTextQuery(initialTextQuery) }, [initialTextQuery])
  // Sync image preview URL when parent restores it (e.g., from sessionStorage after navigating from /search)
  React.useEffect(() => {
    if (initialImagePreviewUrl !== undefined) setImagePreviewUrl(initialImagePreviewUrl)
  }, [initialImagePreviewUrl])

  // Close dropdown when clicking outside
  React.useEffect(() => {
    if (!dropdownOpen) return
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [dropdownOpen])

  const handleModeChange = (newMode: SearchMode) => {
    setMode(newMode)
    setDropdownOpen(false)
    if (newMode !== 'image') {
      setImageFile(null)
      setImagePreviewUrl(null)
    } else {
      setTextQuery('')
    }
  }

  const handleSearch = () => {
    if (mode === 'image' && !imageFile) {
      // If no image, open modal
      setShowImageModal(true)
      return
    }
    if ((mode === 'semantic' || mode === 'ocr') && !textQuery.trim()) return
    onSearch({ mode, textQuery, imageFile, imagePreviewUrl })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  const handleImageConfirm = (file: File, previewUrl: string) => {
    setImageFile(file)
    setImagePreviewUrl(previewUrl)
    // Auto-trigger search after image selected
    onSearch({ mode: 'image', textQuery: '', imageFile: file, imagePreviewUrl: previewUrl })
  }

  const currentModeLabel = MODE_OPTIONS.find((m) => m.id === mode)?.label ?? 'Chọn chế độ'
  const canSearch =
    (mode === 'image' && !!imageFile) ||
    ((mode === 'semantic' || mode === 'ocr') && textQuery.trim().length > 0)

  return (
    <>
      <div
        className={cn(
          'flex items-center gap-2 px-4 py-2.5',
          'bg-background/80 backdrop-blur-xl border-b border-border/40',
          className,
        )}
      >
        {/* ── Search input / Image thumbnail ── */}
        <div className="flex-1 min-w-0 relative">
          {mode === 'image' ? (
            /* Image mode: show thumbnail or placeholder button */
            <div
              role="button"
              tabIndex={0}
              onClick={() => setShowImageModal(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setShowImageModal(true)
                }
              }}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 text-left cursor-pointer',
                'border bg-background',
                imagePreviewUrl
                  ? 'border-primary/40 hover:border-primary/60'
                  : 'border-border/60 hover:border-primary/50 hover:bg-primary/3',
              )}
            >
              {imagePreviewUrl ? (
                <>
                  <img
                    src={imagePreviewUrl}
                    alt="Query image"
                    className="size-8 rounded-lg object-cover border border-border/40 shrink-0"
                  />
                  <span className="text-sm text-foreground font-medium truncate flex-1">
                    Ảnh tìm kiếm đã chọn — click để đổi
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setImageFile(null)
                      setImagePreviewUrl(null)
                    }}
                    className="shrink-0 p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Xoá ảnh"
                  >
                    <X className="size-3.5" />
                  </button>
                </>
              ) : (
                <>
                  <div className="size-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <ImageIcon className="size-4 text-muted-foreground" />
                  </div>
                  <span className="text-sm text-muted-foreground">Click để chọn ảnh tìm kiếm...</span>
                </>
              )}
            </div>
          ) : (
            /* Text mode: regular input */
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={textQuery}
                onChange={(e) => setTextQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  mode === 'semantic'
                    ? 'Mô tả nội dung ảnh bạn muốn tìm...'
                    : 'Nhập chữ xuất hiện trong ảnh...'
                }
                disabled={isLoading}
                className={cn(
                  'w-full pl-10 pr-10 py-2.5 rounded-xl border border-border/60 bg-background',
                  'text-sm text-foreground placeholder:text-muted-foreground',
                  'focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary/50',
                  'transition-all duration-200 disabled:opacity-60',
                )}
              />
              {textQuery && (
                <button
                  type="button"
                  onClick={() => { setTextQuery(''); inputRef.current?.focus() }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  aria-label="Xoá"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Mode dropdown ── */}
        <div className="relative shrink-0" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen((o) => !o)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2.5 rounded-xl border transition-all duration-200 text-sm font-medium',
              dropdownOpen
                ? 'bg-primary/10 border-primary/40 text-primary'
                : 'border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/60',
            )}
            aria-label="Chọn chế độ tìm kiếm"
          >
            <span className="hidden sm:inline">{currentModeLabel}</span>
            <span className="sm:hidden text-xs">{MODE_OPTIONS.find((m) => m.id === mode)?.shortLabel}</span>
            <ChevronDown
              className={cn('size-3.5 shrink-0 transition-transform duration-200', dropdownOpen && 'rotate-180')}
            />
          </button>

          {/* Dropdown menu */}
          {dropdownOpen && (
            <div
              className={cn(
                'absolute right-0 top-full mt-1.5 z-50',
                'w-48 rounded-xl border border-border/60 bg-background/95 backdrop-blur-xl shadow-xl',
                'py-1 animate-fade-slide-down',
              )}
            >
              {MODE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleModeChange(opt.id)}
                  className={cn(
                    'w-full text-left px-3.5 py-2.5 text-sm font-medium transition-colors duration-150',
                    mode === opt.id
                      ? 'bg-primary/10 text-primary'
                      : 'text-foreground hover:bg-muted/60',
                  )}
                >
                  <span className="flex items-center gap-2">
                    {mode === opt.id && (
                      <span className="size-1.5 rounded-full bg-primary shrink-0" />
                    )}
                    {mode !== opt.id && <span className="size-1.5 shrink-0" />}
                    {opt.label}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Search button ── */}
        <button
          type="button"
          onClick={handleSearch}
          disabled={(mode !== 'image' && !canSearch) || isLoading}
          className={cn(
            'shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold',
            'gradient-brand text-white shadow-brand',
            'hover:shadow-[0_0_20px_oklch(0.52_0.22_268/0.4)] active:scale-[0.97]',
            'transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed',
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

      {/* Image Search Modal */}
      {showImageModal && (
        <ImageSearchModal
          onConfirm={handleImageConfirm}
          onClose={() => setShowImageModal(false)}
          initialFile={imageFile}
          initialPreviewUrl={imagePreviewUrl}
        />
      )}
    </>
  )
}
