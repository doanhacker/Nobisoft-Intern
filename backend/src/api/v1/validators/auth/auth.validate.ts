import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { strongPasswordSchema } from '../../../../utils/password.util.js';

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
    .transform((name) => name.replace(/\s+/g, ' ')), // Chuẩn hóa nhiều khoảng trắng thành 1 khoảng trắng.
  password: strongPasswordSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;

export function validateRegister(req: Request, res: Response, next: NextFunction) {
  const result = registerSchema.safeParse(req.body);

  if (!result.success) {
    const message = result.error.issues[0]?.message ?? 'Dữ liệu đăng ký không hợp lệ';

    res.status(400).json({
      message,
    });
    return;
  }

  req.body = result.data;
  next();
}
