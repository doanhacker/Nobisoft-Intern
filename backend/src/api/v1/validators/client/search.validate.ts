import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import type { ApiResponse } from '../../../../types/apiResponse.js';
import { uploadSearchImageMemory } from '../../middlewares/search.middleware.js';

const searchImageSchema = z.object({
  searchHistoryId: z.preprocess(
    (value) => value === '' ? undefined : value,
    z.string().uuid('searchHistoryId không hợp lệ').optional(),
  ),
  page: z.coerce.number().int().min(1, 'Trang phải lớn hơn hoặc bằng 1').default(1),
  limit: z.coerce
    .number()
    .int()
    .pipe(z.literal(20, 'Số lượng kết quả mỗi trang chỉ được là 20'))
    .default(20),
});

export type SearchImageQuery = z.infer<typeof searchImageSchema>;

const searchTextSemanticSchema = z
  .object({
    q: z.preprocess(
      (value) => value === '' ? undefined : value,
      z
        .string()
        .trim()
        .min(1, 'Nội dung tìm kiếm không được để trống')
        .max(500, 'Nội dung tìm kiếm không được vượt quá 500 ký tự')
        .optional(),
    ),
    searchHistoryId: z.preprocess(
      (value) => value === '' ? undefined : value,
      z.string().uuid('searchHistoryId không hợp lệ').optional(),
    ),
    mode: z.literal('semantic', 'mode chỉ được phép là semantic'),
    page: z.coerce.number().int().min(1, 'Trang phải lớn hơn hoặc bằng 1').default(1),
    limit: z.coerce
      .number()
      .int()
      .pipe(z.literal(20, 'Số lượng kết quả mỗi trang chỉ được là 20'))
      .default(20),
  })
  .refine((data) => Boolean(data.q) !== Boolean(data.searchHistoryId), {
    message: 'Chỉ gửi q khi tìm kiếm mới hoặc searchHistoryId khi chuyển trang',
  })
  .refine((data) => !data.q || data.page === 1, {
    message: 'Tìm kiếm mới phải bắt đầu từ trang 1',
    path: ['page'],
  });

export type SearchTextSemanticQuery = z.infer<typeof searchTextSemanticSchema>;

const searchClickSchema = z.object({
  searchHistoryId: z.string().uuid('searchHistoryId không hợp lệ'),
  clickedImageId: z.string().uuid('clickedImageId không hợp lệ'),
});

export type SearchClickBody = z.infer<typeof searchClickSchema>;

export function uploadSearchImage(req: Request, res: Response, next: NextFunction) {
  uploadSearchImageMemory(req, res, (error: unknown) => {
    if (!error) {
      next();
      return;
    }

    const message =
      error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE'
        ? 'Ảnh không được vượt quá 10MB'
        : error instanceof Error
          ? error.message
          : 'Upload ảnh thất bại';

    const response: ApiResponse = { success: false, message };
    res.status(400).json(response);
  });
}

export function validateSearchImage(req: Request, res: Response, next: NextFunction) {
  const result = searchImageSchema.safeParse(req.body);

  if (!result.success) {
    const response: ApiResponse = {
      success: false,
      message: result.error.issues[0]?.message ?? 'Tham số tìm kiếm không hợp lệ',
    };
    res.status(400).json(response);
    return;
  }

  const hasImage = Boolean(req.file);
  const hasSearchHistoryId = Boolean(result.data.searchHistoryId);

  if (hasImage === hasSearchHistoryId) {
    const response: ApiResponse = {
      success: false,
      message: 'Chỉ gửi ảnh khi tìm kiếm mới hoặc searchHistoryId khi chuyển trang',
    };
    res.status(400).json(response);
    return;
  }

  if (hasImage && result.data.page !== 1) {
    const response: ApiResponse = {
      success: false,
      message: 'Tìm kiếm mới phải bắt đầu từ trang 1',
    };
    res.status(400).json(response);
    return;
  }

  req.body = result.data;
  next();
}

export function validateSearchTextSemantic(req: Request, res: Response, next: NextFunction) {
  const result = searchTextSemanticSchema.safeParse(req.query);

  if (!result.success) {
    const response: ApiResponse = {
      success: false,
      message: result.error.issues[0]?.message ?? 'Tham số tìm kiếm không hợp lệ',
    };
    res.status(400).json(response);
    return;
  }

  res.locals.searchTextSemanticQuery = result.data;
  next();
}

