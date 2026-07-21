import type { Request, Response } from 'express';
import { Router } from 'express';
import {
  recordSearchClick,
  searchByImage,
  searchByTextOcr,
  searchByTextSemantic,
  searchByTextSemanticHistory,
} from '../../controllers/client/search.controller.js';
import {
  uploadSearchImage,
  validateSearchClick,
  validateSearchImage,
  validateSearchTextOcr,
  validateSearchTextSemantic,
  validateSearchTextSemanticHistory,
} from '../../validators/client/search.validate.js';

const searchRouter = Router();

/**
 * @swagger
 * /search/text:
 *   get:
 *     tags: [Client - Search]
 *     summary: Tìm kiếm hình ảnh bằng văn bản
 *     description: |
 *       Tìm kiếm hình ảnh theo nội dung văn bản với 2 chế độ:
 *       - **semantic**: Tìm ảnh có nội dung liên quan đến mô tả (dùng AI embedding)
 *       - **ocr**: Tìm ảnh chứa text khớp với từ khóa (dùng OCR text matching)
 *
 *       **Tìm kiếm mới:** `GET /search/text?q=...&mode=semantic|ocr&page=1&limit=20`
 *       **Chuyển trang (OCR):** `GET /search/text?searchHistoryId=...&mode=ocr&page=2&limit=20`
 *       **Chuyển trang (semantic):** Dùng `/search/text/history/{searchHistoryId}`
 *
 *       Với mode `ocr`, chỉ gửi `q` khi tìm mới hoặc `searchHistoryId` khi chuyển trang (không gửi cả 2).
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: false
 *         schema:
 *           type: string
 *           minLength: 1
 *           maxLength: 500
 *         description: Nội dung tìm kiếm (bắt buộc khi tìm mới, bỏ khi chuyển trang OCR).
 *         example: meme hài hước
 *       - in: query
 *         name: searchHistoryId
 *         required: false
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID lịch sử tìm kiếm OCR (chỉ dùng khi chuyển trang mode=ocr).
 *       - in: query
 *         name: mode
 *         required: true
 *         schema:
 *           type: string
 *           enum: [semantic, ocr]
 *         description: |
 *           Chế độ tìm kiếm:
 *           - `semantic` — AI hiểu ngữ nghĩa, trả `similarityScore`
 *           - `ocr` — Matching text trong ảnh, trả `ocrMatches[]` với toạ độ
 *         example: ocr
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
 *         description: Tìm kiếm thành công. Response schema phụ thuộc mode.
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - title: Semantic Response
 *                   type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: true
 *                     message:
 *                       type: string
 *                       example: Tìm kiếm semantic thành công
 *                     data:
 *                       type: object
 *                       properties:
 *                         searchHistoryId:
 *                           type: string
 *                           format: uuid
 *                         searchType:
 *                           type: string
 *                           enum: [TEXT_SEMANTIC]
 *                         results:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/SearchImageResult'
 *                         total:
 *                           type: integer
 *                           example: 87
 *                         page:
 *                           type: integer
 *                           example: 1
 *                         limit:
 *                           type: integer
 *                           example: 20
 *                 - title: OCR Response
 *                   type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: true
 *                     message:
 *                       type: string
 *                       example: Tìm kiếm OCR thành công
 *                     data:
 *                       type: object
 *                       properties:
 *                         searchHistoryId:
 *                           type: string
 *                           format: uuid
 *                         searchType:
 *                           type: string
 *                           enum: [TEXT_OCR]
 *                         results:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/SearchTextOcrResultItem'
 *                     meta:
 *                       $ref: '#/components/schemas/PaginationMeta'
 *       400:
 *         description: Tham số tìm kiếm không hợp lệ hoặc trang không tồn tại
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
 *       404:
 *         description: Không tìm thấy lịch sử tìm kiếm của người dùng
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Lỗi AI Service, Qdrant hoặc Backend
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
searchRouter.get('/text', (req: Request, res: Response) => {
  const mode = req.query.mode;
  if (mode === 'ocr') {
    validateSearchTextOcr(req, res, () => searchByTextOcr(req, res));
  } else {
    validateSearchTextSemantic(req, res, () => searchByTextSemantic(req, res));
  }
});

/**
 * @swagger
 * /search/text/history/{searchHistoryId}:
 *   get:
 *     tags: [Client - Search]
 *     summary: Lấy trang tiếp theo của Semantic Search
 *     description: |
 *       Gọi chuyển trang theo dạng `GET /search/text/history/{searchHistoryId}?mode=semantic&page=2&limit=20`.
 *       Endpoint này dùng lại lịch sử và không tạo SearchHistory mới.
 *
 *       **Lưu ý:** OCR search chuyển trang qua `GET /search/text?searchHistoryId=...&mode=ocr&page=2`.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: searchHistoryId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID lịch sử semantic cần lấy kết quả.
 *       - in: query
 *         name: mode
 *         required: true
 *         schema:
 *           type: string
 *           enum: [semantic]
 *         example: semantic
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
 *           enum: [20]
 *           default: 20
 *     responses:
 *       200:
 *         description: Lấy kết quả semantic thành công
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
 *                   example: Tìm kiếm semantic thành công
 *                 data:
 *                   type: object
 *                   properties:
 *                     searchHistoryId:
 *                       type: string
 *                       format: uuid
 *                     searchType:
 *                       type: string
 *                       enum: [TEXT_SEMANTIC]
 *                     results:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/SearchImageResult'
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                       example: 20
 *       400:
 *         description: Tham số phân trang không hợp lệ hoặc trang không tồn tại
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
 *       404:
 *         description: Không tìm thấy lịch sử semantic
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Lỗi AI Service, Qdrant hoặc Backend
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
searchRouter.get(
  '/text/history/:searchHistoryId',
  validateSearchTextSemanticHistory,
  searchByTextSemanticHistory,
);

/**
 * @swagger
 * /search/image:
 *   post:
 *     tags: [Client - Search]
 *     summary: Tìm ảnh tương tự bằng hình ảnh
 *     description: Lần đầu gửi ảnh để tạo lịch sử. Khi đổi trang, kể cả quay lại trang 1, chỉ gửi searchHistoryId và page để không tạo lịch sử mới.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [image]
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Ảnh cần tìm (jpg, png, webp, tối đa 10MB)
 *               page:
 *                 type: integer
 *                 enum: [1]
 *                 default: 1
 *                 description: Tìm kiếm mới luôn bắt đầu từ trang 1
 *               limit:
 *                 type: integer
 *                 enum: [20]
 *                 default: 20
 *                 description: Cố định 20 kết quả mỗi trang
 *         application/json:
 *           schema:
 *             type: object
 *             required: [searchHistoryId, page]
 *             properties:
 *               searchHistoryId:
 *                 type: string
 *                 format: uuid
 *                 description: ID nhận từ lần upload ảnh đầu tiên
 *               page:
 *                 type: integer
 *                 minimum: 1
 *                 example: 2
 *               limit:
 *                 type: integer
 *                 enum: [20]
 *                 default: 20
 *     responses:
 *       200:
 *         description: Tìm kiếm thành công
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
 *                   example: Tìm kiếm hình ảnh thành công
 *                 data:
 *                   type: object
 *                   properties:
 *                     searchHistoryId:
 *                       type: string
 *                       format: uuid
 *                       example: 1d6a60bb-21fc-4f1d-a058-15c452c751e4
 *                     searchType:
 *                       type: string
 *                       enum: [IMAGE_ONLY]
 *                       example: IMAGE_ONLY
 *                     results:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/SearchImageResult'
 *                     total:
 *                       type: integer
 *                       example: 87
 *                     page:
 *                       type: integer
 *                       example: 2
 *                     limit:
 *                       type: integer
 *                       example: 20
 *       400:
 *         description: Không có file hoặc file không hợp lệ
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "Vui lòng chọn một ảnh để tìm kiếm"
 *       401:
 *         description: Chưa đăng nhập hoặc token hết hạn
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Không tìm thấy lịch sử của người dùng
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Lỗi AI Service, Qdrant hoặc Backend
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "Tìm kiếm hình ảnh thất bại"
 */
searchRouter.post('/image', uploadSearchImage, validateSearchImage, searchByImage);

/**
 * @swagger
 * /search/history/click:
 *   post:
 *     tags: [Search]
 *     summary: Lưu ảnh người dùng đã chọn trong kết quả tìm kiếm
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [searchHistoryId, clickedImageId]
 *             properties:
 *               searchHistoryId:
 *                 type: string
 *                 format: uuid
 *               clickedImageId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: Lưu lượt click thành công
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
 *                   example: Đã lưu lượt click
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     searchHistoryId:
 *                       type: string
 *                       format: uuid
 *                     clickedImageId:
 *                       type: string
 *                       format: uuid
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: ID không hợp lệ
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
 *       404:
 *         description: Không tìm thấy lịch sử hoặc ảnh
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Lưu lượt click thất bại
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
searchRouter.post('/history/click', validateSearchClick, recordSearchClick);

export default searchRouter;
