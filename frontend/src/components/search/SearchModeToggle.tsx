import * as React from "react"
import { Image, Type, FileText } from "lucide-react"
import { cn } from "@/lib/utils"

export type SearchMode = "image" | "semantic" | "ocr"

interface SearchModeOption {
  id: SearchMode
  label: string
  shortLabel: string
  icon: React.ElementType
  description: string
}

const SEARCH_MODES: SearchModeOption[] = [
  {
    id: "image",
    label: "Tìm bằng Ảnh",
    shortLabel: "Ảnh",
    icon: Image,
    description: "Upload hoặc kéo thả ảnh để tìm ảnh tương tự",
  },
  {
    id: "semantic",
    label: "Tìm bằng Mô tả",
    shortLabel: "Mô tả",
    icon: Type,
    description: "Nhập mô tả nội dung ảnh bằng ngôn ngữ tự nhiên",
  },
  {
    id: "ocr",
    label: "Tìm bằng Chữ",
    shortLabel: "Chữ",
    icon: FileText,
    description: "Tìm ảnh chứa dòng chữ cụ thể",
  },
]

interface SearchModeToggleProps {
  value: SearchMode
  onChange: (mode: SearchMode) => void
  className?: string
  compact?: boolean
}

/**
 * SearchModeToggle — chuyển đổi giữa 3 chế độ tìm kiếm:
 * - image: tìm kiếm bằng ảnh (Visual Search)
 * - semantic: tìm kiếm ngữ nghĩa (CLIP text encoder)
 * - ocr: tìm kiếm OCR (PostgreSQL full-text)
 */
function SearchModeToggle({
  value,
  onChange,
  className,
  compact = false,
}: SearchModeToggleProps) {
  return (
    <div
      role="tablist"
      aria-label="Chế độ tìm kiếm"
      className={cn(
        "inline-flex items-center rounded-xl bg-muted/70 p-1 gap-0.5",
        className
      )}
    >
      {SEARCH_MODES.map((mode) => {
        const Icon = mode.icon
        const isActive = value === mode.id

        return (
          <button
            key={mode.id}
            role="tab"
            id={`search-mode-${mode.id}`}
            aria-selected={isActive}
            aria-controls={`search-panel-${mode.id}`}
            onClick={() => onChange(mode.id)}
            title={mode.description}
            className={cn(
              // Base styles
              "relative inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium",
              "transition-all duration-150 outline-none select-none",
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
              // Inactive
              "text-muted-foreground hover:text-foreground hover:bg-background/60",
              // Active — brand highlight
              isActive && [
                "bg-white text-primary shadow-sm",
                "shadow-[0_1px_3px_oklch(0.52_0.22_268/0.15),0_0_0_1px_oklch(0.88_0.025_270)]",
              ],
              // Compact mode: hide label on mobile
              compact && "px-2.5"
            )}
          >
            <Icon
              className={cn(
                "size-4 shrink-0 transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            />
            <span className={cn(compact && "hidden sm:inline")}>
              {compact ? mode.shortLabel : mode.label}
            </span>
            {/* Active indicator dot */}
            {isActive && (
              <span
                className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 size-1 rounded-full bg-primary"
                aria-hidden="true"
              />
            )}
          </button>
        )
      })}
    </div>
  )
}

export { SearchModeToggle, SEARCH_MODES }
export type { SearchModeOption }
