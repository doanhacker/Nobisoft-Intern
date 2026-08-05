import type { Request, Response } from 'express';
import type { ApiResponse } from '../../../../types/apiResponse.js';
import type {
  BulkDeleteImagesApiResponse,
  ImageDetailApiResponse,
  ImageListApiResponse,
  RestoreImagesApiResponse,
  TrashImageListApiResponse,
} from '../../../../types/image.type.js';
import { createPaginationMeta } from '../../../../utils/pagination.util.js';
import type {
  ImageIdsBody,
  ImageListQuery,
  TrashImageListQuery,
} from '../../validators/admin/image.validate.js';
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

export async function listTrashImages(_req: Request, res: Response) {
  try {
    const query = res.locals.query as TrashImageListQuery;
    const { images, total } = await imageService.getDeletedImages(query);

    const response: TrashImageListApiResponse = {
      success: true,
      message: 'Lấy danh sách ảnh trong thùng rác thành công',
      data: images,
      meta: createPaginationMeta(query.page, query.limit, total),
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('List trash images error:', error);

    const response: ApiResponse = {
      success: false,
      message: 'Lấy danh sách ảnh trong thùng rác thất bại',
    };
    res.status(500).json(response);
  }
}

export async function bulkDeleteImages(_req: Request, res: Response) {
  try {
    const { imageIds } = res.locals.body as ImageIdsBody;
    const result = await imageService.softDeleteImages(imageIds);

    const response: BulkDeleteImagesApiResponse = {
      success: true,
      message: `Đã chuyển ${result.deleted} ảnh vào thùng rác`,
      data: result,
    };
    res.status(200).json(response);
  } catch (error) {
    console.error('Bulk delete images error:', error);

    const response: ApiResponse = {
      success: false,
      message: 'Xóa nhiều ảnh thất bại',
    };
    res.status(500).json(response);
  }
}

export async function restoreImages(_req: Request, res: Response) {
  try {
    const { imageIds } = res.locals.body as ImageIdsBody;
    const result = await imageService.restoreImages(imageIds);

    const response: RestoreImagesApiResponse = {
      success: true,
      message: `Đã khôi phục ${result.restored} ảnh`,
      data: result,
    };
    res.status(200).json(response);
  } catch (error) {
    console.error('Restore images error:', error);

    const response: ApiResponse = {
      success: false,
      message: 'Khôi phục ảnh thất bại',
    };
    res.status(500).json(response);
  }
}
