import express from 'express';
import type { Express, NextFunction, Request, Response } from 'express';
import cors from 'cors';
import { PrismaClient } from './generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import PG from 'pg';
import type { UUID } from 'node:crypto';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.js';
import { routesApiVer1 } from './api/v1/routes/index.route.js';
import imageServeRouter from './api/v1/routes/image-serve.route.js';
import type { ApiResponse } from './types/apiResponse.js';

const app: Express = express();
const JSON_BODY_LIMIT = '1mb';
const CORS_ERROR_MESSAGE = 'Origin không được phép truy cập';

class CorsError extends Error {
  constructor() {
    super(CORS_ERROR_MESSAGE);
    this.name = 'CorsError';
  }
}

app.set('trust proxy', 1);

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean)
  : [];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new CorsError());
    }
  },
  credentials: true,
}));

app.use(express.json({ limit: JSON_BODY_LIMIT }));

// Serve ảnh với hỗ trợ resize
app.use('/images', imageServeRouter);

// ─── Swagger UI ───
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Nobisoft Intern API Docs',
}));

// Serve raw OpenAPI spec as JSON
app.get('/api-docs.json', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', message: 'Express server is running' });
});

routesApiVer1(app);

app.use((error: unknown, _req: Request, res: Response, next: NextFunction) => {
  if (!(error instanceof CorsError)) {
    next(error);
    return;
  }

  const response: ApiResponse = {
    success: false,
    message: CORS_ERROR_MESSAGE,
  };

  res.status(403).json(response);
});

export default app;
