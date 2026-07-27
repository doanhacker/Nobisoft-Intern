import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

export const myImageListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  fileFormat: z.enum(['jpg', 'png', 'webp']).optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
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
