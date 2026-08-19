import { Router } from 'express';
import * as authController from '../../controllers/auth/auth.controller.js';
import {
  loginRateLimiter,
  registerRateLimiter,
} from '../../middlewares/rate-limit.middleware.js';
import { validateLogin, validateRegister } from '../../validators/auth/auth.validate.js';

const authRouter = Router();

/**
 * @swagger
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Đăng ký tài khoản mới
 *     description: |
 *       Tạo tài khoản người dùng mới.
 *       Mật khẩu phải tối thiểu 8 ký tự, bao gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: Đăng ký thành công, trả về thông tin user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RegisterResponse'
 *       400:
 *         description: Dữ liệu không hợp lệ (email sai định dạng, mật khẩu yếu, tên trống...)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               invalidEmail:
 *                 value:
 *                   success: false
 *                   message: "Email không hợp lệ"
 *               weakPassword:
 *                 value:
 *                   success: false
 *                   message: "Mật khẩu phải tối thiểu 8 ký tự bao gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt"
 *               emptyName:
 *                 value:
 *                   success: false
 *                   message: "Tên không được để trống"
 *       409:
 *         description: Email đã được sử dụng
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "Email đã được sử dụng"
 *       429:
 *         description: Vượt quá giới hạn số lần đăng ký
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Lỗi server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "Đăng ký thất bại"
 */
authRouter.post('/register', registerRateLimiter, validateRegister, authController.register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Đăng nhập
 *     description: Xác thực tài khoản và trả về JWT access token.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Đăng nhập thành công, trả về access token và thông tin user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       400:
 *         description: Dữ liệu đăng nhập không hợp lệ (thiếu email hoặc mật khẩu)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "Email không hợp lệ"
 *       401:
 *         description: Email hoặc mật khẩu không đúng
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "Email hoặc mật khẩu không đúng"
 *       429:
 *         description: Vượt quá giới hạn số lần đăng nhập thất bại
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Lỗi server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "Đăng nhập thất bại"
 */
authRouter.post('/login', loginRateLimiter, validateLogin, authController.login);

export default authRouter;
