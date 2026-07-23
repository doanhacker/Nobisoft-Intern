import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import type { ApiResponse } from '../../../../types/apiResponse.js';

const userSearchHistoryQuerySchema = z.object({
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
  fromDate: z.coerce.date('fromDate không hợp lệ').optional(),
  toDate: z.coerce.date('toDate không hợp lệ').optional(),
}).refine(
  (data) => !data.fromDate || !data.toDate || data.fromDate <= data.toDate,
  {
    message: 'fromDate phải nhỏ hơn hoặc bằng toDate',
    path: ['toDate'],
  },
);

export type UserSearchHistoryQuery = z.infer<typeof userSearchHistoryQuerySchema>;

export function validateUserSearchHistoryQuery(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const result = userSearchHistoryQuerySchema.safeParse(req.query);

  if (!result.success) {
    const response: ApiResponse = {
      success: false,
      message: result.error.issues[0]?.message ?? 'Tham số lịch sử tìm kiếm không hợp lệ',
    };
    res.status(400).json(response);
    return;
  }

  res.locals.userSearchHistoryQuery = result.data;
  next();
}
