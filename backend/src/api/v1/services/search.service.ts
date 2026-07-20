import { prisma } from '../../../config/prisma.js';
import { embedImage, embedText } from '../../../services/ai.service.js';
import {
  searchSimilarImageVectors,
  type SimilarImagePoint,
} from '../../../services/qdrant.service.js';
import type {
  SearchImageInput,
  SearchImageResult,
  SearchImageResultItem,
  SearchTextSemanticInput,
  SearchTextSemanticResult,
} from '../../../types/search.type.js';
import { readImageFromDisk } from '../../../utils/storage.util.js';
import {
  createImageSearchHistory,
  createSearchHistory,
  getImageSearchHistory,
  getTextSearchHistory,
} from './search-history.service.js';

export class ImageSearchHistoryNotFoundError extends Error {}
export class TextSearchHistoryNotFoundError extends Error {}
export class SearchPageOutOfRangeError extends Error {}

export async function searchImagesByImage(input: SearchImageInput): Promise<SearchImageResult> {
  const query = await resolveSearchQuery(input);
  const aiResponse = await embedImage(query.buffer, query.originalname, query.mimetype);

  if (!aiResponse.success || !aiResponse.data) {
    throw new Error(aiResponse.error_message || 'AI không thể xử lý ảnh tìm kiếm');
  }

  const vectorResult = await searchSimilarImageVectors(
    aiResponse.data.embedding,
    input.page,
    input.limit,
    'image',
  );
  validateSearchPage(input.page, input.limit, vectorResult.total);

  const results = await getSearchResults(vectorResult.points);

  const searchHistoryId = 'searchHistoryId' in input
    ? input.searchHistoryId
    : (
        await createImageSearchHistory({
          userId: input.userId,
          buffer: input.image.buffer,
          mimetype: input.image.mimetype,
        })
      ).id;

  return {
    searchHistoryId,
    results,
    total: vectorResult.total,
    page: input.page,
    limit: input.limit,
  };
}

export async function searchImagesByTextSemantic(
  input: SearchTextSemanticInput,
): Promise<SearchTextSemanticResult> {
  const queryText = await resolveTextSearchQuery(input);
  const aiResponse = await embedText(queryText);

  if (!aiResponse.success || !aiResponse.data) {
    throw new Error(aiResponse.error_message || 'AI không thể xử lý nội dung tìm kiếm');
  }

  const vectorResult = await searchSimilarImageVectors(
    aiResponse.data.embedding,
    input.page,
    input.limit,
    'semantic',
  );
  validateSearchPage(input.page, input.limit, vectorResult.total);

  const results = await getSearchResults(vectorResult.points);
  const searchHistoryId = 'searchHistoryId' in input
    ? input.searchHistoryId
    : (
        await createSearchHistory({
          userId: input.userId,
          searchType: 'TEXT_SEMANTIC',
          queryText,
        })
      ).id;

  return {
    searchHistoryId,
    results,
    total: vectorResult.total,
    page: input.page,
    limit: input.limit,
  };
}

function validateSearchPage(page: number, limit: number, total: number): void {
  const totalPages = Math.ceil(total / limit);
  const lastValidPage = Math.max(totalPages, 1);

  if (page > lastValidPage) {
    throw new SearchPageOutOfRangeError(
      `Trang ${page} vượt quá tổng số trang hiện có (${totalPages})`,
    );
  }
}

async function resolveSearchQuery(input: SearchImageInput) {
  if ('image' in input) {
    return input.image;
  }

  const history = await getImageSearchHistory(input.userId, input.searchHistoryId);

  if (!history) {
    throw new ImageSearchHistoryNotFoundError('Không tìm thấy lịch sử tìm kiếm');
  }

  return {
    buffer: await readImageFromDisk(history.queryImage.path),
    originalname: getFilename(history.queryImage.path),
    mimetype: getImageMimeType(history.queryImage.fileFormat),
  };
}

async function resolveTextSearchQuery(input: SearchTextSemanticInput): Promise<string> {
  if ('queryText' in input) {
    return input.queryText;
  }

  const history = await getTextSearchHistory(input.userId, input.searchHistoryId);

  if (!history) {
    throw new TextSearchHistoryNotFoundError('Không tìm thấy lịch sử tìm kiếm semantic');
  }

  return history.queryText;
}

async function getSearchResults(points: SimilarImagePoint[]): Promise<SearchImageResultItem[]> {
  const imageIds = points.map((point) => point.imageId);
  const images = imageIds.length > 0
    ? await prisma.image.findMany({
        where: { id: { in: imageIds } },
        select: {
          id: true,
          path: true,
          width: true,
          height: true,
          fileSize: true,
          fileFormat: true,
          createdAt: true,
        },
      })
    : [];
  const imageMap = new Map(images.map((image) => [image.id, image]));

  return points.flatMap((point) => {
    const image = imageMap.get(point.imageId);
    if (!image) return [];
    const { path, ...rest } = image;
    return [{
      ...rest,
      imageUrl: resolveImageUrl(path),
      similarityScore: point.score,
    }];
  });
}

function getFilename(imagePath: string): string {
  return imagePath.split(/[\\/]/).pop() ?? 'search-image';
}

function getImageMimeType(fileFormat: string): string {
  const mimeTypes: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
  };

  return mimeTypes[fileFormat.toLowerCase()] ?? 'application/octet-stream';
}

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

function resolveImageUrl(imagePath: string): string {
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  const cleanPath = imagePath.replace(/\\/g, '/').replace(/^\//, '');
  return `${BACKEND_URL}/${cleanPath}`;
}
