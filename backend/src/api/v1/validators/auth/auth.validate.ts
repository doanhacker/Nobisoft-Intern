import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { strongPasswordSchema } from '../../../../utils/password.util.js';
import type { ApiResponse } from '../../../../types/apiResponse.js';

export const registerSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email({ message: 'Email không hợp lệ' })),
  name: z
    .string()
    .trim()
    .min(1, 'Tên không được để trống')
    .transform((name) => name.replace(/\s+/g, ' ')),
  password: strongPasswordSchema,
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email({ message: 'Email không hợp lệ' })),
  password: z.string().min(1, 'Mật khẩu không được để trống'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

function buildValidationErrorResponse(error: z.ZodError, fallbackMessage: string): ApiResponse {
  return {
    success: false,
    message: error.issues[0]?.message ?? fallbackMessage,
  };
}

export function validateRegister(req: Request, res: Response, next: NextFunction) {
  const result = registerSchema.safeParse(req.body);

  if (!result.success) {
    const response = buildValidationErrorResponse(result.error, 'Dữ liệu đăng ký không hợp lệ');

    res.status(400).json(response);
    return;
  }

  req.body = result.data;
  next();
}

export function validateLogin(req: Request, res: Response, next: NextFunction) {
  const result = loginSchema.safeParse(req.body);

  if (!result.success) {
    const response = buildValidationErrorResponse(result.error, 'Dữ liệu đăng nhập không hợp lệ');

    res.status(400).json(response);
    return;
  }

  req.body = result.data;
  next();
}
