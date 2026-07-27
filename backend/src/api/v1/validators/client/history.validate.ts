import type { NextFunction, Request, Response } from 'express';
import type { ApiResponse } from '../../../../types/apiResponse.js';
import {
  searchHistoryQuerySchema,
  type SearchHistoryQuery,
} from '../shared/search-history-query.schema.js';

export type UserSearchHistoryQuery = SearchHistoryQuery;

export function validateUserSearchHistoryQuery(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const result = searchHistoryQuerySchema.safeParse(req.query);

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
