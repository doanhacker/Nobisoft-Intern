import { Router } from 'express';
import { getImageRecommendations } from '../../controllers/client/recommendation.controller.js';
import { validateRecommendationQuery } from '../../validators/client/recommendation.validate.js';

const recommendationRouter = Router();

/**
 * @swagger
 * /recommendations:
 *   get:
 *     tags: [Client - Recommendations]
 *     summary: Gợi ý ảnh dựa trên lịch sử click
 *     description: |
 *       Phân tích lịch sử click gần nhất của user, tính vector trung bình (weighted mean với time decay),
 *       sau đó tìm các ảnh tương tự trong hệ thống.
 *
 *       **Yêu cầu:** User cần có ít nhất 3 lượt click. Nếu chưa đủ, API trả về data rỗng với message thông báo.
 *
 *       **Cách hoạt động:**
 *       1. Lấy 30 ảnh click gần nhất (distinct) của user
 *       2. Tính weighted mean vector (ảnh click gần nhất có trọng số cao hơn)
 *       3. Tìm các ảnh có vector tương tự, loại trừ ảnh đã click
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *     responses:
 *       200:
 *         description: Gợi ý thành công (hoặc data rỗng nếu chưa đủ lịch sử click)
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
 *                   example: Gợi ý ảnh thành công
 *                 data:
 *                   type: object
 *                   properties:
 *                     results:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/SearchImageResult'
 *                     clickCount:
 *                       type: integer
 *                       description: Số lượng ảnh click đã dùng để tính gợi ý
 *                       example: 15
 *                 meta:
 *                   $ref: '#/components/schemas/PaginationMeta'
 *       400:
 *         description: Tham số không hợp lệ
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
 *         description: Lỗi hệ thống
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
recommendationRouter.get('/', validateRecommendationQuery, getImageRecommendations);

export default recommendationRouter;
