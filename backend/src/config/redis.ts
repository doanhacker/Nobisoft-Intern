import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = new Redis.default(REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times: number) {
    const delay = Math.min(times * 200, 2000);
    return delay;
  },
  lazyConnect: false,
});

redis.on('connect', () => {
  console.log('[Redis] Connected:', REDIS_URL);
});

redis.on('error', (err: Error) => {
  console.error('[Redis] Error:', err.message);
});
