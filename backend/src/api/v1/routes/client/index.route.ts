import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import historyRouter from './history.route.js';
import searchRouter from './search.route.js';
import uploadRouter from './upload.route.js';
import myImageRouter from './my-image.route.js';
import imageRouter from './image.route.js';

const clientRouter = Router();

clientRouter.use('/search', requireAuth, searchRouter);
clientRouter.use('/upload', requireAuth, uploadRouter);
clientRouter.use('/images/me', requireAuth, myImageRouter);
clientRouter.use('/images', requireAuth, imageRouter);
clientRouter.use('/history', requireAuth, historyRouter);

export default clientRouter;
