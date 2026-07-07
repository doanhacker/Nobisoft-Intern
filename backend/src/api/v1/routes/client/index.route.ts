import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import homeRouter from './home.route.js';

const clientRouter = Router();

clientRouter.use('/', requireAuth, homeRouter);

export default clientRouter;
