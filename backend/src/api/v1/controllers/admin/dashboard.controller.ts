import type { Request, Response } from 'express';
import type { AdminDashboardApiResponse } from '../../../../types/auth.type.js';

export function dashboard(req: Request, res: Response) {
  const response: AdminDashboardApiResponse = {
    success: true,
    message: 'Truy cập dashboard admin thành công',
    data: null,
  };

  res.status(200).json(response);
}
