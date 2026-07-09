import * as React from 'react'
import { cn } from '@/lib/utils'
import { SearchModeToggle, type SearchMode } from './SearchModeToggle'
import { ImageUploadZone } from './ImageUploadZone'
import { TextSearchInput } from './TextSearchInput'

// ============================================================
// SearchBar — Master container for all 3 search modes
// ============================================================

export interface SearchState {
  mode: SearchMode
  textQuery: string
  imageFile: File | null
  imagePreviewUrl: string | null
}

interface SearchBarProps {
  onSearch: (state: SearchState) => void
  isLoading?: boolean
  className?: string
  /** Compact mode — no hero headings, smaller padding */
  compact?: boolean
}

export function SearchBar({ onSearch, isLoading = false, className, compact = false }: SearchBarProps) {
  const [mode, setMode] = React.useState<SearchMode>('image')
  const [textQuery, setTextQuery] = React.useState('')
  const [imageFile, setImageFile] = React.useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = React.useState<string | null>(null)

  const handleModeChange = (newMode: SearchMode) => {
    setMode(newMode)
    // Clear state when switching modes
    setTextQuery('')
    setImageFile(null)
    setImagePreviewUrl(null)
  }

  const handleImageSelect = (file: File, previewUrl: string) => {
    setImageFile(file)
    setImagePreviewUrl(previewUrl)
  }

  const handleImageClear = () => {
    setImageFile(null)
    setImagePreviewUrl(null)
  }

  const handleSearch = () => {
    if (mode === 'image' && !imageFile) return
    if ((mode === 'semantic' || mode === 'ocr') && !textQuery.trim()) return

    onSearch({ mode, textQuery, imageFile, imagePreviewUrl })
  }

  const canSearch =
    (mode === 'image' && !!imageFile) ||
    ((mode === 'semantic' || mode === 'ocr') && textQuery.trim().length > 0)

  return (
    <div
      className={cn(
        'relative rounded-3xl border border-border/50 bg-background/60 backdrop-blur-xl',
        'shadow-[0_8px_32px_oklch(0_0_0/0.08),0_0_0_1px_oklch(0.52_0.22_268/0.08)]',
        compact ? 'p-4' : 'p-6 sm:p-8',
        className,
      )}
    >
      {/* ── Gradient border glow (decorative) ── */}
      <div
        className="absolute inset-0 rounded-3xl pointer-events-none"
        style={{
          background:
            'linear-gradient(135deg, oklch(0.52 0.22 268 / 0.08), oklch(0.72 0.15 200 / 0.05), oklch(0.60 0.22 290 / 0.08))',
        }}
      />

      <div className="relative z-10 flex flex-col gap-4 sm:gap-6">
        {/* ── Mode toggle ── */}
        <div className="overflow-x-auto -mx-1 px-1">
          <SearchModeToggle value={mode} onChange={handleModeChange} />
        </div>

        {/* ── Input area (animated transition) ── */}
        <div className="min-h-[100px] sm:min-h-[120px]">
          {mode === 'image' ? (
            <div className="animate-fade-in" key="image-zone">
              <ImageUploadZone
                onImageSelect={handleImageSelect}
                onClear={handleImageClear}
                disabled={isLoading}
              />
              {/* Image search button */}
              {imageFile && (
                <button
                  type="button"
                  onClick={handleSearch}
                  disabled={!canSearch || isLoading}
                  className={cn(
                    'mt-4 w-full flex items-center justify-center gap-2 py-2.5 sm:py-3 px-6 rounded-xl',
                    'font-semibold text-sm sm:text-base transition-all duration-200',
                    'gradient-brand text-white glow-brand',
                    'hover:shadow-[0_0_28px_oklch(0.52_0.22_268/0.5)]',
                    'active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed',
                  )}
                >
                  🔍 Tìm ảnh tương tự
                </button>
              )}
            </div>
          ) : (
            <div className="animate-fade-in pt-2" key={`text-${mode}`}>
              <TextSearchInput
                mode={mode}
                value={textQuery}
                onChange={setTextQuery}
                onSearch={handleSearch}
                isLoading={isLoading}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
