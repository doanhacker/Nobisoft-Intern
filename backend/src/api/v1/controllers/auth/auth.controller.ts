import type { Request, Response } from 'express';
import type { LoginApiResponse, RegisterApiResponse } from '../../../../types/auth.type.js';
import type { ApiResponse } from '../../../../types/apiResponse.js';
import { loginUser, registerUser } from '../../services/auth.service.js';

export async function register(req: Request, res: Response) {
  try {
    const result = await registerUser(req.body);

    if (!result.success) {
      const response: ApiResponse = {
        success: false,
        message: result.message,
      };

      res.status(409).json(response);
      return;
    }

    const response: RegisterApiResponse = {
      success: true,
      message: 'Đăng ký thành công',
      data: result.data,
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Register error:', error);

    const response: ApiResponse = {
      success: false,
      message: 'Đăng ký thất bại',
    };

    res.status(500).json(response);
  }
}

export async function login(req: Request, res: Response) {
  try {
    const result = await loginUser(req.body);

    if (!result.success) {
      const response: ApiResponse = {
        success: false,
        message: result.message,
      };

      res.status(401).json(response);
      return;
    }

    const response: LoginApiResponse = {
      success: true,
      message: 'Đăng nhập thành công',
      data: result.data,
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Login error:', error);

    const response: ApiResponse = {
      success: false,
      message: 'Đăng nhập thất bại',
    };

    res.status(500).json(response);
  }
}
