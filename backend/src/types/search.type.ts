interface SearchImageBaseInput {
  userId: string;
  page: number;
  limit: number;
}

export type SearchImageInput =
  | (SearchImageBaseInput & {
      image: {
        buffer: Buffer;
        originalname: string;
        mimetype: string;
      };
    })
  | (SearchImageBaseInput & {
      searchHistoryId: string;
    });

export interface SearchImageResultItem {
  id: string;
  imageUrl: string;
  width: number;
  height: number;
  fileSize: number;
  fileFormat: string;
  similarityScore: number;
  createdAt: Date;
}

export interface SearchImageResult {
  searchHistoryId: string;
  results: SearchImageResultItem[];
  total: number;
  page: number;
  limit: number;
}

export interface SearchImageData {
  searchHistoryId: string;
  searchType: 'IMAGE_ONLY';
  results: SearchImageResultItem[];
  total: number;
  page: number;
  limit: number;
}

export type SearchImageResponse = ApiResponse<SearchImageData>;

export type CreateSearchHistoryInput =
  | {
      userId: string;
      searchType: 'IMAGE_ONLY';
      queryImageId: string;
    }
  | {
      userId: string;
      searchType: 'TEXT_SEMANTIC' | 'TEXT_OCR';
      queryText: string;
    };

export interface CreateImageSearchHistoryInput {
  userId: string;
  buffer: Buffer;
  mimetype: string;
}

export interface ImageSearchHistoryQuery {
  id: string;
  queryImage: {
    path: string;
    fileFormat: string;
  };
}

export interface SearchClickInput {
  userId: string;
  searchHistoryId: string;
  clickedImageId: string;
}

export interface SearchClickData {
  id: string;
  searchHistoryId: string;
  clickedImageId: string;
  createdAt: Date;
}

export type SaveSearchClickResult =
  | {
      success: true;
      data: SearchClickData;
    }
  | {
      success: false;
      statusCode: 404;
      message: string;
    };
import type { ApiResponse } from './apiResponse.js';
