import { prisma } from '../../../config/prisma.js';
import { embedImage } from '../../../services/ai.service.js';
import { searchSimilarImageVectors } from '../../../services/qdrant.service.js';
import type { SearchImageInput, SearchImageResult } from '../../../types/search.type.js';
import { readImageFromDisk } from '../../../utils/storage.util.js';
import {
  createImageSearchHistory,
  getImageSearchHistory,
} from './search-history.service.js';

export class ImageSearchHistoryNotFoundError extends Error {}
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
  );
  validateSearchPage(input.page, input.limit, vectorResult.total);

  const imageIds = vectorResult.points.map((point) => point.imageId);
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

  const results = vectorResult.points.flatMap((point) => {
    const image = imageMap.get(point.imageId);
    if (!image) return [];
    const { path, ...rest } = image;
    return [{
      ...rest,
      imageUrl: resolveImageUrl(path),
      similarityScore: point.score,
    }];
  });

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
