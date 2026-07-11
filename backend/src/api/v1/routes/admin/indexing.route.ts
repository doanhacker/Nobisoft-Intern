import { Router } from 'express';
import { uploadMultiple } from '../../middlewares/upload.middleware.js';
import { batchIndexing } from '../../controllers/admin/indexing.controller.js';

const indexingRouter = Router();

/**
 * @swagger
 * /admin/indexing:
 *   post:
 *     tags: [Admin - Indexing]
 *     summary: Batch indexing ảnh
 *     description: Upload nhiều ảnh cùng lúc. Backend gửi từng ảnh sang AI service để lấy embedding + OCR, sau đó lưu vào PostgreSQL, Qdrant và disk.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [images]
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Danh sách ảnh (tối đa 20 file, mỗi file tối đa 10MB). Chấp nhận jpg, png, webp.
 *     responses:
 *       201:
 *         description: Indexing hoàn tất (có thể 1 số ảnh thất bại)
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
 *                   example: "Indexing hoàn tất: 3 thành công, 1 thất bại"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/IndexingResult'
 *       400:
 *         description: Không có file hoặc file không hợp lệ
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
 *       403:
 *         description: Không có quyền admin
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
indexingRouter.post('/', uploadMultiple, batchIndexing);

export default indexingRouter;
