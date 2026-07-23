import type { PaginationMeta } from '../types/apiResponse.js';

export function createPaginationMeta(
  page: number,
  limit: number,
  totalDocs: number,
): PaginationMeta {
  return {
    page,
    limit,
    totalDocs,
    totalPages: Math.ceil(totalDocs / limit),
  };
}
