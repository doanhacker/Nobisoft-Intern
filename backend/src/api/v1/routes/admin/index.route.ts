import { Router } from 'express';
import { requireAdmin } from '../../middlewares/auth.middleware.js';
import dashboardRouter from './dashboard.route.js';

const adminRouter = Router();

adminRouter.use('/dashboard', requireAdmin, dashboardRouter);

export default adminRouter;
