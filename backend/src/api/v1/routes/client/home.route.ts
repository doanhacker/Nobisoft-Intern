import { Router } from 'express';
import { home } from '../../controllers/client/home.controller.js';

const homeRouter = Router();

homeRouter.get('/', home);

export default homeRouter;
