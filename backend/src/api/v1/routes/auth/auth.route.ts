import { Router } from 'express';
import { login, register } from '../../controllers/auth/auth.controller.js';
import { validateLogin, validateRegister } from '../../validators/auth/auth.validate.js';

const authRouter = Router();

authRouter.post('/register', validateRegister, register);
authRouter.post('/login', validateLogin, login);

export default authRouter;
