import { Router } from 'express';
import { searchByImage } from '../../controllers/client/search.controller.js';
import {
  uploadSearchImage,
  validateSearchImage,
} from '../../validators/client/search.validate.js';

const searchRouter = Router();

/**
 * @swagger
 * /search/image:
 *   post:
 *     tags: [Search]
 *     summary: Tìm ảnh tương tự bằng hình ảnh
 *     description: Nhận một ảnh, gọi AI tạo embedding và tìm vector tương tự trong Qdrant. Mỗi trang cố định 20 kết quả, FE không cần truyền limit khác.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [image]
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Ảnh JPG, PNG hoặc WebP, tối đa 10MB
 *               page:
 *                 type: integer
 *                 minimum: 1
 *                 default: 1
 *               limit:
 *                 type: integer
 *                 enum: [20]
 *                 default: 20
 *                 description: Cố định 20 kết quả mỗi trang
 *     responses:
 *       200:
 *         description: Tìm kiếm thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     searchType:
 *                       type: string
 *                       enum: [IMAGE_ONLY]
 *                       example: IMAGE_ONLY
 *                     results:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/SearchImageResult'
 *                     total:
 *                       type: integer
 *                       example: 20
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 20
 *       400:
 *         description: File hoặc tham số không hợp lệ
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Chưa đăng nhập
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: AI, Qdrant hoặc Backend gặp lỗi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
searchRouter.post('/image', uploadSearchImage, validateSearchImage, searchByImage);

export default searchRouter;
