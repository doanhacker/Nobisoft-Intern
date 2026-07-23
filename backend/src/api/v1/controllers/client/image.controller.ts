import type { Request, Response } from 'express';
import type { ApiResponse } from '../../../../types/apiResponse.js';
import type { ImageListApiResponse, ImageDetailApiResponse } from '../../../../types/image.type.js';
import { createPaginationMeta } from '../../../../utils/pagination.util.js';
import type { ImageListQuery } from '../../validators/client/image.validate.js';
import * as imageService from '../../services/image.service.js';

export async function listImages(req: Request, res: Response) {
  try {
    const query = res.locals.query as ImageListQuery;
    const { images, total } = await imageService.getIndexedImages(query);

    const response: ImageListApiResponse = {
      success: true,
      message: 'Lấy danh sách ảnh thành công',
      data: images,
      meta: createPaginationMeta(query.page, query.limit, total),
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('List images error:', error);

    const response: ApiResponse = {
      success: false,
      message: 'Lấy danh sách ảnh thất bại',
    };
    res.status(500).json(response);
  }
}

export async function getImage(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const image = await imageService.getImageDetail(id as string);

    if (!image) {
      const response: ApiResponse = {
        success: false,
        message: 'Ảnh không tồn tại',
      };
      res.status(404).json(response);
      return;
    }

    const response: ImageDetailApiResponse = {
      success: true,
      message: 'Lấy chi tiết ảnh thành công',
      data: image,
    };
    res.status(200).json(response);
  } catch (error) {
    console.error('Get image error:', error);

    const response: ApiResponse = {
      success: false,
      message: 'Lấy chi tiết ảnh thất bại',
    };
    res.status(500).json(response);
  }
}

export async function removeImage(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const deleted = await imageService.deleteImage(id as string);

    if (!deleted) {
      const response: ApiResponse = {
        success: false,
        message: 'Ảnh không tồn tại',
      };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse = {
      success: true,
      message: 'Xoá ảnh thành công',
      data: null,
    };
    res.status(200).json(response);
  } catch (error) {
    console.error('Delete image error:', error);

    const response: ApiResponse = {
      success: false,
      message: 'Xoá ảnh thất bại',
    };
    res.status(500).json(response);
  }
}
