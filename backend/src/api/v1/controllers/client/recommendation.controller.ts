import type { Request, Response } from 'express';
import type { ApiResponse } from '../../../../types/apiResponse.js';
import type { RecommendationData, RecommendationResponse } from '../../../../types/recommendation.type.js';
import {
  getRecommendations,
  InsufficientClicksError,
} from '../../services/recommendation.service.js';
import type { RecommendationQuery } from '../../validators/client/recommendation.validate.js';

export async function getImageRecommendations(req: Request, res: Response) {
  try {
    const { page, limit } = res.locals.recommendationQuery as RecommendationQuery;
    const result = await getRecommendations(req.user!.id, page, limit);

    const response: RecommendationResponse = {
      success: true,
      message: 'Gợi ý ảnh thành công',
      data: {
        results: result.results,
        clickCount: result.clickCount,
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
    console.error('Recommendation error:', error);

    if (error instanceof InsufficientClicksError) {
      const response: ApiResponse<RecommendationData> = {
        success: true,
        message: error.message,
        data: {
          results: [],
          clickCount: 0,
        },
        meta: {
          page: 1,
          limit: 20,
          totalDocs: 0,
          totalPages: 0,
        },
      };
      res.status(200).json(response);
      return;
    }

    const response: ApiResponse = {
      success: false,
      message: 'Gợi ý ảnh thất bại',
    };
    res.status(500).json(response);
  }
}
