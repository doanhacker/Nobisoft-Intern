import fs from 'fs';
import { prisma } from '../config/prisma.js';
import { Prisma } from '../generated/prisma/client.js';
import { processImage } from '../services/ai.service.js';
import { upsertImageVector } from '../services/qdrant.service.js';
import { qdrantClient, ensureQdrantCollection } from '../config/qdrant.js';
import { removeVietnameseDiacritics } from '../utils/normalize.util.js';

// ─── Config ───
const LIMIT = parseInt(process.env.IMPORT_LIMIT || '100');
const DATASET_PATH =
  process.env.DATASET_PATH || '/app/datasets/unsplash-research/photos.tsv000';
const LOG_FILE = process.env.LOG_FILE || 'import.log';
const UNSPLASH_WIDTH = 640; // Tiết kiệm băng thông do AI tự động resize về 224x224

const SHOULD_CLEAR = process.argv.includes('--clear');

// ─── TSV Parser ───
function parseTsv(filepath: string) {
  const content = fs.readFileSync(filepath, 'utf-8');
  const lines = content.split('\n').filter((l) => l.trim());
  const headers = lines[0]!.split('\t');

  return lines.slice(1).map((line) => {
    const values = line.split('\t');
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = values[i] || '';
    });
    return row;
  });
}

// ─── Main ───
async function main() {
  console.log(`\n[START] Unsplash Import — limit=${LIMIT}`);
  console.log(`[INFO] Dataset: ${DATASET_PATH}\n`);

  if (SHOULD_CLEAR) {
    console.log(`[WARNING] Phát hiện cờ --clear. Đang tiến hành dọn dẹp hệ thống...`);
    // 1. Clear PostgreSQL
    const deleted = await prisma.image.deleteMany({});
    console.log(`   [SUCCESS] Đã xóa ${deleted.count} ảnh từ PostgreSQL`);

    // 2. Clear Qdrant
    const collections = await qdrantClient.getCollections();
    const exists = collections.collections.some(
      (col) => col.name === 'images',
    );
    if (exists) {
      await qdrantClient.deleteCollection('images');
      console.log(`   [SUCCESS] Đã xóa collection "images" trong Qdrant`);
    }

    // 3. Xóa log file (Đã bỏ qua vì shell đang ghi log trực tiếp vào file này, nếu xóa shell sẽ bị mất file descriptor)
    console.log(`   [DONE] Hệ thống đã được làm sạch!\n`);
  }

  // Ensure Qdrant collection
  await ensureQdrantCollection();

  // 1. Parse TSV
  const rows = parseTsv(DATASET_PATH);
  console.log(`[INFO] Total photos in dataset: ${rows.length}`);

  // 2. Get already-imported IDs from log file instead of DB query
  const existingIds = new Set<string>();
  if (fs.existsSync(LOG_FILE)) {
    const logContent = fs.readFileSync(LOG_FILE, 'utf-8');
    // Regex matches lines like: [1/25000] [SUCCESS] photoId (27662.05ms)
    const matches = logContent.matchAll(/\[SUCCESS\] ([a-zA-Z0-9_-]+) \(/g);
    for (const match of matches) {
      existingIds.add(match[1]!);
    }
  }
  console.log(`[INFO] Already imported: ${existingIds.size} photos (read from ${LOG_FILE})`);

  // 3. Filter unimported, apply limit
  const toImport = rows
    .filter((row) => {
      return row.photo_image_url && !existingIds.has(row.photo_id!);
    })
    .slice(0, LIMIT);
  console.log(`[INFO] Will import: ${toImport.length} photos\n`);

  if (toImport.length === 0) {
    console.log('[SUCCESS] Nothing to import — all photos already exist in DB.\n');
    await prisma.$disconnect();
    return;
  }

  // 4. Process sequentially
  let success = 0;
  let failed = 0;
  const startTime = Date.now();

  for (let i = 0; i < toImport.length; i++) {
    const row = toImport[i]!;
    const progress = `[${i + 1}/${toImport.length}]`;

    try {
      // 4a. Fetch image from Unsplash URL (resized)
      const imageUrl = `${row.photo_image_url}?w=${UNSPLASH_WIDTH}`;
      const res = await fetch(imageUrl);
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);

      const buffer = Buffer.from(await res.arrayBuffer());
      const mimetype = res.headers.get('content-type') || 'image/jpeg';

      // 4b. Send to AI service (embed + OCR)
      const aiResponse = await processImage(
        buffer,
        `${row.photo_id}.jpg`,
        mimetype,
      );
      if (!aiResponse.success || !aiResponse.data) {
        throw new Error(aiResponse.error_message || 'AI service failed');
      }

      const { embedding, ocrLines, processDurationMs } = aiResponse.data;

      // 4c. Save to PostgreSQL (transaction)
      const image = await prisma.$transaction(async (tx) => {
        const img = await tx.image.create({
          data: {
            path: row.photo_image_url!,
            width: parseInt(row.photo_width!) || 0,
            height: parseInt(row.photo_height!) || 0,
            fileSize: buffer.length,
            fileFormat: 'jpg',
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

      // 4d. Upsert vector to Qdrant
      await upsertImageVector(image.id, embedding, {
        imageId: image.id,
        path: row.photo_image_url!,
        fileFormat: 'jpg',
        hasOcr: ocrLines.length > 0,
      });

      success++;
      console.log(
        `${progress} [SUCCESS] ${row.photo_id} (${processDurationMs}ms, ${buffer.length} bytes)`,
      );
    } catch (error) {
      failed++;
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`${progress} [FAILED] ${row.photo_id}: ${msg}`);
    }
  }

  // 5. Summary
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`[SUMMARY] Import complete in ${elapsed}s`);
  console.log(`   [SUCCESS] Success: ${success}`);
  console.log(`   [FAILED] Failed:  ${failed}`);
  console.log(`   [INFO] Total in DB: ${existingIds.size + success} photos\n`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
