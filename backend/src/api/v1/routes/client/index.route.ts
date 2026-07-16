import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import searchRouter from './search.route.js';
import uploadRouter from './upload.route.js';
import imageRouter from './image.route.js';

const clientRouter = Router();

clientRouter.use('/search', requireAuth, searchRouter);
clientRouter.use('/upload', requireAuth, uploadRouter);
clientRouter.use('/images', requireAuth, imageRouter);

export default clientRouter;
