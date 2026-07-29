import { createFileRoute } from '@tanstack/react-router'
import { requireAuth } from '@/lib/authGuard'
import { ResultsPage } from '@/pages/ResultsPage'
import { z } from 'zod'

// ── Query params schema ───────────────────────────────────────
const resultsSearchSchema = z.object({
  mode: z.enum(['image', 'semantic', 'ocr']).catch('semantic'),
  q: z.string().optional().default(''),
  query_id: z.string().optional(),
  // `page` is removed — infinite scroll manages page internally in ResultsPage
  // Modal open state — imageId present = modal open
  imageId: z.string().optional(),
})

export const Route = createFileRoute('/results')({
  beforeLoad: requireAuth,
  validateSearch: resultsSearchSchema,
  component: ResultsPage,
})
