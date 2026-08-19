import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import { searchRateLimiter } from '../../middlewares/rate-limit.middleware.js';
import historyRouter from './history.route.js';
import recommendationRouter from './recommendation.route.js';
import searchRouter from './search.route.js';
import uploadRouter from './upload.route.js';
import myImageRouter from './my-image.route.js';

const clientRouter = Router();

clientRouter.use('/search', requireAuth, searchRateLimiter, searchRouter);
clientRouter.use('/upload', requireAuth, uploadRouter);
clientRouter.use('/images/me', requireAuth, myImageRouter);
clientRouter.use('/history', requireAuth, historyRouter);
clientRouter.use('/recommendations', requireAuth, recommendationRouter);

export default clientRouter;
