import * as bcrypt from 'bcrypt';
import { z } from 'zod';

const PASSWORD_SALT_ROUNDS = 10;

export const strongPasswordSchema = z
  .string()
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}$/,
    'Mật khẩu phải tối thiểu 8 ký tự bao gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt',
  );

export function hashPassword(password: string) {
  return bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
}

export function comparePassword(password: string, hashedPassword: string) {
  return bcrypt.compare(password, hashedPassword);
}
