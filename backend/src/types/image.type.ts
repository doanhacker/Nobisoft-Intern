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

export interface MyImageListItem {
  id: string;
  imageUrl: string;
  width: number | null;
  height: number | null;
  fileSize: number | null;
  fileFormat: string | null;
  createdAt: Date;
}

export interface BulkDeleteImagesResult {
  requested: number;
  deleted: number;
  failedIds: string[];
}

export interface TrashImageListItem extends ImageListItem {
  deletedAt: Date;
  permanentDeleteAt: Date;
  remainingDays: number;
}

export interface RestoreImagesResult {
  requested: number;
  restored: number;
  failedIds: string[];
}

export interface PermanentDeleteImagesResult {
  requested: number;
  deleted: number;
  deletedIds: string[];
  failedIds: string[];
  skippedIds: string[];
}

export type ImageListApiResponse = ApiResponse<ImageListItem[]>;
export type ImageDetailApiResponse = ApiResponse<ImageListItem>;
export type MyImageListApiResponse = ApiResponse<MyImageListItem[]>;
export type BulkDeleteImagesApiResponse = ApiResponse<BulkDeleteImagesResult>;
export type TrashImageListApiResponse = ApiResponse<TrashImageListItem[]>;
export type RestoreImagesApiResponse = ApiResponse<RestoreImagesResult>;
export type PermanentDeleteImagesApiResponse = ApiResponse<PermanentDeleteImagesResult>;
