import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { Trash2, AlertTriangle, Loader2, X } from 'lucide-react'

// ============================================================
// DeleteConfirmModal — Shared centered modal for delete confirmation
//
// Rendered via ReactDOM.createPortal into document.body so it always
// appears centered in the viewport regardless of where the triggering
// component sits in the DOM tree.
//
// Usage:
//   {showConfirm && (
//     <DeleteConfirmModal
//       imageTitle="filename.jpg"
//       isDeleting={isDeleting}
//       onConfirm={handleConfirm}
//       onCancel={() => setShowConfirm(false)}
//     />
//   )}
// ============================================================

export interface DeleteConfirmModalProps {
    imageTitle?: string
    /** Optional subtitle / extra context line shown below the title */
    description?: string
    isDeleting: boolean
    onConfirm: () => void
    onCancel: () => void
    /** Override the confirm button label (default: "Xoá ảnh") */
    confirmLabel?: string
}

export function DeleteConfirmModal({
    imageTitle,
    description,
    isDeleting,
    onConfirm,
    onCancel,
    confirmLabel = 'Xoá ảnh',
}: DeleteConfirmModalProps) {
    // Close on Escape
    React.useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !isDeleting) onCancel()
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [isDeleting, onCancel])

    return ReactDOM.createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{ animation: 'fade-in 0.15s ease both' }}
            role="dialog"
            aria-modal="true"
            aria-label="Xác nhận xoá ảnh"
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={!isDeleting ? onCancel : undefined}
            />

            {/* Modal panel */}
            <div
                className="relative z-10 w-full max-w-sm bg-card border border-border/60 rounded-2xl shadow-2xl p-6 flex flex-col gap-5"
                style={{ animation: 'scale-in-spring 0.3s cubic-bezier(0.34,1.56,0.64,1) both' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close button */}
                <button
                    className="absolute top-3 right-3 flex items-center justify-center size-7 rounded-lg bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    onClick={onCancel}
                    disabled={isDeleting}
                    aria-label="Đóng"
                >
                    <X className="size-4" />
                </button>

                {/* Icon + title */}
                <div className="flex flex-col items-center gap-3 text-center">
                    <div className="flex items-center justify-center size-14 rounded-2xl bg-destructive/10 border border-destructive/20">
                        <Trash2 className="size-6 text-destructive" />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-foreground">Xoá ảnh này?</h3>
                        {imageTitle && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2 break-all">
                                {imageTitle}
                            </p>
                        )}
                    </div>
                    <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-amber-500/5 border border-amber-500/20 text-left w-full">
                        <AlertTriangle className="size-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            {description ?? (
                                <>
                                    Ảnh sẽ được chuyển vào{' '}
                                    <strong className="text-foreground">Thùng rác</strong>{' '}
                                    và có thể khôi phục sau.
                                </>
                            )}
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isDeleting}
                        className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-muted/80 hover:bg-muted text-foreground border border-border/60 transition-all duration-150 disabled:opacity-50"
                    >
                        Huỷ bỏ
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isDeleting}
                        className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold bg-destructive hover:bg-destructive/90 text-destructive-foreground border border-destructive/60 transition-all duration-150 disabled:opacity-50 shadow-sm"
                    >
                        {isDeleting ? (
                            <><Loader2 className="size-4 animate-spin" />Đang xoá...</>
                        ) : (
                            <><Trash2 className="size-4" />{confirmLabel}</>
                        )}
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    )
}
