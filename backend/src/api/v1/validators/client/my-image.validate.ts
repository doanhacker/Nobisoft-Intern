import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { dateOnlySchema } from '../../../../utils/date.util.js';

export const myImageListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    fileFormat: z.enum(['jpg', 'png', 'webp']).optional(),
    fromDate: dateOnlySchema.optional(),
    toDate: dateOnlySchema.optional(),
  })
  .refine((data) => !data.fromDate || !data.toDate || data.fromDate <= data.toDate, {
    message: 'fromDate phải nhỏ hơn hoặc bằng toDate',
    path: ['toDate'],
  });

export type MyImageListQuery = z.infer<typeof myImageListQuerySchema>;

export function validateMyImageListQuery(req: Request, res: Response, next: NextFunction) {
  const result = myImageListQuerySchema.safeParse(req.query);

  if (!result.success) {
    const message = result.error.issues[0]?.message ?? 'Query params không hợp lệ';

    res.status(400).json({
      success: false,
      message,
    });
    return;
  }

  res.locals.query = result.data;
  next();
}
