import { Router } from 'express';
import { dashboard } from '../../controllers/admin/dashboard.controller.js';

const dashboardRouter = Router();

dashboardRouter.get('/', dashboard);

export default dashboardRouter;
