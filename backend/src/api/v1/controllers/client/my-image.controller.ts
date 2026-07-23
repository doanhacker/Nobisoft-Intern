import type { Request, Response } from 'express';
import type { ApiResponse } from '../../../../types/apiResponse.js';
import type { MyImageListApiResponse } from '../../../../types/image.type.js';
import type { MyImageListQuery } from '../../validators/client/my-image.validate.js';
import * as imageService from '../../services/image.service.js';

export async function listMyImages(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const query = res.locals.query as MyImageListQuery;
    const { images, total } = await imageService.getUserImages(userId, query);

    const response: MyImageListApiResponse = {
      success: true,
      message: 'Lấy danh sách ảnh thành công',
      data: images,
      meta: {
        page: query.page,
        limit: query.limit,
        totalDocs: total,
        totalPages: Math.ceil(total / query.limit),
      },
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('List my images error:', error);

    const response: ApiResponse = {
      success: false,
      message: 'Lấy danh sách ảnh thất bại',
    };
    res.status(500).json(response);
  }
}

export async function removeMyImage(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const result = await imageService.deleteUserImage(userId, id as string);

    if (!result.found) {
      const response: ApiResponse = {
        success: false,
        message: 'Ảnh không tồn tại',
      };
      res.status(404).json(response);
      return;
    }

    if (!result.owned) {
      const response: ApiResponse = {
        success: false,
        message: 'Bạn không có quyền xoá ảnh này',
      };
      res.status(403).json(response);
      return;
    }

    const response: ApiResponse = {
      success: true,
      message: 'Xoá ảnh thành công',
      data: null,
    };
    res.status(200).json(response);
  } catch (error) {
    console.error('Delete my image error:', error);

    const response: ApiResponse = {
      success: false,
      message: 'Xoá ảnh thất bại',
    };
    res.status(500).json(response);
  }
}
