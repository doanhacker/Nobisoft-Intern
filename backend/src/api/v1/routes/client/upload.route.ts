import { Router } from 'express';
import { uploadMultiple } from '../../middlewares/upload.middleware.js';
import { uploadImages, getBatchStatusController } from '../../controllers/client/upload.controller.js';

const uploadRouter = Router();

/**
 * @swagger
 * /upload:
 *   post:
 *     tags: [Client - Upload]
 *     summary: Upload ảnh (hỗ trợ batch upload)
 *     description: |
 *       Upload tối đa 100 ảnh mỗi lần gọi (jpg, png, webp, avif). Mỗi file tối đa 10MB.
 *
 *       **Luồng batch upload:**
 *       1. **Lần gọi đầu** (không truyền `batchId`): Server tạo batch mới, trả về `batchId`.
 *       2. **Lần gọi tiếp theo** (truyền `batchId`): Ảnh được gắn vào batch đã có.
 *       3. **Lần gọi cuối** (truyền `batchId` + `isLastChunk=true`): Đánh dấu batch đã upload xong.
 *
 *       Mỗi lần gọi, ảnh được đẩy ngay vào hàng đợi RabbitMQ để Worker xử lý song song.
 *       FE dùng `GET /upload/batch/:batchId` để polling trạng thái indexing.
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
 *                 maxItems: 4
 *                 description: Danh sách ảnh (tối đa 4 file, mỗi file tối đa 10MB)
 *               batchId:
 *                 type: string
 *                 format: uuid
 *                 description: ID batch từ lần upload trước. Bỏ trống ở lần đầu tiên.
 *               isLastChunk:
 *                 type: string
 *                 enum: ['true', 'false']
 *                 default: 'false'
 *                 description: Đặt `true` ở lần upload cuối cùng để đánh dấu batch hoàn tất.
 *     responses:
 *       201:
 *         description: Upload hoàn tất
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
 *                   example: "Upload hoàn tất: 3 thành công, 0 thất bại"
 *                 data:
 *                   type: object
 *                   properties:
 *                     batchId:
 *                       type: string
 *                       format: uuid
 *                     results:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/UploadResultItem'
 *       400:
 *         description: Không có file hoặc batch không hợp lệ
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
 */
uploadRouter.post('/', uploadMultiple, uploadImages);

/**
 * @swagger
 * /upload/batch/{batchId}:
 *   get:
 *     tags: [Client - Upload]
 *     summary: Kiểm tra trạng thái batch indexing
 *     description: |
 *       FE gọi endpoint này để polling trạng thái indexing sau khi upload xong.
 *       Gọi mỗi 3-5 giây cho đến khi `status` chuyển sang `COMPLETED`.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: batchId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID batch cần kiểm tra
 *     responses:
 *       200:
 *         description: Trạng thái batch
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/BatchStatusResponse'
 *       404:
 *         description: Batch không tồn tại
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
uploadRouter.get('/batch/:batchId', getBatchStatusController);

export default uploadRouter;
