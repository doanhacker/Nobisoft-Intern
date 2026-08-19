import { Router } from 'express';
import * as imageController from '../../controllers/admin/image.controller.js';
import {
  validateImageIdsBody,
  validateImageListQuery,
  validatePermanentDeleteImageIdsBody,
  validateTrashImageListQuery,
} from '../../validators/admin/image.validate.js';
import { validateImageIdParam } from '../../validators/shared/image-id.validate.js';

const imageRouter = Router();

/**
 * @swagger
 * /admin/images:
 *   get:
 *     tags: [Admin - Images]
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
 *         description: Lọc từ ngày (yyyy-mm-dd), không lớn hơn ngày hiện tại theo múi giờ Asia/Ho_Chi_Minh
 *       - in: query
 *         name: toDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Lọc đến hết ngày (yyyy-mm-dd), không lớn hơn ngày hiện tại theo múi giờ Asia/Ho_Chi_Minh
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
 *       403:
 *         description: Không có quyền Admin
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "Bạn không có quyền truy cập"
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
 * /admin/images/trash:
 *   get:
 *     tags: [Admin - Images]
 *     summary: Lấy danh sách ảnh trong thùng rác
 *     description: |
 *       Trả về các ảnh đã xóa mềm nhưng chưa quá thời hạn lưu trong thùng rác, sắp xếp theo thời gian xóa mới nhất.
 *       Ảnh đã quá `TRASH_RETENTION_DAYS` không còn hiển thị và sẽ được scheduler xóa vĩnh viễn.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *     responses:
 *       200:
 *         description: Lấy danh sách thùng rác thành công
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
 *                   example: "Lấy danh sách ảnh trong thùng rác thành công"
 *                 data:
 *                   type: array
 *                   items:
 *                     allOf:
 *                       - $ref: '#/components/schemas/ImageListItem'
 *                       - type: object
 *                         properties:
 *                           deletedAt:
 *                             type: string
 *                             format: date-time
 *                           permanentDeleteAt:
 *                             type: string
 *                             format: date-time
 *                             description: Thời điểm ảnh đủ điều kiện bị xóa vĩnh viễn
 *                           remainingDays:
 *                             type: integer
 *                             minimum: 1
 *                             description: Số ngày còn lại; giá trị 1 bao gồm trường hợp còn dưới 24 giờ
 *                             example: 17
 *                 meta:
 *                   $ref: '#/components/schemas/PaginationMeta'
 *       400:
 *         description: Query params không hợp lệ
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Chưa đăng nhập hoặc token hết hạn
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Không có quyền Admin
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Lỗi server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
imageRouter.get('/trash', validateTrashImageListQuery, imageController.listTrashImages);

/**
 * @swagger
 * /admin/images/{id}:
 *   get:
 *     tags: [Admin - Images]
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
 *               message: "Lấy chi tiết ảnh thất bại"
 */
imageRouter.get('/:id', validateImageIdParam, imageController.getImage);

/**
 * @swagger
 * /admin/images/bulk-delete:
 *   patch:
 *     tags: [Admin - Images]
 *     summary: Xóa mềm một hoặc nhiều ảnh
 *     description: |
 *       Admin gửi toàn bộ ID ảnh đã chọn. Muốn xóa một ảnh thì gửi mảng có một ID.
 *       Tối đa 10.000 ID mỗi request; Backend tự chia batch để xử lý.
 *       Với danh sách lớn, Frontend nên chia tối đa 1.000 ID/request và gửi tuần tự để giảm nguy cơ timeout.
 *       Ảnh được chuyển vào thùng rác, không bị xóa khỏi Storage và Qdrant.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [imageIds]
 *             properties:
 *               imageIds:
 *                 type: array
 *                 minItems: 1
 *                 maxItems: 10000
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 example:
 *                   - "3fa85f64-5717-4562-b3fc-2c963f66afa6"
 *                   - "550e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: Chuyển ảnh vào thùng rác thành công
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
 *                   example: "Đã chuyển 2 ảnh vào thùng rác"
 *                 data:
 *                   type: object
 *                   properties:
 *                     requested:
 *                       type: integer
 *                       example: 2
 *                     deleted:
 *                       type: integer
 *                       example: 2
 *                     failedIds:
 *                       type: array
 *                       items:
 *                         type: string
 *                         format: uuid
 *                       example: []
 *       400:
 *         description: Danh sách ID rỗng, vượt quá 10.000 phần tử hoặc có ID không đúng định dạng UUID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "Danh sách ảnh không hợp lệ"
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
 *       500:
 *         description: Lỗi server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "Xóa nhiều ảnh thất bại"
 */
