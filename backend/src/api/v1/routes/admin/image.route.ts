import { Router } from 'express';
import * as imageController from '../../controllers/admin/image.controller.js';
import { validateImageListQuery, validateImageIdParam } from '../../validators/admin/image.validate.js';

const imageRouter = Router();

/**
 * @swagger
 * /admin/images:
 *   get:
 *     tags: [Admin - Images]
 *     summary: Danh sách ảnh đã index
 *     description: Trả về danh sách ảnh đã được index, phân trang. Mỗi ảnh kèm preview OCR (tối đa 3 dòng).
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Số trang
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Số lượng kết quả trên mỗi trang
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
 *         description: "Lọc từ ngày (ISO 8601)"
 *       - in: query
 *         name: toDate
 *         schema:
 *           type: string
 *           format: date
 *         description: "Lọc đến ngày (ISO 8601)"
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
 *                   example: Lấy danh sách ảnh thành công
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ImageListItem'
 *                 meta:
 *                   $ref: '#/components/schemas/PaginationMeta'
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
imageRouter.get('/', validateImageListQuery, imageController.listImages);

/**
 * @swagger
 * /admin/images/{id}:
 *   get:
 *     tags: [Admin - Images]
 *     summary: Chi tiết ảnh
 *     description: Trả về thông tin chi tiết của 1 ảnh, bao gồm toàn bộ dữ liệu OCR.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Image ID
 *     responses:
 *       200:
 *         description: Lấy chi tiết thành công
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
 *                   example: Lấy chi tiết ảnh thành công
 *                 data:
 *                   $ref: '#/components/schemas/ImageListItem'
 *       404:
 *         description: Ảnh không tồn tại
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
imageRouter.get('/:id', validateImageIdParam, imageController.getImage);

/**
 * @swagger
 * /admin/images/{id}:
 *   delete:
 *     tags: [Admin - Images]
 *     summary: Xoá ảnh
 *     description: Xoá ảnh khỏi hệ thống. Cascade xoá dữ liệu trong PostgreSQL (image + image_index + image_ocr), Qdrant (vector), và file trên disk.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Image ID
 *     responses:
 *       200:
 *         description: Xoá thành công
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
 *                   example: Xoá ảnh thành công
 *                 data:
 *                   type: "null"
 *       404:
 *         description: Ảnh không tồn tại
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
imageRouter.delete('/:id', validateImageIdParam, imageController.removeImage);

export default imageRouter;
