import type { Request, Response } from 'express';
import { loginUser, registerUser } from '../../services/auth.service.js';

export async function register(req: Request, res: Response) {
  try {
    const result = await registerUser(req.body);

    if (!result.success) {
      res.status(409).json({
        message: result.message,
      });
      return;
    }

    res.status(201).json({
      message: 'Đăng ký thành công',
      user: result.user,
    });
  } catch (error) {
    console.error('Register error:', error);

    res.status(500).json({
      message: 'Đăng ký thất bại',
    });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const result = await loginUser(req.body);

    if (!result.success) {
      res.status(401).json({
        message: result.message,
      });
      return;
    }

    res.status(200).json({
      message: 'Đăng nhập thành công',
      accessToken: result.accessToken,
      user: result.user,
    });
  } catch (error) {
    console.error('Login error:', error);

    res.status(500).json({
      message: 'Đăng nhập thất bại',
    });
  }
}
