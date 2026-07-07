import { Router } from 'express';
import { getUsers, getSearchHistory } from '../../controllers/admin/user.controller.js';
import { validateUserListQuery, validateSearchHistoryQuery } from '../../validators/admin/user.validate.js';

const userRouter = Router();

userRouter.get('/', validateUserListQuery, getUsers);
userRouter.get('/:userId/search-history', validateSearchHistoryQuery, getSearchHistory);

export default userRouter;
