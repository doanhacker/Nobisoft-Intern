import { createFileRoute } from '@tanstack/react-router'
import { AdminImagesPage } from '@/pages/admin/AdminImagesPage'

export const Route = createFileRoute('/admin/images')({
  component: AdminImagesPage,
  validateSearch: (search: Record<string, unknown>): { fileFormat?: string; fromDate?: string; toDate?: string } => ({
    // `page` removed — infinite scroll manages page internally in AdminImagesPage
    fileFormat: (search.fileFormat as string) ?? '',
    fromDate: (search.fromDate as string) ?? '',
    toDate: (search.toDate as string) ?? '',
  }),
})
