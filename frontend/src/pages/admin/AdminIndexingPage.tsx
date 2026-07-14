import * as React from 'react'
import { useCallback, useState } from 'react'
import { UploadCloud, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { batchIndexImages } from '@/services/adminIndexingService'
import type { IndexingResult } from '@/types/admin'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'

// ============================================================
// Constants
// ============================================================

const MAX_FILES = 20
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

// ============================================================
// Helpers
// ============================================================

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ============================================================
// IndexingUploadZone
// ============================================================

interface IndexingUploadZoneProps {
  onFilesSelected: (files: File[]) => void
  disabled: boolean
}

function IndexingUploadZone({ onFilesSelected, disabled }: IndexingUploadZoneProps) {
  const [isDragActive, setIsDragActive] = useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const toast = useToast()

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) setIsDragActive(true)
  }, [disabled])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) setIsDragActive(true)
  }, [disabled])

  const validateAndFilterFiles = (files: File[]): File[] => {
    const validFiles: File[] = []
    let hasError = false

    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error(`File ${file.name} không đúng định dạng`)
        hasError = true
        continue
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`File ${file.name} vượt quá 10MB`)
        hasError = true
        continue
      }
      validFiles.push(file)
    }

    if (hasError) {
       // Allow valid files to pass through even if some failed
    }

    return validFiles
  }

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragActive(false)

      if (disabled) return

      const droppedFiles = Array.from(e.dataTransfer.files)
      const validFiles = validateAndFilterFiles(droppedFiles)
      
      if (validFiles.length > 0) {
        onFilesSelected(validFiles)
      }
    },
    [onFilesSelected, disabled, toast],
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        const selectedFiles = Array.from(e.target.files)
        const validFiles = validateAndFilterFiles(selectedFiles)
        
        if (validFiles.length > 0) {
          onFilesSelected(validFiles)
        }
      }
      // Reset input so the same files can be selected again if removed
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    },
    [onFilesSelected, toast],
  )

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={() => !disabled && fileInputRef.current?.click()}
      className={cn(
        'relative flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-2xl transition-all duration-200 cursor-pointer text-center',
        disabled && 'opacity-50 cursor-not-allowed border-border/50 bg-muted/20',
        !disabled && isDragActive && 'border-primary bg-primary/5 scale-[1.02]',
        !disabled && !isDragActive && 'border-border hover:border-primary/50 hover:bg-muted/30',
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ALLOWED_TYPES.join(',')}
        onChange={handleFileInput}
        className="hidden"
        disabled={disabled}
      />
      
      <div className={cn(
        "flex items-center justify-center size-14 rounded-full mb-4",
        isDragActive ? "bg-primary/20 text-primary" : "bg-muted/50 text-muted-foreground"
      )}>
        <UploadCloud className="size-7" />
      </div>
      
      <p className="font-semibold text-foreground mb-1">
        Kéo thả ảnh vào đây hoặc click để tải lên
      </p>
      <p className="text-sm text-muted-foreground">
        Hỗ trợ JPG, PNG, WebP. Tối đa {MAX_FILES} file, mỗi file &lt; 10MB
      </p>
    </div>
  )
}

// ============================================================
// IndexingResultList
// ============================================================

interface IndexingResultListProps {
  results: IndexingResult[]
}

