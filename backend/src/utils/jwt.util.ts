import jwt from 'jsonwebtoken';

interface AccessTokenPayload {
  userId: string;
  email: string;
  role: string;
}

export function generateAccessToken(payload: AccessTokenPayload) {
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
