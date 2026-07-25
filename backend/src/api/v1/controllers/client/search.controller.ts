import type { Request, Response } from 'express';
import type { ApiResponse } from '../../../../types/apiResponse.js';
import type {
  SearchClickData,
  SearchImageResponse,
  SearchTextOcrResponse,
  SearchTextOcrResult,
  SearchTextSemanticResponse,
} from '../../../../types/search.type.js';
import { saveSearchClick } from '../../services/search-history.service.js';
import {
  ImageSearchHistoryNotFoundError,
  OcrSearchHistoryNotFoundError,
  SearchPageOutOfRangeError,
  searchImagesByImage,
  searchImagesByTextOcr,
  searchImagesByTextSemantic,
  TextSearchHistoryNotFoundError,
} from '../../services/search.service.js';
import type {
  SearchClickBody,
  SearchImageQuery,
  SearchTextOcrQuery,
  SearchTextSemanticQuery,
} from '../../validators/client/search.validate.js';
import { formatSearchResultsForRole } from '../../../../utils/search-response.util.js';

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
        results: formatSearchResultsForRole(result.results, req.user!.role),
      },
      meta: {
        page: result.page,
        limit: result.limit,
        totalDocs: result.total,
        totalPages: Math.ceil(result.total / result.limit),
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

// Semantic Search

export async function searchByTextSemantic(req: Request, res: Response) {
  try {
    const { q, searchHistoryId, page, limit } = res.locals
      .searchTextSemanticQuery as SearchTextSemanticQuery;
    const result = q
      ? await searchImagesByTextSemantic({
        userId: req.user!.id,
        queryText: q,
        page,
        limit,
      })
      : await searchImagesByTextSemantic({
        userId: req.user!.id,
        searchHistoryId: searchHistoryId!,
        page,
        limit,
      });

    sendSemanticSearchResponse(res, result, req.user!.role);
  } catch (error) {
    handleSemanticSearchError(error, res);
  }
}

function sendSemanticSearchResponse(
  res: Response,
  result: Awaited<ReturnType<typeof searchImagesByTextSemantic>>,
  role: NonNullable<Request['user']>['role'],
) {
  const response: SearchTextSemanticResponse = {
    success: true,
    message: 'Tìm kiếm semantic thành công',
    data: {
      searchHistoryId: result.searchHistoryId,
      searchType: 'TEXT_SEMANTIC',
      results: formatSearchResultsForRole(result.results, role),
    },
    meta: {
      page: result.page,
      limit: result.limit,
      totalDocs: result.total,
      totalPages: Math.ceil(result.total / result.limit),
    },
  };

  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json(response);
}

function handleSemanticSearchError(error: unknown, res: Response) {
  console.error('Semantic search error:', error);

  if (error instanceof TextSearchHistoryNotFoundError) {
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
    message: 'Tìm kiếm semantic thất bại',
  };
  res.status(500).json(response);
}

// OCR Search

export async function searchByTextOcr(req: Request, res: Response) {
  try {
    const { q, searchHistoryId, page, limit } = res.locals
      .searchTextOcrQuery as SearchTextOcrQuery;
    const result = q
      ? await searchImagesByTextOcr({
        userId: req.user!.id,
        queryText: q,
        page,
        limit,
      })
      : await searchImagesByTextOcr({
        userId: req.user!.id,
        searchHistoryId: searchHistoryId!,
        page,
        limit,
      });

    sendOcrSearchResponse(res, result, page, limit);
  } catch (error) {
    handleOcrSearchError(error, res);
  }
}

function sendOcrSearchResponse(
  res: Response,
  result: SearchTextOcrResult,
  page: number,
  limit: number,
) {
  const response: SearchTextOcrResponse = {
    success: true,
    message: 'Tìm kiếm OCR thành công',
    data: {
      searchHistoryId: result.searchHistoryId,
      searchType: 'TEXT_OCR',
      results: result.results,
    },
    meta: {
      page,
      limit,
      totalDocs: result.total,
      totalPages: Math.ceil(result.total / limit),
    },
  };

  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json(response);
}

function handleOcrSearchError(error: unknown, res: Response) {
  console.error('OCR search error:', error);

  if (error instanceof OcrSearchHistoryNotFoundError) {
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
    message: 'Tìm kiếm OCR thất bại',
  };
  res.status(500).json(response);
}

// Search Click

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