function IndexingResultList({ results }: IndexingResultListProps) {
  if (results.length === 0) return null

  const successCount = results.filter(r => r.success).length
  const failCount = results.length - successCount

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-foreground flex items-center gap-2">
          Kết quả Indexing
        </h3>
        <div className="flex gap-2">
          <Badge variant="outline" className="border-green-500/30 text-green-600 bg-green-50">
            {successCount} thành công
          </Badge>
          {failCount > 0 && (
            <Badge variant="outline" className="border-red-500/30 text-red-600 bg-red-50">
              {failCount} thất bại
            </Badge>
          )}
        </div>
      </div>

      <div className="bg-card border border-border/60 rounded-xl overflow-hidden divide-y divide-border/40">
        {results.map((result, idx) => (
          <div key={idx} className="flex items-center gap-3 p-3 text-sm">
            {result.success ? (
              <CheckCircle2 className="size-4 text-green-500 shrink-0" />
            ) : (
              <AlertCircle className="size-4 text-destructive shrink-0" />
            )}
            
            <span className="font-medium text-foreground truncate flex-1" title={result.filename}>
              {result.filename}
            </span>

            {result.success ? (
              <span className="text-xs text-muted-foreground font-mono truncate max-w-[120px]" title={result.imageId}>
                ID: {result.imageId}
              </span>
            ) : (
              <span className="text-xs text-destructive truncate max-w-[200px]" title={result.error}>
                {result.error || 'Lỗi không xác định'}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// AdminIndexingPage
// ============================================================

export function AdminIndexingPage() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [results, setResults] = useState<IndexingResult[]>([])
  const toast = useToast()

  const handleFilesSelected = (newFiles: File[]) => {
    // Reset previous results when selecting new files
    if (results.length > 0) {
      setResults([])
    }

    setSelectedFiles((prev) => {
      const combined = [...prev, ...newFiles]
      // Deduplicate by name and size to prevent accidental double-selects
      const unique = combined.filter((v, i, a) => 
        a.findIndex(t => (t.name === v.name && t.size === v.size)) === i
      )
      
      if (unique.length > MAX_FILES) {
        toast.warning(`Chỉ hỗ trợ tối đa ${MAX_FILES} file. Đã cắt bớt file thừa.`)
        return unique.slice(0, MAX_FILES)
      }
      return unique
    })
  }

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return

    setIsUploading(true)
    setUploadProgress(0)
    setResults([])

    try {
      const response = await batchIndexImages(selectedFiles, (percent) => {
        setUploadProgress(percent)
      })
      
      setResults(response.data || [])
      
      const successCount = response.data?.filter(r => r.success).length || 0
      const failCount = response.data?.filter(r => !r.success).length || 0
      
      if (failCount === 0) {
        toast.success('Tất cả file đã được index thành công')
      } else if (successCount === 0) {
        toast.error('Tất cả file đều index thất bại')
      } else {
        toast.warning(`Index hoàn tất với ${failCount} file lỗi`)
      }
      
      // Clear selected files on successful upload start so we show results
      setSelectedFiles([])
    } catch (error: any) {
      console.error('Batch index error:', error)
      toast.error(error?.response?.data?.message || 'Có lỗi xảy ra khi upload')
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
          <UploadCloud className="size-6 text-primary" />
          Batch Indexing
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Tải lên nhiều ảnh để thêm vào hệ thống tìm kiếm (trích xuất vector & OCR).
        </p>
      </div>

      {/* Upload Zone */}
      <IndexingUploadZone onFilesSelected={handleFilesSelected} disabled={isUploading} />

      {/* Selected Files Preview */}
      {selectedFiles.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-foreground">
              Đã chọn {selectedFiles.length} file
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedFiles([])}
              disabled={isUploading}
              className="text-muted-foreground hover:text-destructive"
            >
              Xoá tất cả
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {selectedFiles.map((file, idx) => (
              <div
                key={`${file.name}-${idx}`}
                className="group relative flex items-center gap-3 p-2 rounded-xl border border-border/60 bg-card hover:border-primary/40 transition-colors"
              >
                <div className="size-10 rounded-lg overflow-hidden bg-muted/50 shrink-0">
                  <img
                    src={URL.createObjectURL(file)}
                    alt="preview"
                    className="size-full object-cover"
                    onLoad={(e) => URL.revokeObjectURL((e.target as HTMLImageElement).src)}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate" title={file.name}>
                    {file.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatBytes(file.size)}
                  </p>
                </div>
                <button
                  onClick={() => handleRemoveFile(idx)}
                  disabled={isUploading}
                  className="absolute -top-1.5 -right-1.5 flex items-center justify-center size-5 rounded-full bg-muted/80 hover:bg-destructive text-muted-foreground hover:text-white transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-0"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
          </div>

          {/* Action */}
          <div className="flex flex-col items-end gap-2 pt-4">
            <Button
              variant="brand"
              onClick={handleUpload}
              disabled={isUploading}
              className="w-full sm:w-auto min-w-[200px]"
            >
              {isUploading ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  {uploadProgress < 100 ? `Đang tải lên (${uploadProgress}%)` : 'Đang trích xuất dữ liệu...'}
                </>
              ) : (
                'Bắt đầu Index'
              )}
            </Button>
            
            {/* Progress bar container */}
            {isUploading && (
              <div className="w-full sm:w-auto sm:min-w-[200px] h-1.5 bg-muted rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full bg-primary transition-all duration-300 ease-out",
                    uploadProgress === 100 && "animate-pulse"
                  )}
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && <IndexingResultList results={results} />}
    </div>
  )
}
