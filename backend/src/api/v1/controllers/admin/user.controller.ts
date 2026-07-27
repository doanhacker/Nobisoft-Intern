import type { Request, Response } from 'express';
import type { ApiResponse } from '../../../../types/apiResponse.js';
import type { UserListApiResponse } from '../../../../types/user.type.js';
import type { UserSearchHistoryApiResponse } from '../../../../types/history.type.js';
import type { UserListQuery, SearchHistoryQuery } from '../../validators/admin/user.validate.js';
import { getUserList } from '../../services/user.service.js';
import {
  getUserSearchHistory as getHistoryByUser,
  HistoryPageOutOfRangeError,
  SearchHistoryUserNotFoundError,
} from '../../services/history.service.js';
import { createPaginationMeta } from '../../../../utils/pagination.util.js';

export async function getUsers(req: Request, res: Response) {
  try {
    const query = res.locals.query as UserListQuery;
    const result = await getUserList(query);

    if (!result.success) {
      const response: ApiResponse = {
        success: false,
        message: result.message,
      };

      res.status(400).json(response);
      return;
    }

    const { data, total } = result;
    const { page, limit } = query;

    const response: UserListApiResponse = {
      success: true,
      message: 'Lấy danh sách người dùng thành công',
      data,
      meta: createPaginationMeta(page, limit, total),
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Get users error:', error);

    const response: ApiResponse = {
      success: false,
      message: 'Lấy danh sách người dùng thất bại',
    };

    res.status(500).json(response);
  }
}

export async function getSearchHistory(req: Request, res: Response) {
  try {
    const userId = req.params.userId as string;
    const query = res.locals.query as SearchHistoryQuery;
    const result = await getHistoryByUser(userId, query);

    const response: UserSearchHistoryApiResponse = {
      success: true,
      message: 'Lấy lịch sử tìm kiếm thành công',
      data: result.data,
      meta: createPaginationMeta(query.page, query.limit, result.total),
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Get search history error:', error);

    if (error instanceof SearchHistoryUserNotFoundError) {
      const response: ApiResponse = {
        success: false,
        message: error.message,
      };
      res.status(404).json(response);
      return;
    }

    if (error instanceof HistoryPageOutOfRangeError) {
      const response: ApiResponse = {
        success: false,
        message: error.message,
      };
      res.status(400).json(response);
      return;
    }

    const response: ApiResponse = {
      success: false,
      message: 'Lấy lịch sử tìm kiếm thất bại',
    };

    res.status(500).json(response);
  }
}
