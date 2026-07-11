import { prisma } from '../../../config/prisma.js';
import { Prisma } from '../../../generated/prisma/client.js';
import { processImage } from '../../../services/ai.service.js';
import { upsertImageVector } from '../../../services/qdrant.service.js';
import { saveImageToDisk, deleteImageFromDisk } from '../../../utils/storage.util.js';
import { removeVietnameseDiacritics } from '../../../utils/normalize.util.js';
import type { IndexingFileInput, IndexingResult } from '../../../types/indexing.type.js';

export async function indexImages(files: IndexingFileInput[]): Promise<IndexingResult[]> {
  const results: IndexingResult[] = [];

  for (const file of files) {
    try {
      const result = await indexSingleImage(file);
      results.push(result);
    } catch (error) {
      results.push({
        filename: file.originalname,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return results;
}

async function indexSingleImage(file: IndexingFileInput): Promise<IndexingResult> {
  // 1. Gọi AI service → embedding + OCR + processDurationMs
  const aiResponse = await processImage(file.buffer, file.originalname);

  if (!aiResponse.success) {
    throw new Error('AI service returned unsuccessful response');
  }

  const { embedding, ocrLines, processDurationMs } = aiResponse.data;

  // 2. Lưu file ra disk
  const savedFile = await saveImageToDisk(file.buffer, file.mimetype, 'index');

  try {
    // 3. Lưu vào PostgreSQL (transaction)
    const image = await prisma.$transaction(async (tx) => {
      const img = await tx.image.create({
        data: {
          path: savedFile.path,
          width: savedFile.width,
          height: savedFile.height,
          fileSize: savedFile.fileSize,
          fileFormat: savedFile.fileFormat,
        },
      });

      const imageIndex = await tx.imageIndex.create({
        data: {
          imageId: img.id,
          processDurationMs,
        },
      });

      if (ocrLines.length > 0) {
        await tx.imageOcr.createMany({
          data: ocrLines.map((line) => ({
            imageIndexId: imageIndex.id,
            rawText: line.rawText,
            normalizedText: removeVietnameseDiacritics(line.rawText),
            confidenceScore: line.confidenceScore,
            boundingBoxes: line.boundingBox ?? Prisma.DbNull,
          })),
        });
      }

      return img;
    });

    // 4. Upsert vector vào Qdrant
    await upsertImageVector(image.id, embedding, {
      imageId: image.id,
      path: savedFile.path,
      fileFormat: savedFile.fileFormat,
      hasOcr: ocrLines.length > 0,
    });

    return {
      filename: file.originalname,
      success: true,
      imageId: image.id,
    };
  } catch (error) {
    // Rollback: xoá file đã lưu nếu DB/Qdrant lỗi
    await deleteImageFromDisk(savedFile.path);
    throw error;
  }
}
