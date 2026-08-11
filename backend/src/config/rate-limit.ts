const SECOND_IN_MILLISECONDS = 1_000;
const MINUTE_IN_MILLISECONDS = 60 * SECOND_IN_MILLISECONDS;

export const RATE_LIMIT_CONFIG = {
  login: {
    windowMs: 15 * MINUTE_IN_MILLISECONDS,
    limit: 20,
  },
  register: {
    windowMs: 60 * MINUTE_IN_MILLISECONDS,
    limit: 10,
  },
  search: {
    windowMs: MINUTE_IN_MILLISECONDS,
    limit: 120,
  },
  imageResize: {
    windowMs: MINUTE_IN_MILLISECONDS,
    limit: 1_000,
  },
} as const;
