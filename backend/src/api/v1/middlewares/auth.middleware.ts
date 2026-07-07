import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../../../config/prisma.js';
import type { ApiResponse } from '../../../types/apiResponse.js';
import type { JwtPayload } from '../../../types/auth.type.js';

function getBearerToken(req: Request) {
  const authorization = req.headers.authorization;

  if (!authorization?.startsWith('Bearer ')) {
    return null;
  }

  return authorization.split(' ')[1];
}

function isJwtPayload(payload: string | jwt.JwtPayload): payload is JwtPayload {
  return (
    typeof payload === 'object' &&
    typeof payload.id === 'string' &&
    typeof payload.email === 'string' &&
    (payload.role === 'USER' || payload.role === 'ADMIN')
  );
}

async function authenticate(req: Request, res: Response) {
  const token = getBearerToken(req);
  const secret = process.env.JWT_ACCESS_SECRET;

  if (!token) {
    const response: ApiResponse = {
      success: false,
      message: 'Vui lòng đăng nhập',
    };

    res.status(401).json(response);
    return false;
  }

  if (!secret) {
    const response: ApiResponse = {
      success: false,
      message: 'JWT_ACCESS_SECRET is required',
    };

    res.status(500).json(response);
    return false;
  }

  try {
    const payload = jwt.verify(token, secret);

    if (!isJwtPayload(payload)) {
      const response: ApiResponse = {
        success: false,
        message: 'Token không hợp lệ hoặc đã hết hạn',
      };

      res.status(401).json(response);
      return false;
    }

    const user = await prisma.user.findUnique({
      where: {
        id: payload.id,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    if (!user) {
      const response: ApiResponse = {
        success: false,
        message: 'Tài khoản không tồn tại',
      };

      res.status(401).json(response);
      return false;
    }

    req.user = user;
    return true;
  } catch {
    const response: ApiResponse = {
      success: false,
      message: 'Token không hợp lệ hoặc đã hết hạn',
    };

    res.status(401).json(response);
    return false;
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!(await authenticate(req, res))) {
    return;
  }

  next();
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!(await authenticate(req, res))) {
    return;
  }

  if (req.user?.role !== 'ADMIN') {
    const response: ApiResponse = {
      success: false,
      message: 'Bạn không có quyền truy cập',
    };

    res.status(403).json(response);
    return;
  }

  next();
}
