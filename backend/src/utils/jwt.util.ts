import jwt from 'jsonwebtoken';
import type { JwtPayload } from '../types/auth.type.js';

export function generateAccessToken(payload: JwtPayload) {
  const secret = process.env.JWT_ACCESS_SECRET;
  const expiresIn = (process.env.JWT_ACCESS_EXPIRES_IN ?? '24h') as Exclude<
    jwt.SignOptions['expiresIn'],
    undefined
  >;

  if (!secret) {
    throw new Error('JWT_ACCESS_SECRET is required');
  }

  const options: jwt.SignOptions = {
    expiresIn,
  };

  return jwt.sign(payload, secret, options);
}
