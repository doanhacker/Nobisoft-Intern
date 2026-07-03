import express from 'express';
import type { Express, Request, Response } from 'express';
import { routesApiVer1 } from './api/v1/routes/index.route.js';


const app: Express = express();

app.use(express.json());

app.get('/api/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'OK', message: 'Express server is running' });
});

routesApiVer1(app);

export default app;