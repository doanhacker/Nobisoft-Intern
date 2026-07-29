import { z } from 'zod';
import { dateOnlySchema } from '../../../../utils/date.util.js';

export const searchHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1, 'Trang phải lớn hơn hoặc bằng 1').default(1),
  limit: z.coerce
    .number()
    .int()
    .pipe(z.literal(20, 'Số lượng lịch sử mỗi trang chỉ được là 20'))
    .default(20),
  searchType: z.preprocess(
    (value) => value === '' ? undefined : value,
    z.enum(['IMAGE_ONLY', 'TEXT_SEMANTIC', 'TEXT_OCR']).optional(),
  ),
  fromDate: dateOnlySchema.optional(),
  toDate: dateOnlySchema.optional(),
}).refine(
  (data) => !data.fromDate || !data.toDate || data.fromDate <= data.toDate,
  {
    message: 'fromDate phải nhỏ hơn hoặc bằng toDate',
    path: ['toDate'],
  },
);

export type SearchHistoryQuery = z.infer<typeof searchHistoryQuerySchema>;
