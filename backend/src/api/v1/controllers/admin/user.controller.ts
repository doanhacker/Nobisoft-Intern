import type { Request, Response } from 'express';
import type { ApiResponse } from '../../../../types/apiResponse.js';
import type { UserListApiResponse, SearchHistoryListApiResponse } from '../../../../types/user.type.js';
import type { UserListQuery, SearchHistoryQuery } from '../../validators/admin/user.validate.js';
import { getUserList, getUserSearchHistory } from '../../services/user.service.js';

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
      meta: {
        page,
        limit,
        totalDocs: total,
        totalPages: Math.ceil(total / limit),
      },
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
    const result = await getUserSearchHistory(userId, query);

    if (!result.success) {
      const response: ApiResponse = {
        success: false,
        message: result.message,
      };

      res.status(404).json(response);
      return;
    }

    const { data, total } = result;
    const { page, limit } = query;

    const response: SearchHistoryListApiResponse = {
      success: true,
      message: 'Lấy lịch sử tìm kiếm thành công',
      data,
      meta: {
        page,
        limit,
        totalDocs: total,
        totalPages: Math.ceil(total / limit),
      },
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Get search history error:', error);

    const response: ApiResponse = {
      success: false,
      message: 'Lấy lịch sử tìm kiếm thất bại',
    };

    res.status(500).json(response);
  }
}
