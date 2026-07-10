import { prisma } from '../../../config/prisma.js';
import { removeVietnameseDiacritics } from '../../../utils/normalize.util.js';
import type { UserListServiceResult, SearchHistoryServiceResult } from '../../../types/user.type.js';
import type { UserListQuery, SearchHistoryQuery } from '../validators/admin/user.validate.js';

export async function getUserList(query: UserListQuery): Promise<UserListServiceResult> {
  const { page, limit, search } = query;
  const skip = (page - 1) * limit;

  const normalizedSearch = search ? removeVietnameseDiacritics(search) : undefined;

  const where = {
    deletedAt: null as null,
    ...(normalizedSearch
      ? {
        OR: [
          { email: { contains: normalizedSearch } },
          { nameSearch: { contains: normalizedSearch } },
        ],
      }
      : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        _count: {
          select: { searchHistories: true },
        },
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    success: true,
    data: users,
    total,
  };
}

export async function getUserSearchHistory(
  userId: string,
  query: SearchHistoryQuery,
): Promise<SearchHistoryServiceResult> {
  // Verify user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!user) {
    return {
      success: false,
      message: 'Người dùng không tồn tại',
    };
  }

  const { page, limit, searchType } = query;
  const skip = (page - 1) * limit;

  const where = {
    userId,
    ...(searchType ? { searchType } : {}),
  };

  const [histories, total] = await Promise.all([
    prisma.searchHistory.findMany({
      where,
      select: {
        id: true,
        searchType: true,
        queryImagePath: true,
        queryText: true,
        clickedImage: {
          select: {
            id: true,
            path: true,
            width: true,
            height: true,
          },
        },
        createdAt: true,
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.searchHistory.count({ where }),
  ]);

  return {
    success: true,
    data: histories,
    total,
  };
}
