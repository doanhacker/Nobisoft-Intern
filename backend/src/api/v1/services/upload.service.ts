import { prisma } from '../../../config/prisma.js';
import { publishToIndexingQueue } from '../../../services/rabbitmq.service.js';
import path from 'path';
import fs from 'fs';

export async function processImageUploads(files: Express.Multer.File[]) {
  const results = [];
  const successImages = [];

  for (const file of files) {
    // 1. Kiểm tra định dạng (multer đôi khi lọt nếu setup lỏng)
    const ext = file.originalname.split('.').pop()?.toLowerCase() || '';
    if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      results.push({ filename: file.originalname, success: false, error: 'Định dạng không hợp lệ' });
      continue;
    }

    try {
      const id = file.filename.split('.')[0] as string;
      const relativePath = path.normalize(file.path).replace(/\\/g, '/');

      // 2. Insert vào DB
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

  // 3. Đẩy vào RabbitMQ
  if (successImages.length > 0) {
    await publishToIndexingQueue(successImages);
  }

  return results;
}
