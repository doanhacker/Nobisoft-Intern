import { Router } from 'express';
import * as imageController from '../../controllers/admin/image.controller.js';
import { validateImageListQuery, validateImageIdParam } from '../../validators/admin/image.validate.js';

const imageRouter = Router();

imageRouter.get('/', validateImageListQuery, imageController.listImages);
imageRouter.get('/:id', validateImageIdParam, imageController.getImage);
imageRouter.delete('/:id', validateImageIdParam, imageController.removeImage);

export default imageRouter;
