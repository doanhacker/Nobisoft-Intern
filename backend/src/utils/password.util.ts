import * as bcrypt from 'bcrypt';
import { z } from 'zod';

const PASSWORD_SALT_ROUNDS = 10;

export const strongPasswordSchema = z
  .string()
  .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
  .regex(/[a-z]/, 'Mật khẩu phải có ít nhất 1 chữ thường')
  .regex(/[A-Z]/, 'Mật khẩu phải có ít nhất 1 chữ hoa')
  .regex(/[0-9]/, 'Mật khẩu phải có ít nhất 1 chữ số')
  .regex(/[^A-Za-z0-9]/, 'Mật khẩu phải có ít nhất 1 ký tự đặc biệt');

export function hashPassword(password: string) {
  return bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
}
