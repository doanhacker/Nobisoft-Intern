import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

const imageIdParamSchema = z.object({
  id: z.string().uuid('Image ID không hợp lệ'),
});

export function validateImageIdParam(req: Request, res: Response, next: NextFunction) {
  const result = imageIdParamSchema.safeParse(req.params);

  if (!result.success) {
    const message = result.error.issues[0]?.message ?? 'Params không hợp lệ';

    res.status(400).json({
      success: false,
      message,
    });
    return;
  }

  next();
}
