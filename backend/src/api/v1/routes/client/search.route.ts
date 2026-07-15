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
 *     tags: [Client - Search]
 *     summary: Tìm ảnh tương tự bằng hình ảnh
 *     description: |
 *       Nhận 1 ảnh (jpg, png, webp, tối đa 10MB), gọi AI tạo embedding và tìm vector tương tự trong Qdrant.
 *       Kết quả trả về có phân trang, mỗi trang cố định 20 kết quả.
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
 *                 description: Ảnh cần tìm (jpg, png, webp, tối đa 10MB)
 *               page:
 *                 type: integer
 *                 minimum: 1
 *                 default: 1
 *                 description: Số trang (mặc định 1)
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
 *                       example: 50
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 20
 *       400:
 *         description: Không có file hoặc file không hợp lệ
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "Vui lòng chọn một ảnh để tìm kiếm"
 *       401:
 *         description: Chưa đăng nhập hoặc token hết hạn
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "Vui lòng đăng nhập"
 *       500:
 *         description: Lỗi AI Service, Qdrant hoặc Backend
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "Tìm kiếm hình ảnh thất bại"
 */
searchRouter.post('/image', uploadSearchImage, validateSearchImage, searchByImage);

export default searchRouter;
