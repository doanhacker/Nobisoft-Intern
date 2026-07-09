import type { Request, Response } from 'express';
import type { AuthCheckApiResponse } from '../../../../types/auth.type.js';

export function home(req: Request, res: Response) {
  const response: AuthCheckApiResponse = {
    success: true,
    message: 'Đăng nhập hợp lệ',
    data: null,
  };

  res.status(200).json(response);
}
