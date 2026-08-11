import { prisma } from '../../../config/prisma.js';
import { publishToIndexingQueue } from '../../../services/rabbitmq.service.js';
import fs from 'fs';

/**
 * Xử lý upload ảnh theo batch.
 * - Lần đầu (không có batchId): Tạo BatchIndex mới.
 * - Lần sau (có batchId): Gắn ảnh vào batch đã có.
 * - Lần cuối (isLastChunk=true): Đánh dấu batch đã upload xong, chuyển sang PROCESSING.
 *
 * Mỗi lần upload đều đẩy ảnh vào RabbitMQ ngay lập tức để worker xử lý song song.
 */
export async function processImageUploads(
  files: Express.Multer.File[],
  batchId?: string,
  isLastChunk?: boolean,
  userId?: string,
) {
  const results: Array<{
    filename: string;
    success: boolean;
    id?: string;
    path?: string;
    error?: string;
  }> = [];
  const successImages: Array<{ id: string; path: string }> = [];

  // 1. Tạo hoặc validate BatchIndex
  let batch;
  if (batchId) {
    batch = await prisma.batchIndex.findUnique({ where: { id: batchId } });
    if (!batch) {
      throw new Error('Batch không tồn tại');
    }
    if (batch.status !== 'UPLOADING') {
      throw new Error('Batch đã kết thúc upload, không thể thêm ảnh');
    }
  } else {
    batch = await prisma.batchIndex.create({ data: userId ? { uploadedBy: userId } : {} });
  }

  // 2. Xử lý từng file
  for (const file of files) {
    const ext = file.filename.split('.').pop()?.toLowerCase() || '';
    if (!['jpg', 'jpeg', 'png', 'webp', 'avif'].includes(ext)) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      results.push({ filename: file.originalname, success: false, error: 'Định dạng không hợp lệ' });
      continue;
    }

    try {
      const id = file.filename.split('.')[0] as string;
      const relativePath = `/images/index/${file.filename}`;

      await prisma.$transaction(async (tx) => {
        await tx.image.create({
          data: {
            id,
            path: relativePath,
            width: null,
            height: null,
            fileSize: file.size,
            fileFormat: ext,
          },
        });

        await tx.imageIndex.create({
          data: {
            imageId: id,
            batchId: batch.id,
            status: 'PENDING',
          },
        });
      });

      successImages.push({ id, path: relativePath });
      results.push({ filename: file.originalname, success: true, id, path: relativePath });
    } catch (error) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      results.push({ filename: file.originalname, success: false, error: 'Lỗi lưu database' });
    }
  }

  // 3. Cập nhật totalImages của batch sau mỗi lần upload và cập nhật status nếu là chunk cuối
  const totalImages = await prisma.imageIndex.count({ where: { batchId: batch.id } });
  
  let status: 'UPLOADING' | 'PROCESSING' = isLastChunk ? 'PROCESSING' : 'UPLOADING';

  await prisma.batchIndex.update({
    where: { id: batch.id },
    data: {
      totalImages,
      status,
    },
  });

  // 4. Đẩy ngay vào RabbitMQ (không chờ lần cuối) sau khi đã cập nhật DB để tránh race condition
  if (successImages.length > 0) {
    await publishToIndexingQueue(batch.id, successImages);
  }

  return { batchId: batch.id, results };
}

/**
 * Lấy trạng thái của một batch để FE polling.
 */
export async function getBatchStatus(batchId: string) {
  const batch = await prisma.batchIndex.findUnique({
    where: { id: batchId },
  });

  if (!batch) return null;

  // Lấy danh sách ảnh bị lỗi (nếu có)
  let failedImages: Array<{ id: string; imageId: string }> = [];
  if (batch.status === 'COMPLETED' && batch.failedCount > 0) {
    const failedIndexes = await prisma.imageIndex.findMany({
      where: { batchId, status: 'FAILED' },
      select: { id: true, imageId: true },
    });
    failedImages = failedIndexes;
  }

  return {
    batchId: batch.id,
    status: batch.status,
    totalImages: batch.totalImages,
    successCount: batch.successCount,
    failedCount: batch.failedCount,
    totalDurationMs: batch.totalDurationMs,
    createdAt: batch.createdAt,
    failedImages,
  };
}
