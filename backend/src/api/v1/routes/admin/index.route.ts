import { Router } from 'express';
import { requireAdmin } from '../../middlewares/auth.middleware.js';
import userRouter from './user.route.js';
import indexingRouter from './indexing.route.js';
import imageRouter from './image.route.js';

const adminRouter = Router();

adminRouter.use('/users', requireAdmin, userRouter);
adminRouter.use('/indexing', requireAdmin, indexingRouter);
adminRouter.use('/images', requireAdmin, imageRouter);

export default adminRouter;