const searchTextPromptSchema = z
  .object({
    q: z.preprocess(
      (value) => value === '' ? undefined : value,
      z
        .string()
        .trim()
        .min(1, 'Nội dung tìm kiếm không được để trống')
        .max(1000, 'Nội dung tìm kiếm không được vượt quá 1000 ký tự')
        .optional(),
    ),
    searchHistoryId: z.preprocess(
      (value) => value === '' ? undefined : value,
      z.string().uuid('searchHistoryId không hợp lệ').optional(),
    ),
    mode: z.literal('prompt', 'mode chỉ được phép là prompt'),
    page: z.coerce.number().int().min(1, 'Trang phải lớn hơn hoặc bằng 1').default(1),
    limit: z.coerce
      .number()
      .int()
      .pipe(z.literal(20, 'Số lượng kết quả mỗi trang chỉ được là 20'))
      .default(20),
  })
  .refine((data) => Boolean(data.q) !== Boolean(data.searchHistoryId), {
    message: 'Chỉ gửi q khi tìm kiếm mới hoặc searchHistoryId khi chuyển trang',
  })
  .refine((data) => !data.q || data.page === 1, {
    message: 'Tìm kiếm mới phải bắt đầu từ trang 1',
    path: ['page'],
  });

export type SearchTextPromptQuery = z.infer<typeof searchTextPromptSchema>;

export function validateSearchTextPrompt(req: Request, res: Response, next: NextFunction) {
  const result = searchTextPromptSchema.safeParse(req.query);

  if (!result.success) {
    const response: ApiResponse = {
      success: false,
      message: result.error.issues[0]?.message ?? 'Tham số tìm kiếm không hợp lệ',
    };
    res.status(400).json(response);
    return;
  }

  res.locals.searchTextPromptQuery = result.data;
  next();
}

const searchTextOcrSchema = z.object({
  q: z.preprocess(
    (value) => value === '' ? undefined : value,
    z
      .string()
      .trim()
      .min(1, 'Nội dung tìm kiếm không được để trống')
      .max(500, 'Nội dung tìm kiếm không được vượt quá 500 ký tự')
      .optional(),
  ),
  searchHistoryId: z.preprocess(
    (value) => value === '' ? undefined : value,
    z.string().uuid('searchHistoryId không hợp lệ').optional(),
  ),
  mode: z.literal('ocr', 'mode chỉ được phép là ocr'),
  page: z.coerce.number().int().min(1, 'Trang phải lớn hơn hoặc bằng 1').default(1),
  limit: z.coerce.number().int().min(1, 'limit phải lớn hơn 0').max(100, 'limit tối đa 100').default(20),
});

export type SearchTextOcrQuery = z.infer<typeof searchTextOcrSchema>;

export function validateSearchTextOcr(req: Request, res: Response, next: NextFunction) {
  const result = searchTextOcrSchema.safeParse(req.query);

  if (!result.success) {
    const response: ApiResponse = {
      success: false,
      message: result.error.issues[0]?.message ?? 'Tham số tìm kiếm không hợp lệ',
    };
    res.status(400).json(response);
    return;
  }

  const hasQuery = Boolean(result.data.q);
  const hasSearchHistoryId = Boolean(result.data.searchHistoryId);

  if (hasQuery === hasSearchHistoryId) {
    const response: ApiResponse = {
      success: false,
      message: 'Chỉ gửi q khi tìm kiếm mới hoặc searchHistoryId khi chuyển trang',
    };
    res.status(400).json(response);
    return;
  }

  if (hasQuery && result.data.page !== 1) {
    const response: ApiResponse = {
      success: false,
      message: 'Tìm kiếm mới phải bắt đầu từ trang 1',
    };
    res.status(400).json(response);
    return;
  }

  res.locals.searchTextOcrQuery = result.data;
  next();
}

export function validateSearchClick(req: Request, res: Response, next: NextFunction) {
  const result = searchClickSchema.safeParse(req.body);

  if (!result.success) {
    const response: ApiResponse = {
      success: false,
      message: result.error.issues[0]?.message ?? 'Dữ liệu lượt click không hợp lệ',
    };
    res.status(400).json(response);
    return;
  }

  req.body = result.data;
  next();
}
