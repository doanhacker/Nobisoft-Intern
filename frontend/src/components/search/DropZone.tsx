import * as React from "react"
import { UploadCloud } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface DropZoneProps extends React.HTMLAttributes<HTMLDivElement> {
  onFileSelect: (file: File) => void
  accept?: string
  maxSizeMB?: number
}

/**
 * DropZone — Vùng kéo thả upload ảnh.
 * Hỗ trợ drag & drop, click to select, preview ảnh (tạm thời không tích hợp crop ở đây).
 */
function DropZone({
  onFileSelect,
  accept = "image/jpeg, image/png, image/webp",
  maxSizeMB = 10,
  className,
  ...props
}: DropZoneProps) {
  const [isDragging, setIsDragging] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const validateFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Vui lòng chọn file hình ảnh (JPG, PNG, WebP).")
      return false
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File quá lớn. Vui lòng chọn file < ${maxSizeMB}MB.`)
      return false
    }
    setError(null)
    return true
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0]
      if (validateFile(file)) {
        onFileSelect(file)
      }
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      if (validateFile(file)) {
        onFileSelect(file)
      }
    }
  }

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-all duration-200",
        isDragging
          ? "border-primary bg-primary/5 scale-[1.01]"
          : "border-border bg-muted/30 hover:bg-muted/50 hover:border-primary/50",
        className
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          fileInputRef.current?.click()
        }
      }}
      aria-label="Kéo thả ảnh hoặc click để chọn"
      {...props}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleChange}
        accept={accept}
        className="hidden"
        aria-hidden="true"
      />
      
      <div className={cn(
        "rounded-full p-4 mb-4 transition-colors",
        isDragging ? "bg-primary/20 text-primary" : "bg-background shadow-sm text-muted-foreground"
      )}>
        <UploadCloud className="size-8" />
      </div>
      
      <h3 className="text-lg font-semibold mb-1">
        Kéo thả ảnh vào đây
      </h3>
      <p className="text-sm text-muted-foreground mb-6">
        hoặc click để chọn từ thiết bị (JPG, PNG, WebP &lt; {maxSizeMB}MB)
      </p>

      <Button variant={isDragging ? "brand" : "secondary"} className="pointer-events-none">
        Chọn tệp
      </Button>

      {error && (
        <div className="absolute bottom-4 left-0 right-0 flex justify-center animate-in-fast zoom-in-95">
          <div className="bg-destructive text-destructive-foreground text-xs font-medium px-3 py-1.5 rounded-md shadow-sm">
            {error}
          </div>
        </div>
      )}
    </div>
  )
}

export { DropZone }
