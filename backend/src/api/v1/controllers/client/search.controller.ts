import type { Request, Response } from 'express';
import type { ApiResponse } from '../../../../types/apiResponse.js';
import type { SearchImageResponse } from '../../../../types/search.type.js';
import { searchImagesByImage } from '../../services/search.service.js';
import type { SearchImageQuery } from '../../validators/client/search.validate.js';

export async function searchByImage(req: Request, res: Response) {
  try {
    const file = req.file;
    const { page, limit } = req.body as SearchImageQuery;

    if (!file) {
      const response: ApiResponse = {
        success: false,
        message: 'Vui lòng chọn một ảnh để tìm kiếm',
      };
      res.status(400).json(response);
      return;
    }

    const result = await searchImagesByImage({
      buffer: file.buffer,
      originalname: file.originalname,
      mimetype: file.mimetype,
      page,
      limit,
    });

    const response: SearchImageResponse = {
      success: true,
      data: {
        searchType: 'IMAGE_ONLY',
        results: result.results,
        total: result.total,
        page: result.page,
        limit: result.limit,
      },
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Search by image error:', error);

    const response: ApiResponse = {
      success: false,
      message: 'Tìm kiếm hình ảnh thất bại',
    };
    res.status(500).json(response);
  }
}
