
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

interface SimilarityBadgeProps {
  score: number          // 0–1 float or 0–100 integer
  showLabel?: boolean
  showTooltip?: boolean
  className?: string
}

/**
 * Normalise score to 0–100 range.
 * Accepts both 0.87 (float) and 87 (integer) formats.
 */
function normaliseScore(score: number): number {
  return score <= 1 ? Math.round(score * 100) : Math.round(score)
}

function getScoreTier(pct: number): {
  label: string
  colorClass: string
  barClass: string
} {
  if (pct >= 80) {
    return {
      label: "Rất tương tự",
      colorClass: "similarity-high",
      barClass: "bg-[oklch(0.65_0.18_145)]",
    }
  }
  if (pct >= 50) {
    return {
      label: "Tương tự vừa",
      colorClass: "similarity-medium",
      barClass: "bg-[oklch(0.75_0.16_65)]",
    }
  }
  return {
    label: "Ít tương tự",
    colorClass: "similarity-low",
    barClass: "bg-[oklch(0.55_0.05_270)]",
  }
}

/**
 * SimilarityBadge — hiển thị điểm tương đồng của kết quả tìm kiếm ảnh.
 * Supports score as float (0.0–1.0) or integer (0–100).
 *
 * @example
 * <SimilarityBadge score={0.87} showLabel />
 * <SimilarityBadge score={92} />
 */
function SimilarityBadge({
  score,
  showLabel = false,
  showTooltip = true,
  className,
}: SimilarityBadgeProps) {
  const pct = normaliseScore(score)
  const { label, colorClass, barClass } = getScoreTier(pct)

  const badge = (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5",
        "text-xs font-semibold tabular-nums",
        colorClass,
        className
      )}
      aria-label={`Điểm tương đồng: ${pct}% — ${label}`}
    >
      {/* Mini bar indicator */}
      <span className="relative flex h-1.5 w-8 overflow-hidden rounded-full bg-current/20">
        <span
          className={cn("absolute inset-y-0 left-0 rounded-full transition-all", barClass)}
          style={{ width: `${pct}%` }}
        />
      </span>
      <span>{pct}%</span>
      {showLabel && (
        <span className="font-normal opacity-75">{label}</span>
      )}
    </span>
  )

  if (!showTooltip) return badge

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {badge}
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        <p className="font-medium">{label}</p>
        <p className="text-muted-foreground">Độ tương đồng: {pct}%</p>
      </TooltipContent>
    </Tooltip>
  )
}

export { SimilarityBadge }
