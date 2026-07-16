import type { ApiResponse } from './apiResponse.js';

export interface OcrLinePreview {
  rawText: string;
  confidenceScore: number;
}

export interface OcrLineDetail extends OcrLinePreview {
  id: string;
  normalizedText: string;
  boundingBoxes: unknown;
}

export interface ImageIndexInfo {
  id: string;
  processDurationMs: number | null;
  indexedAt: Date | null;
  ocrLines: OcrLinePreview[];
}

export interface ImageListItem {
  id: string;
  imageUrl: string;
  width: number | null;
  height: number | null;
  fileSize: number | null;
  fileFormat: string | null;
  createdAt: Date;
  imageIndex: ImageIndexInfo | null;
}

export type ImageListApiResponse = ApiResponse<ImageListItem[]>;
export type ImageDetailApiResponse = ApiResponse<ImageListItem>;
