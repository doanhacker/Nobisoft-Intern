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
  width: number | null;
  height: number | null;
  fileSize: number | null;
  fileFormat: string | null;
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

interface SearchTextBaseInput {
  userId: string;
  page: number;
  limit: number;
}

export type SearchTextSemanticInput =
  | (SearchTextBaseInput & {
      queryText: string;
    })
  | (SearchTextBaseInput & {
      searchHistoryId: string;
    });

export interface SearchTextSemanticResult {
  searchHistoryId: string;
  results: SearchImageResultItem[];
  total: number;
  page: number;
  limit: number;
}

export interface SearchTextSemanticData extends SearchTextSemanticResult {
  searchType: 'TEXT_SEMANTIC';
}

export type SearchTextSemanticResponse = ApiResponse<SearchTextSemanticData>;

// ============================
// OCR Search
// ============================

export type SearchTextOcrInput =
  | (SearchTextBaseInput & { queryText: string })
  | (SearchTextBaseInput & { searchHistoryId: string });

export interface OcrMatchLine {
  rawText: string;
  confidenceScore: number;
  boundingBoxes: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
}

export interface SearchTextOcrResultItem {
  id: string;
  imageUrl: string;
  width: number | null;
  height: number | null;
  fileSize: number | null;
  fileFormat: string | null;
  createdAt: Date;
  ocrMatches: OcrMatchLine[];
}

export interface SearchTextOcrResult {
  searchHistoryId: string;
  results: SearchTextOcrResultItem[];
  total: number;
}

export interface SearchTextOcrData {
  searchHistoryId: string;
  searchType: 'TEXT_OCR';
  results: SearchTextOcrResultItem[];
}

export type SearchTextOcrResponse = ApiResponse<SearchTextOcrData>;

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

export interface TextSearchHistoryQuery {
  id: string;
  queryText: string;
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
