import type { Request, Response } from 'express';
import type { ApiResponse } from '../../../../types/apiResponse.js';
import type { UserSearchHistoryApiResponse } from '../../../../types/history.type.js';
import {
  getUserSearchHistory,
  HistoryPageOutOfRangeError,
  SearchHistoryUserNotFoundError,
} from '../../services/history.service.js';
import type { UserSearchHistoryQuery } from '../../validators/client/history.validate.js';

export async function getHistory(req: Request, res: Response) {
  try {
    const query = res.locals.userSearchHistoryQuery as UserSearchHistoryQuery;
    const result = await getUserSearchHistory(req.user!.id, query);

    const response: UserSearchHistoryApiResponse = {
      success: true,
      message: 'Lấy lịch sử tìm kiếm thành công',
      data: result.data,
      meta: {
        page: query.page,
        limit: query.limit,
        totalDocs: result.total,
        totalPages: Math.ceil(result.total / query.limit),
      },
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Get user search history error:', error);

    if (error instanceof HistoryPageOutOfRangeError) {
      const response: ApiResponse = {
        success: false,
        message: error.message,
      };
      res.status(400).json(response);
      return;
    }

    if (error instanceof SearchHistoryUserNotFoundError) {
      const response: ApiResponse = {
        success: false,
        message: error.message,
      };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse = {
      success: false,
      message: 'Lấy lịch sử tìm kiếm thất bại',
    };
    res.status(500).json(response);
  }
}
