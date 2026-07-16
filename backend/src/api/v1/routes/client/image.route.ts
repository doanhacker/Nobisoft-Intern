import { Router } from 'express';
import * as imageController from '../../controllers/client/image.controller.js';
import { validateImageListQuery, validateImageIdParam } from '../../validators/client/image.validate.js';
import { requireAdmin } from '../../middlewares/auth.middleware.js';

const imageRouter = Router();

/**
 * @swagger
 * /images:
 *   get:
 *     tags: [Client - Images]
 *     summary: Lấy danh sách ảnh
 *     description: |
 *       Trả về danh sách ảnh đã upload, phân trang.
 *       Hỗ trợ lọc theo định dạng file và khoảng thời gian.
 *       Mỗi ảnh kèm theo trạng thái index và preview OCR (tối đa 3 dòng).
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Số trang (mặc định 1)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Số kết quả mỗi trang (mặc định 20, tối đa 100)
 *       - in: query
 *         name: fileFormat
 *         schema:
 *           type: string
 *           enum: [jpg, png, webp]
 *         description: Lọc theo định dạng ảnh
 *       - in: query
 *         name: fromDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Lọc từ ngày (yyyy-mm-dd)
 *       - in: query
 *         name: toDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Lọc đến ngày (yyyy-mm-dd)
 *     responses:
 *       200:
 *         description: Lấy danh sách thành công
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
 *                   example: "Lấy danh sách ảnh thành công"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ImageListItem'
 *                 meta:
 *                   $ref: '#/components/schemas/PaginationMeta'
 *       400:
 *         description: Query params không hợp lệ (page âm, limit vượt quá 100...)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "Query params không hợp lệ"
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
 *         description: Lỗi server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "Lấy danh sách ảnh thất bại"
 */
imageRouter.get('/', validateImageListQuery, imageController.listImages);

/**
 * @swagger
 * /images/{id}:
 *   get:
 *     tags: [Client - Images]
 *     summary: Chi tiết ảnh
 *     description: |
 *       Trả về thông tin chi tiết của 1 ảnh, bao gồm toàn bộ dữ liệu OCR.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Image ID (UUID)
 *     responses:
 *       200:
 *         description: Lấy chi tiết ảnh thành công
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
 *                   example: "Lấy chi tiết ảnh thành công"
 *                 data:
 *                   $ref: '#/components/schemas/ImageListItem'
 *       400:
 *         description: ID không đúng định dạng UUID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "Image ID không hợp lệ"
 *       401:
 *         description: Chưa đăng nhập hoặc token hết hạn
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "Vui lòng đăng nhập"
 *       404:
 *         description: Ảnh không tồn tại trong hệ thống
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "Ảnh không tồn tại"
 *       500:
 *         description: Lỗi server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "Lấy chi tiết ảnh thất bại"
 */
imageRouter.get('/:id', validateImageIdParam, imageController.getImage);

/**
 * @swagger
 * /images/{id}:
 *   delete:
 *     tags: [Client - Images]
 *     summary: Xóa ảnh (chỉ Admin)
 *     description: |
 *       Xóa ảnh khỏi hệ thống. Chỉ Admin mới có quyền thực hiện.
 *       Cascade xóa: PostgreSQL (image + image_index + image_ocr), Qdrant (vector), và file trên disk.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Image ID (UUID)
 *     responses:
 *       200:
 *         description: Xóa ảnh thành công
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
 *                   example: "Xóa ảnh thành công"
 *                 data:
 *                   type: "null"
 *       400:
 *         description: ID không đúng định dạng UUID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "Image ID không hợp lệ"
 *       401:
 *         description: Chưa đăng nhập hoặc token hết hạn
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "Vui lòng đăng nhập"
 *       403:
 *         description: Không có quyền Admin
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "Bạn không có quyền truy cập"
 *       404:
 *         description: Ảnh không tồn tại trong hệ thống
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "Ảnh không tồn tại"
 *       500:
 *         description: Lỗi server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "Xóa ảnh thất bại"
 */
imageRouter.delete('/:id', requireAdmin, validateImageIdParam, imageController.removeImage);

export default imageRouter;
