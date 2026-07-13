import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import type { ApiResponse } from '../../../../types/apiResponse.js';
import { uploadSingle } from '../../middlewares/upload.middleware.js';

const searchImageSchema = z.object({
  page: z.coerce.number().int().min(1, 'Trang phải lớn hơn hoặc bằng 1').default(1),
  limit: z.coerce
    .number()
    .int()
    .pipe(z.literal(20, 'Số lượng kết quả mỗi trang chỉ được là 20'))
    .default(20),
});

export type SearchImageQuery = z.infer<typeof searchImageSchema>;

export function uploadSearchImage(req: Request, res: Response, next: NextFunction) {
  uploadSingle(req, res, (error: unknown) => {
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
  if (!req.file) {
    const response: ApiResponse = {
      success: false,
      message: 'Vui lòng chọn một ảnh để tìm kiếm',
    };
    res.status(400).json(response);
    return;
  }

  const result = searchImageSchema.safeParse(req.body);

  if (!result.success) {
    const response: ApiResponse = {
      success: false,
      message: result.error.issues[0]?.message ?? 'Tham số tìm kiếm không hợp lệ',
    };
    res.status(400).json(response);
    return;
  }

  req.body = result.data;
  next();
}
