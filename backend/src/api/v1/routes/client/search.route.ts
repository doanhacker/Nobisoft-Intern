import { Router } from 'express';
import {
  recordSearchClick,
  searchByImage,
} from '../../controllers/client/search.controller.js';
import {
  uploadSearchImage,
  validateSearchClick,
  validateSearchImage,
} from '../../validators/client/search.validate.js';

const searchRouter = Router();

/**
 * @swagger
 * /search/image:
 *   post:
 *     tags: [Client - Search]
 *     summary: Tìm ảnh tương tự bằng hình ảnh
 *     description: Lần đầu gửi ảnh để tạo lịch sử. Khi đổi trang, kể cả quay lại trang 1, chỉ gửi searchHistoryId và page để không tạo lịch sử mới.
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
 *                 enum: [1]
 *                 default: 1
 *                 description: Tìm kiếm mới luôn bắt đầu từ trang 1
 *               limit:
 *                 type: integer
 *                 enum: [20]
 *                 default: 20
 *                 description: Cố định 20 kết quả mỗi trang
 *         application/json:
 *           schema:
 *             type: object
 *             required: [searchHistoryId, page]
 *             properties:
 *               searchHistoryId:
 *                 type: string
 *                 format: uuid
 *                 description: ID nhận từ lần upload ảnh đầu tiên
 *               page:
 *                 type: integer
 *                 minimum: 1
 *                 example: 2
 *               limit:
 *                 type: integer
 *                 enum: [20]
 *                 default: 20
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
 *                 message:
 *                   type: string
 *                   example: Tìm kiếm hình ảnh thành công
 *                 data:
 *                   type: object
 *                   properties:
 *                     searchHistoryId:
 *                       type: string
 *                       format: uuid
 *                       example: 1d6a60bb-21fc-4f1d-a058-15c452c751e4
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
 *                       example: 87
 *                     page:
 *                       type: integer
 *                       example: 2
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
 *       404:
 *         description: Không tìm thấy lịch sử của người dùng
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
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

/**
 * @swagger
 * /search/history/click:
 *   post:
 *     tags: [Search]
 *     summary: Lưu ảnh người dùng đã chọn trong kết quả tìm kiếm
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [searchHistoryId, clickedImageId]
 *             properties:
 *               searchHistoryId:
 *                 type: string
 *                 format: uuid
 *               clickedImageId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: Lưu lượt click thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Đã lưu lượt click
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     searchHistoryId:
 *                       type: string
 *                       format: uuid
 *                     clickedImageId:
 *                       type: string
 *                       format: uuid
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: ID không hợp lệ
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
 *       404:
 *         description: Không tìm thấy lịch sử hoặc ảnh
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Lưu lượt click thất bại
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
searchRouter.post('/history/click', validateSearchClick, recordSearchClick);

export default searchRouter;
