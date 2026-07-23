import { prisma } from '../../../config/prisma.js';
import { removeVietnameseDiacritics } from '../../../utils/normalize.util.js';
import type { UserListServiceResult } from '../../../types/user.type.js';
import type { UserListQuery } from '../validators/admin/user.validate.js';

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
