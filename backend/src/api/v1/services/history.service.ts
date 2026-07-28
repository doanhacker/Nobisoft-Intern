import { prisma } from '../../../config/prisma.js';
import type { Prisma } from '../../../generated/prisma/client.js';
import { endOfBangkokDay, startOfBangkokDay } from '../../../utils/date.util.js';
import type {
  SearchHistoryListQuery,
  UserSearchHistoryServiceResult,
} from '../../../types/history.type.js';

export class HistoryPageOutOfRangeError extends Error { }
export class SearchHistoryUserNotFoundError extends Error { }

export async function getUserSearchHistory(
  userId: string,
  query: SearchHistoryListQuery,
): Promise<UserSearchHistoryServiceResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!user) {
    throw new SearchHistoryUserNotFoundError('Người dùng không tồn tại');
  }

  const { page, limit, searchType, fromDate, toDate } = query;
  const skip = (page - 1) * limit;
  const where: Prisma.SearchHistoryWhereInput = {
    userId,
    ...(searchType ? { searchType } : {}),
    ...(fromDate || toDate
      ? {
        createdAt: {
          ...(fromDate ? { gte: startOfBangkokDay(fromDate) } : {}),
          ...(toDate ? { lte: endOfBangkokDay(toDate) } : {}),
        },
      }
      : {}),
  };

  const total = await prisma.searchHistory.count({ where });
  const totalPages = Math.ceil(total / limit);
  const lastValidPage = Math.max(totalPages, 1);

  if (page > lastValidPage) {
    throw new HistoryPageOutOfRangeError(
      `Trang ${page} vượt quá tổng số trang hiện có (${totalPages})`,
    );
  }

  const histories = await prisma.searchHistory.findMany({
    where,
    select: {
      id: true,
      searchType: true,
      queryText: true,
      createdAt: true,
      queryImage: {
        select: {
          id: true,
          path: true,
          width: true,
          height: true,
          fileSize: true,
          fileFormat: true,
        },
      },
    },
    skip,
    take: limit,
    orderBy: { createdAt: 'desc' },
  });

  return {
    data: histories.map((history) => ({
      id: history.id,
      searchType: history.searchType,
      queryImage: history.queryImage
        ? {
          id: history.queryImage.id,
          imageUrl: resolveImageUrl(history.queryImage.path),
          width: history.queryImage.width,
          height: history.queryImage.height,
          fileSize: history.queryImage.fileSize,
          fileFormat: history.queryImage.fileFormat,
        }
        : null,
      queryText: history.queryText,
      createdAt: history.createdAt,
    })),
    total,
  };
}

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

function resolveImageUrl(imagePath: string): string {
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }

  const cleanPath = imagePath.replace(/\\/g, '/').replace(/^\//, '');
  return `${BACKEND_URL}/${cleanPath}`;
}
