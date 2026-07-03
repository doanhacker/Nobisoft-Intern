import { Router } from 'express';
import { register } from '../../controllers/auth/auth.controller.js';
import { validateRegister } from '../../validators/auth/auth.validate.js';

const authRouter = Router();

authRouter.post('/register', validateRegister, register);

export default authRouter;
