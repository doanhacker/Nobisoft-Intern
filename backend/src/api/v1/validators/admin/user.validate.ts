import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

export const userListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional()
});

export const searchHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  searchType: z.enum(['IMAGE_ONLY', 'TEXT_SEMANTIC', 'TEXT_OCR']).optional(),
});

export const userIdParamSchema = z.object({
  userId: z.string().uuid('userId không hợp lệ'),
});

export type UserListQuery = z.infer<typeof userListQuerySchema>;
export type SearchHistoryQuery = z.infer<typeof searchHistoryQuerySchema>;
export type UserIdParam = z.infer<typeof userIdParamSchema>;

export function validateUserListQuery(req: Request, res: Response, next: NextFunction) {
  const result = userListQuerySchema.safeParse(req.query);

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

export function validateSearchHistoryQuery(req: Request, res: Response, next: NextFunction) {
  const paramsResult = userIdParamSchema.safeParse(req.params);

  if (!paramsResult.success) {
    const message = paramsResult.error.issues[0]?.message ?? 'Query params không hợp lệ';

    res.status(400).json({
      success: false,
      message,
    });
    return;
  }

  const queryResult = searchHistoryQuerySchema.safeParse(req.query);

  if (!queryResult.success) {
    const message = queryResult.error.issues[0]?.message ?? 'Query params không hợp lệ';

    res.status(400).json({
      success: false,
      message,
    });
    return;
  }

  res.locals.query = queryResult.data;
  next();
}
