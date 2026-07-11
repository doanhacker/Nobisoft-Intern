import { Router } from 'express';
import { uploadMultiple } from '../../middlewares/upload.middleware.js';
import { batchIndexing } from '../../controllers/admin/indexing.controller.js';

const indexingRouter = Router();

indexingRouter.post('/', uploadMultiple, batchIndexing);

export default indexingRouter;
