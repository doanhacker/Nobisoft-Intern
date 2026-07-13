import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import homeRouter from './home.route.js';
import searchRouter from './search.route.js';

const clientRouter = Router();

clientRouter.use('/search', requireAuth, searchRouter);
clientRouter.use('/', requireAuth, homeRouter);

export default clientRouter;
