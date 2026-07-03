import type { Express } from 'express';
import authRouter from './auth/auth.route.js';

export function routesApiVer1(app: Express) {
  app.use('/auth', authRouter);
}
