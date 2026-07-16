import { Router } from 'express';
import * as userController from '../../controllers/admin/user.controller.js';
import { validateUserListQuery, validateSearchHistoryQuery } from '../../validators/admin/user.validate.js';

const userRouter = Router();

/**
 * @swagger
 * /admin/users:
 *   get:
 *     tags: [Admin - Users]
 *     summary: Lấy danh sách người dùng
 *     description: |
 *       Trả về danh sách users kèm tổng số lượt tìm kiếm của mỗi user. Hỗ trợ phân trang và tìm kiếm theo email hoặc tên.
 *       Chỉ Admin mới có quyền truy cập.
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
 *           default: 10
 *         description: Số kết quả mỗi trang (mặc định 10, tối đa 100)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Tìm kiếm theo email hoặc tên người dùng
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
 *                   example: "Lấy danh sách người dùng thành công"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/UserListItem'
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
 *               message: "Lấy danh sách người dùng thất bại"
 */
userRouter.get('/', validateUserListQuery, userController.getUsers);

/**
 * @swagger
 * /admin/users/{userId}/search-history:
 *   get:
 *     tags: [Admin - Users]
 *     summary: Lấy lịch sử tìm kiếm của người dùng
 *     description: |
 *       Trả về danh sách lịch sử tìm kiếm phân trang của một user cụ thể, bao gồm ảnh đã click (nếu có).
 *       Hỗ trợ lọc theo loại tìm kiếm. Chỉ Admin mới có quyền truy cập.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của người dùng (UUID)
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
 *         name: searchType
 *         schema:
 *           $ref: '#/components/schemas/SearchType'
 *         description: Lọc theo loại tìm kiếm (IMAGE_ONLY, TEXT_SEMANTIC, TEXT_OCR)
 *     responses:
 *       200:
 *         description: Lấy lịch sử thành công
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
 *                   example: "Lấy lịch sử tìm kiếm thành công"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SearchHistoryItem'
 *                 meta:
 *                   $ref: '#/components/schemas/PaginationMeta'
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
 *         description: Người dùng không tồn tại
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "Người dùng không tồn tại"
 *       500:
 *         description: Lỗi server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "Lấy lịch sử tìm kiếm thất bại"
 */
userRouter.get('/:userId/search-history', validateSearchHistoryQuery, userController.getSearchHistory);

export default userRouter;
