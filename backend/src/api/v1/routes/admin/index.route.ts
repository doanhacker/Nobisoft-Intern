import { Router } from 'express';
import { requireAdmin } from '../../middlewares/auth.middleware.js';
import imageRouter from './image.route.js';
import userRouter from './user.route.js';

const adminRouter = Router();

adminRouter.use('/images', requireAdmin, imageRouter);
adminRouter.use('/users', requireAdmin, userRouter);

export default adminRouter;
