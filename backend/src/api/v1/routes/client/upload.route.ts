import { Router } from 'express';
import { uploadMultiple } from '../../middlewares/upload.middleware.js';
import { uploadImages } from '../../controllers/client/upload.controller.js';

const uploadRouter = Router();

/**
 * @swagger
 * /upload:
 *   post:
 *     tags: [Client - Upload]
 *     summary: Upload ảnh hàng loạt
 *     description: |
 *       Upload tối đa 4 ảnh cùng lúc (jpg, png, webp). Mỗi file tối đa 10MB.
 *       Backend xử lý từng file một: lưu vào disk, insert DB, tạo bản ghi index với trạng thái PENDING.
 *       Sau đó đẩy các ảnh thành công vào hàng đợi RabbitMQ để Indexing Service xử lý sau.
 *       Nếu 1 file bị lỗi (sai định dạng, lỗi DB), các file còn lại vẫn được xử lý bình thường.
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
 *     responses:
 *       201:
 *         description: Upload hoàn tất. Mảng data chứa kết quả từng file (thành công hoặc thất bại).
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
 *                   example: "Upload hoàn tất: 3 thành công, 2 thất bại"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/UploadResultItem'
 *             examples:
 *               allSuccess:
 *                 summary: Tất cả ảnh upload thành công
 *                 value:
 *                   success: true
 *                   message: "Upload hoàn tất: 2 thành công, 0 thất bại"
 *                   data:
 *                     - filename: "photo1.jpg"
 *                       success: true
 *                       id: "a1b2c3d4-..."
 *                       path: "storage/images/index/a1b2c3d4.jpg"
 *                     - filename: "photo2.png"
 *                       success: true
 *                       id: "e5f6g7h8-..."
 *                       path: "storage/images/index/e5f6g7h8.png"
 *               partialFailure:
 *                 summary: Một số ảnh bị lỗi
 *                 value:
 *                   success: true
 *                   message: "Upload hoàn tất: 1 thành công, 1 thất bại"
 *                   data:
 *                     - filename: "photo1.jpg"
 *                       success: true
 *                       id: "a1b2c3d4-..."
 *                       path: "storage/images/index/a1b2c3d4.jpg"
 *                     - filename: "invalid.bmp"
 *                       success: false
 *                       error: "Định dạng không hợp lệ"
 *       400:
 *         description: Không có file nào được gửi lên
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "Vui lòng chọn ít nhất 1 ảnh"
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
 *         description: Lỗi server không xác định
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "Upload thất bại"
 */
uploadRouter.post('/', uploadMultiple, uploadImages);

export default uploadRouter;
