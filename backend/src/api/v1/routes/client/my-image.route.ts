import { Router } from 'express';
import * as myImageController from '../../controllers/client/my-image.controller.js';
import { validateMyImageListQuery } from '../../validators/client/my-image.validate.js';
import { validateImageIdParam } from '../../validators/shared/image-id.validate.js';

const myImageRouter = Router();

/**
 * @swagger
 * /images/me:
 *   get:
 *     tags: [Client - My Images]
 *     summary: Lấy danh sách ảnh của user đang đăng nhập
 *     description: |
 *       Trả về danh sách ảnh do chính user upload, phân trang.
 *       Hỗ trợ lọc theo khoảng thời gian upload.
 *       Chỉ trả về ảnh đã được index thành công.
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
 *         description: Lọc theo định dạng ảnh (jpg, png, webp)
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
 *         description: Query params không hợp lệ
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
myImageRouter.get('/', validateMyImageListQuery, myImageController.listMyImages);

/**
 * @swagger
 * /images/me/{id}:
 *   delete:
 *     tags: [Client - My Images]
 *     summary: Xoá ảnh của user
 *     description: |
 *       Xoá ảnh khỏi hệ thống. User chỉ có thể xoá ảnh do chính mình upload.
 *       Cascade xoá: PostgreSQL (image + image_index + image_ocr), Qdrant (vector), và file trên disk.
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
 *         description: Xoá ảnh thành công
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
 *                   example: "Xoá ảnh thành công"
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
 *         description: Ảnh không thuộc về user hiện tại
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "Bạn không có quyền xoá ảnh này"
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
 *               message: "Xoá ảnh thất bại"
 */
myImageRouter.delete('/:id', validateImageIdParam, myImageController.removeMyImage);

export default myImageRouter;
