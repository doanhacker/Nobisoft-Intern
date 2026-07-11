import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

export const imageListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  fileFormat: z.enum(['jpg', 'png', 'webp']).optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
});

export const imageIdParamSchema = z.object({
  id: z.string().uuid('Image ID không hợp lệ'),
});

export type ImageListQuery = z.infer<typeof imageListQuerySchema>;

export function validateImageListQuery(req: Request, res: Response, next: NextFunction) {
  const result = imageListQuerySchema.safeParse(req.query);

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

export function validateImageIdParam(req: Request, res: Response, next: NextFunction) {
  const result = imageIdParamSchema.safeParse(req.params);

  if (!result.success) {
    const message = result.error.issues[0]?.message ?? 'Params không hợp lệ';

    res.status(400).json({
      success: false,
      message,
    });
    return;
  }

  next();
}
