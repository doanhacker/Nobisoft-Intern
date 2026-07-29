import { createFileRoute } from '@tanstack/react-router'
import { AdminImagesPage } from '@/pages/admin/AdminImagesPage'

export const Route = createFileRoute('/admin/images')({
  component: AdminImagesPage,
  validateSearch: (search: Record<string, unknown>): { fileFormat?: string; fromDate?: string; toDate?: string } => {
    const fileFormat = (search.fileFormat as string) ?? ''
    let fromDate = (search.fromDate as string) ?? ''
    let toDate = (search.toDate as string) ?? ''

    if (fromDate && toDate && fromDate >= toDate) {
      fromDate = ''
    }

    return { fileFormat, fromDate, toDate }
  },
})
