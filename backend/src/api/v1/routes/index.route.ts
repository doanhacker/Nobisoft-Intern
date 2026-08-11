import type { Express } from 'express';
import adminRouter from './admin/index.route.js';
import authRouter from './auth/auth.route.js';
import clientRouter from './client/index.route.js';

export function routesApiVer1(app: Express) {
  app.use('/api/auth', authRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api', clientRouter);
}
