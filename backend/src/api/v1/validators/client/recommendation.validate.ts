import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import type { ApiResponse } from '../../../../types/apiResponse.js';

const recommendationQuerySchema = z.object({
  page: z.coerce.number().int().min(1, 'Trang phải lớn hơn hoặc bằng 1').default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1, 'Số lượng kết quả phải lớn hơn 0')
    .max(100, 'Số lượng kết quả tối đa là 100')
    .default(20),
});

export type RecommendationQuery = z.infer<typeof recommendationQuerySchema>;

export function validateRecommendationQuery(req: Request, res: Response, next: NextFunction) {
  const result = recommendationQuerySchema.safeParse(req.query);

  if (!result.success) {
    const response: ApiResponse = {
      success: false,
      message: result.error.issues[0]?.message ?? 'Tham số không hợp lệ',
    };
    res.status(400).json(response);
    return;
  }

  res.locals.recommendationQuery = result.data;
  next();
}
