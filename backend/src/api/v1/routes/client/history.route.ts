import { Router } from 'express';
import { getHistory } from '../../controllers/client/history.controller.js';
import { validateUserSearchHistoryQuery } from '../../validators/client/history.validate.js';

const historyRouter = Router();

/**
 * @swagger
 * /history:
 *   get:
 *     tags: [Client - Search History]
 *     summary: Lấy lịch sử tìm kiếm của người dùng hiện tại
 *     description: |
 *       Trả lịch sử tìm kiếm Image, Semantic và OCR, sắp xếp bản ghi mới nhất trước.
 *       Có thể lọc theo khoảng thời gian:
 *       - Chỉ nhập fromDate: lấy lịch sử từ ngày đó trở đi.
 *       - Chỉ nhập toDate: lấy lịch sử đến hết ngày đó.
 *       - Nhập cả fromDate và toDate: lấy lịch sử trong khoảng thời gian đó.
 *       - Không nhập fromDate và toDate: lấy toàn bộ lịch sử.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Trang cần lấy
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           enum: [20]
 *           default: 20
 *         description: Cố định 20 lịch sử mỗi trang
 *       - in: query
 *         name: searchType
 *         schema:
 *           $ref: '#/components/schemas/SearchType'
 *         description: Lọc theo IMAGE_ONLY, TEXT_SEMANTIC, TEXT_OCR hoặc TEXT_PROMPT
 *       - in: query
 *         name: fromDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Lấy lịch sử từ ngày này, định dạng YYYY-MM-DD, theo múi giờ Asia/Ho_Chi_Minh
 *         example: '2026-07-01'
 *       - in: query
 *         name: toDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Lấy lịch sử đến hết ngày này, định dạng YYYY-MM-DD, theo múi giờ Asia/Ho_Chi_Minh
 *         example: '2026-07-23'
 *     responses:
 *       200:
 *         description: Lấy lịch sử tìm kiếm thành công
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
 *                   example: Lấy lịch sử tìm kiếm thành công
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/UserSearchHistoryItem'
 *                 meta:
 *                   $ref: '#/components/schemas/PaginationMeta'
 *       400:
 *         description: Tham số không hợp lệ hoặc page vượt quá tổng số trang
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
 *       500:
 *         description: Lỗi Backend hoặc database
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
historyRouter.get('/', validateUserSearchHistoryQuery, getHistory);

export default historyRouter;
