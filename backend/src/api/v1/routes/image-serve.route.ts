import { Router } from 'express';
import { serveImage } from '../controllers/image-serve.controller.js';

const imageServeRouter = Router();

/**
 * @swagger
 * /images/{subfolder}/{filename}:
 *   get:
 *     tags: [Images]
 *     summary: Serve ảnh (hỗ trợ resize on-the-fly)
 *     description: |
 *       Trả về ảnh gốc hoặc ảnh đã resize theo query params.
 *
 *       **Resize theo width:**
 *       ```
 *       GET /images/index/uuid.jpg?w=1024
 *       ```
 *
 *       **Resize theo height:**
 *       ```
 *       GET /images/index/uuid.jpg?h=768
 *       ```
 *
 *       **Resize theo cả width và height (fit inside):**
 *       ```
 *       GET /images/index/uuid.jpg?w=1024&h=768
 *       ```
 *
 *       **Ảnh gốc (không resize):**
 *       ```
 *       GET /images/index/uuid.jpg
 *       ```
 *
 *       Giới hạn resize: min 16px, max 4096px. Ảnh không bị phóng to nếu nhỏ hơn target.
 *       Response có `Cache-Control: public, max-age=86400` (cache 1 ngày).
 *     parameters:
 *       - in: path
 *         name: subfolder
 *         required: true
 *         schema:
 *           type: string
 *           enum: [index, search]
 *         description: Loại ảnh (index = ảnh đã upload, search = ảnh tìm kiếm)
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *         description: Tên file ảnh (vd. `uuid.jpg`)
 *         example: "550e8400-e29b-41d4-a716-446655440000.jpg"
 *       - in: query
 *         name: w
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 16
 *           maximum: 4096
 *         description: Width mong muốn (px). Giữ tỉ lệ gốc.
 *       - in: query
 *         name: h
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 16
 *           maximum: 4096
 *         description: Height mong muốn (px). Giữ tỉ lệ gốc.
 *     responses:
 *       200:
 *         description: Ảnh binary
 *         content:
 *           image/jpeg:
 *             schema:
 *               type: string
 *               format: binary
 *           image/png:
 *             schema:
 *               type: string
 *               format: binary
 *           image/webp:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Subfolder hoặc filename không hợp lệ
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Ảnh không tồn tại
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Lỗi server khi xử lý ảnh
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
imageServeRouter.get('/:subfolder/:filename', serveImage);

export default imageServeRouter;