imageRouter.patch('/bulk-delete', validateImageIdsBody, imageController.bulkDeleteImages);

/**
 * @swagger
 * /admin/images/bulk-restore:
 *   patch:
 *     tags: [Admin - Images]
 *     summary: Khôi phục một hoặc nhiều ảnh
 *     description: |
 *       Admin gửi toàn bộ ID ảnh cần khôi phục. Muốn khôi phục một ảnh thì gửi mảng có một ID.
 *       Tối đa 10.000 ID mỗi request; Backend tự chia batch để xử lý.
 *       Với danh sách lớn, Frontend nên chia tối đa 1.000 ID/request và gửi tuần tự để giảm nguy cơ timeout.
 *       Backend đặt `deletedAt` về null và bật lại vector trong Qdrant.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [imageIds]
 *             properties:
 *               imageIds:
 *                 type: array
 *                 minItems: 1
 *                 maxItems: 10000
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 example:
 *                   - "3fa85f64-5717-4562-b3fc-2c963f66afa6"
 *                   - "550e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: Khôi phục ảnh thành công
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
 *                   example: "Đã khôi phục 2 ảnh"
 *                 data:
 *                   type: object
 *                   properties:
 *                     requested:
 *                       type: integer
 *                       example: 2
 *                     restored:
 *                       type: integer
 *                       example: 2
 *                     failedIds:
 *                       type: array
 *                       items:
 *                         type: string
 *                         format: uuid
 *                       example: []
 *       400:
 *         description: Danh sách ID rỗng, vượt quá 10.000 phần tử hoặc có ID không đúng định dạng UUID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Chưa đăng nhập hoặc token hết hạn
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Không có quyền Admin
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Lỗi server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
imageRouter.patch('/bulk-restore', validateImageIdsBody, imageController.restoreImages);

/**
 * @swagger
 * /admin/images/permanent:
 *   delete:
 *     tags: [Admin - Images]
 *     summary: Xóa vĩnh viễn một hoặc nhiều ảnh trong thùng rác
 *     description: |
 *       Chỉ xóa các ảnh đã nằm trong thùng rác. Backend xóa lần lượt khỏi Storage, Qdrant và PostgreSQL.
 *       Tối đa 500 ID/request. Khi xóa tối đa 5.000 ảnh, Frontend chia thành tối đa 10 request và gửi tuần tự.
 *       `failedIds` có thể gửi lại; `skippedIds` là ảnh không tồn tại hoặc không nằm trong thùng rác.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [imageIds]
 *             properties:
 *               imageIds:
 *                 type: array
 *                 minItems: 1
 *                 maxItems: 500
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 example:
 *                   - "3fa85f64-5717-4562-b3fc-2c963f66afa6"
 *                   - "550e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: Hoàn tất xử lý yêu cầu xóa vĩnh viễn
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
 *                   example: "Đã xóa vĩnh viễn 2 ảnh"
 *                 data:
 *                   type: object
 *                   properties:
 *                     requested:
 *                       type: integer
 *                       example: 2
 *                     deleted:
 *                       type: integer
 *                       example: 2
 *                     deletedIds:
 *                       type: array
 *                       items:
 *                         type: string
 *                         format: uuid
 *                     failedIds:
 *                       type: array
 *                       items:
 *                         type: string
 *                         format: uuid
 *                     skippedIds:
 *                       type: array
 *                       items:
 *                         type: string
 *                         format: uuid
 *       400:
 *         description: Danh sách ID rỗng, vượt quá 500 phần tử hoặc có ID không đúng định dạng UUID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Chưa đăng nhập hoặc token hết hạn
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Không có quyền Admin
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Lỗi server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
imageRouter.delete(
  '/permanent',
  validatePermanentDeleteImageIdsBody,
  imageController.permanentlyDeleteImages,
);

export default imageRouter;
