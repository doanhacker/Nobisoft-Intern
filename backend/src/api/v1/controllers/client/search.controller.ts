import type { Request, Response } from 'express';
import type { ApiResponse } from '../../../../types/apiResponse.js';
import type { SearchClickData, SearchImageResponse } from '../../../../types/search.type.js';
import { saveSearchClick } from '../../services/search-history.service.js';
import {
  ImageSearchHistoryNotFoundError,
  SearchPageOutOfRangeError,
  searchImagesByImage,
} from '../../services/search.service.js';
import type {
  SearchClickBody,
  SearchImageQuery,
} from '../../validators/client/search.validate.js';

export async function searchByImage(req: Request, res: Response) {
  try {
    const file = req.file;
    const { page, limit, searchHistoryId } = req.body as SearchImageQuery;
    const result = file
      ? await searchImagesByImage({
          userId: req.user!.id,
          image: {
            buffer: file.buffer,
            originalname: file.originalname,
            mimetype: file.mimetype,
          },
          page,
          limit,
        })
      : await searchImagesByImage({
          userId: req.user!.id,
          searchHistoryId: searchHistoryId!,
          page,
          limit,
        });

    const response: SearchImageResponse = {
      success: true,
      message: 'Tìm kiếm hình ảnh thành công',
      data: {
        searchHistoryId: result.searchHistoryId,
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

    if (error instanceof ImageSearchHistoryNotFoundError) {
      const response: ApiResponse = {
        success: false,
        message: error.message,
      };
      res.status(404).json(response);
      return;
    }

    if (error instanceof SearchPageOutOfRangeError) {
      const response: ApiResponse = {
        success: false,
        message: error.message,
      };
      res.status(400).json(response);
      return;
    }

    const response: ApiResponse = {
      success: false,
      message: 'Tìm kiếm hình ảnh thất bại',
    };
    res.status(500).json(response);
  }
}

export async function recordSearchClick(req: Request, res: Response) {
  try {
    const { searchHistoryId, clickedImageId } = req.body as SearchClickBody;
    const result = await saveSearchClick({
      userId: req.user!.id,
      searchHistoryId,
      clickedImageId,
    });

    if (!result.success) {
      const response: ApiResponse = {
        success: false,
        message: result.message,
      };
      res.status(result.statusCode).json(response);
      return;
    }

    const response: ApiResponse<SearchClickData> = {
      success: true,
      message: 'Đã lưu lượt click',
      data: result.data,
    };
    res.status(201).json(response);
  } catch (error) {
    console.error('Save search click error:', error);

    const response: ApiResponse = {
      success: false,
      message: 'Lưu lượt click thất bại',
    };
    res.status(500).json(response);
  }
}
