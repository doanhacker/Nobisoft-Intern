import fs from 'fs';
import { prisma } from '../config/prisma.js';
import {
  qdrantClient,
  QDRANT_COLLECTION_NAME,
  ensureQdrantCollection,
} from '../config/qdrant.js';

// ─── Config ───
const DATA_DIR =
  process.env.EXPORT_DATA_DIR || '/app/datasets/exported-data';

// ─── Helpers ───
function loadJson<T>(filename: string): T {
  const filepath = `${DATA_DIR}/${filename}`;
  if (!fs.existsSync(filepath)) {
    throw new Error(`File not found: ${filepath}`);
  }
  const content = fs.readFileSync(filepath, 'utf-8');
  return JSON.parse(content) as T;
}

// ─── Types ───
interface ExportedImage {
  id: string;
  path: string;
  width: number;
  height: number;
  fileSize: number;
  fileFormat: string;
  createdAt: string;
}

interface ExportedImageIndex {
  id: string;
  imageId: string;
  processDurationMs: number | null;
  indexedAt: string;
}

interface ExportedImageOcr {
  id: string;
  imageIndexId: string;
  rawText: string;
  normalizedText: string;
  confidenceScore: number;
  boundingBoxes: unknown;
}

interface ExportedQdrantPoint {
  id: string;
  vector: number[];
  payload: Record<string, unknown>;
}

const SHOULD_CLEAR = process.argv.includes('--clear');

// ─── Main ───
async function main() {
  console.log(`\n[START] Data Import — from ${DATA_DIR}\n`);

  if (SHOULD_CLEAR) {
    console.log(`[WARNING] Phát hiện cờ --clear. Đang tiến hành dọn dẹp hệ thống...`);
    const deleted = await prisma.image.deleteMany({});
    console.log(`   [SUCCESS] Đã xóa ${deleted.count} ảnh từ PostgreSQL`);

    const collections = await qdrantClient.getCollections();
    const exists = collections.collections.some(
      (col) => col.name === QDRANT_COLLECTION_NAME,
    );
    if (exists) {
      await qdrantClient.deleteCollection(QDRANT_COLLECTION_NAME);
      console.log(`   [SUCCESS] Đã xóa collection "${QDRANT_COLLECTION_NAME}" trong Qdrant`);
    }
    console.log(`   [DONE] Hệ thống đã được làm sạch!\n`);
  }

  // ─── Step 1: Import PostgreSQL data ───
  console.log('─── PostgreSQL Import ───\n');

  // Load exported files
  const images = loadJson<ExportedImage[]>('images.json');
  const imageIndexes = loadJson<ExportedImageIndex[]>('image_index.json');
  const imageOcrs = loadJson<ExportedImageOcr[]>('image_ocr.json');

  console.log(`[INFO] Loaded: ${images.length} images, ${imageIndexes.length} indexes, ${imageOcrs.length} OCR lines`);

  // Bỏ qua kiểm tra trùng lặp theo yêu cầu
  const newImages = images;

  if (newImages.length > 0) {
    const newImageIds = new Set(newImages.map((img) => img.id));

    // Insert images in batches
    const BATCH_SIZE = 500;
    for (let i = 0; i < newImages.length; i += BATCH_SIZE) {
      const batch = newImages.slice(i, i + BATCH_SIZE);
      await prisma.image.createMany({
        data: batch.map((img) => ({
          id: img.id,
          path: img.path,
          width: img.width,
          height: img.height,
          fileSize: img.fileSize,
          fileFormat: img.fileFormat,
          createdAt: new Date(img.createdAt),
        })),
        skipDuplicates: true,
      });
      console.log(`  [SUCCESS] Images: ${Math.min(i + BATCH_SIZE, newImages.length)}/${newImages.length}`);
    }

    // Insert image indexes (only for new images)
    const newIndexes = imageIndexes.filter((idx) => newImageIds.has(idx.imageId));
    
    let dummyBatchId = '';
    if (newIndexes.length > 0) {
      const dummyBatch = await prisma.batchIndex.create({
        data: { status: 'COMPLETED' },
      });
      dummyBatchId = dummyBatch.id;
    }

    for (let i = 0; i < newIndexes.length; i += BATCH_SIZE) {
      const batch = newIndexes.slice(i, i + BATCH_SIZE);
      await prisma.imageIndex.createMany({
        data: batch.map((idx) => ({
          id: idx.id,
          imageId: idx.imageId,
          batchId: dummyBatchId,
          indexedAt: new Date(idx.indexedAt),
        })),
        skipDuplicates: true,
      });
      console.log(`  [SUCCESS] Indexes: ${Math.min(i + BATCH_SIZE, newIndexes.length)}/${newIndexes.length}`);
    }

    // Insert image OCR lines (only for new indexes)
    const newIndexIds = new Set(newIndexes.map((idx) => idx.id));
    const newOcrs = imageOcrs.filter((ocr) => newIndexIds.has(ocr.imageIndexId));
    for (let i = 0; i < newOcrs.length; i += BATCH_SIZE) {
      const batch = newOcrs.slice(i, i + BATCH_SIZE);
      await prisma.imageOcr.createMany({
        data: batch.map((ocr) => ({
          id: ocr.id,
          imageIndexId: ocr.imageIndexId,
          rawText: ocr.rawText,
          normalizedText: ocr.normalizedText,
          confidenceScore: ocr.confidenceScore,
          boundingBoxes: ocr.boundingBoxes as any,
        })),
        skipDuplicates: true,
      });
      console.log(`  [SUCCESS] OCR lines: ${Math.min(i + BATCH_SIZE, newOcrs.length)}/${newOcrs.length}`);
    }
  }

  console.log(`\n[SUCCESS] PostgreSQL import done!\n`);

  // ─── Step 2: Import Qdrant vectors ───
  console.log('─── Qdrant Import ───\n');

  await ensureQdrantCollection();

  const qdrantFile = `${DATA_DIR}/qdrant_vectors.json`;
  if (!fs.existsSync(qdrantFile)) {
    console.log('[WARNING] qdrant_vectors.json not found — skipping Qdrant import.');
    console.log('   Bạn có thể dùng Qdrant snapshot restore thay thế.\n');
  } else {
    const vectors = loadJson<ExportedQdrantPoint[]>('qdrant_vectors.json');
    console.log(`[INFO] Loaded: ${vectors.length} vectors`);

    // Upsert in batches
    const QDRANT_BATCH = 100;
    for (let i = 0; i < vectors.length; i += QDRANT_BATCH) {
      const batch = vectors.slice(i, i + QDRANT_BATCH);
      await qdrantClient.upsert(QDRANT_COLLECTION_NAME, {
        points: batch.map((point) => ({
          id: point.id,
          vector: point.vector,
          payload: point.payload,
        })),
      });
      console.log(`  [SUCCESS] Vectors: ${Math.min(i + QDRANT_BATCH, vectors.length)}/${vectors.length}`);
    }
    console.log(`\n[SUCCESS] Qdrant import done!\n`);
  }

  // ─── Summary ───
  const totalImages = await prisma.image.count();
  console.log(`${'─'.repeat(50)}`);
  console.log(`[SUMMARY] Total images in DB: ${totalImages}`);
  console.log(`[SUCCESS] Import hoàn tất!\n`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
