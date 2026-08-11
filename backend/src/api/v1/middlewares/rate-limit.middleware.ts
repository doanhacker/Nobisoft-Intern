import type { Request, Response } from 'express';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import { RATE_LIMIT_CONFIG } from '../../../config/rate-limit.js';
import type { ApiResponse } from '../../../types/apiResponse.js';

const RATE_LIMIT_MESSAGE = 'Quá nhiều yêu cầu, vui lòng thử lại sau';

function getRequestIpKey(req: Request) {
  return ipKeyGenerator(req.ip ?? 'unknown');
}

function getUserOrIpKey(req: Request) {
  return req.user?.id ?? getRequestIpKey(req);
}

function handleRateLimitExceeded(_req: Request, res: Response) {
  const response: ApiResponse = {
    success: false,
    message: RATE_LIMIT_MESSAGE,
  };

  res.status(429).json(response);
}

function createRateLimitHandler(config: { windowMs: number; limit: number }) {
  return rateLimit({
    ...config,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: handleRateLimitExceeded,
  });
}

export const loginRateLimiter = rateLimit({
  ...RATE_LIMIT_CONFIG.login,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: getRequestIpKey,
  handler: handleRateLimitExceeded,
});

export const registerRateLimiter = createRateLimitHandler(RATE_LIMIT_CONFIG.register);

export const searchRateLimiter = rateLimit({
  ...RATE_LIMIT_CONFIG.search,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: getUserOrIpKey,
  handler: handleRateLimitExceeded,
});

export const imageResizeRateLimiter = rateLimit({
  ...RATE_LIMIT_CONFIG.imageResize,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: getRequestIpKey,
  skip: (req) => req.query.w === undefined && req.query.h === undefined,
  handler: handleRateLimitExceeded,
});
