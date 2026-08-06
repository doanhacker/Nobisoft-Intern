import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { MAX_BULK_IMAGE_IDS } from '../../../../config/image-operation.js';
import { dateOnlySchema } from '../../../../utils/date.util.js';

export const imageListQuerySchema = z
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

export type ImageListQuery = z.infer<typeof imageListQuerySchema>;

export const trashImageListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type TrashImageListQuery = z.infer<typeof trashImageListQuerySchema>;

export const imageIdsBodySchema = z.object({
  imageIds: z
    .array(z.string().uuid('Image ID không hợp lệ'))
    .min(1, 'Phải chọn ít nhất một ảnh')
    .max(MAX_BULK_IMAGE_IDS, `Chỉ được chọn tối đa ${MAX_BULK_IMAGE_IDS} ảnh`)
    .transform((imageIds) => [...new Set(imageIds)]),
});

export type ImageIdsBody = z.infer<typeof imageIdsBodySchema>;

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

export function validateTrashImageListQuery(req: Request, res: Response, next: NextFunction) {
  const result = trashImageListQuerySchema.safeParse(req.query);

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

export function validateImageIdsBody(req: Request, res: Response, next: NextFunction) {
  const result = imageIdsBodySchema.safeParse(req.body);

  if (!result.success) {
    const message = result.error.issues[0]?.message ?? 'Danh sách ảnh không hợp lệ';

    res.status(400).json({
      success: false,
      message,
    });
    return;
  }

  res.locals.body = result.data;
  next();
}
