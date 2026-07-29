/**
 * ═══════════════════════════════════════════════════════════════════════
 *  push-to-rabbitmq.ts
 *  ─────────────────────────────────────────────────────────────────────
 *  Đọc file TSV unsplash, tạo record Image + ImageIndex trong DB,
 *  rồi đẩy message vào RabbitMQ để indexing-worker xử lý (embed + OCR).
 *
 *  Chạy bên trong container backend:
 *    npx tsx src/scripts/push-to-rabbitmq.ts [options]
 *
 *  Options:
 *    --skip  <N>       Bỏ qua N ảnh đầu tiên trong dataset      (default: 0)
 *    --limit <N>       Chỉ xử lý tối đa N ảnh                   (default: tất cả)
 *    --chunk <N>       Số ảnh gom lại mỗi message RabbitMQ       (default: 10)
 *    --batch-id <ID>   Sử dụng BatchIndex ID đã có sẵn trong DB
 *    --dataset <PATH>  Đường dẫn file TSV                        (default: /app/datasets/unsplash-research/photos.tsv000)
 *    --dry-run         Chỉ log preview, không ghi DB / gửi MQ
 *    --skip-db         Bỏ qua bước tạo record DB, chỉ đẩy MQ
 *                      (dùng khi DB đã có sẵn record từ lần chạy trước)
 *
 *  Examples:
 *    # Đẩy 5000 ảnh đầu tiên, chunk 20 ảnh/message
 *    npx tsx src/scripts/push-to-rabbitmq.ts --limit 5000 --chunk 20 --batch-id c5704779-f1a0-4865-b0ea-1c35d5f4513e
 *
 *    # Bỏ qua 5000 ảnh đầu, đẩy 5000 ảnh tiếp theo
 *    npx tsx src/scripts/push-to-rabbitmq.ts --skip 5000 --limit 5000 --batch-id c5704779-f1a0-4865-b0ea-1c35d5f4513e
 *
 *    # Đẩy tất cả 25000 ảnh
 *    npx tsx src/scripts/push-to-rabbitmq.ts --batch-id c5704779-f1a0-4865-b0ea-1c35d5f4513e
 *
 *    # Preview trước khi chạy thật
 *    npx tsx src/scripts/push-to-rabbitmq.ts --skip 10000 --limit 1000 --dry-run
 * ═══════════════════════════════════════════════════════════════════════
 */

import fs from 'fs';
import crypto from 'crypto';
import * as amqp from 'amqplib';
import { prisma } from '../config/prisma.js';

// ─── Constants ───
const INDEXING_QUEUE = 'image_indexing_queue';

// ─── CLI Args Parser ───
function parseArgs() {
  const args = process.argv.slice(2);
  const opts: Record<string, string> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (!next || next.startsWith('--')) {
        opts[key] = 'true';
      } else {
        opts[key] = next;
        i++;
      }
    }
  }

  return {
    skip: parseInt(opts['skip'] || '0'),
    limit: parseInt(opts['limit'] || '0'),       // 0 = no limit (all)
    chunk: parseInt(opts['chunk'] || '10'),       // images per RabbitMQ message
    batchId: opts['batch-id'] || '',
    dataset: opts['dataset'] || '/app/datasets/unsplash-research/photos.tsv000',
    dryRun: opts['dry-run'] === 'true',
    skipDb: opts['skip-db'] === 'true',
  };
}

// ─── TSV Parser ───
interface TsvRow {
  photo_id: string;
  photo_image_url: string;
  photo_width: string;
  photo_height: string;
  [key: string]: string;
}

function parseTsv(filepath: string): TsvRow[] {
  const content = fs.readFileSync(filepath, 'utf-8');
  const lines = content.split('\n').filter((l) => l.trim());
  const headers = lines[0]!.split('\t');

  return lines.slice(1).map((line) => {
    const values = line.split('\t');
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = values[i] || '';
    });
    return row as unknown as TsvRow;
  });
}

// ─── RabbitMQ Helper ───
async function connectRabbitMQ() {
  const url = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
  console.log(`🐇 Đang kết nối RabbitMQ: ${url.replace(/\/\/.*@/, '//***@')}`);
  const connection = await amqp.connect(url);
  const channel = await connection.createChannel();
  await channel.assertQueue(INDEXING_QUEUE, { durable: true });
  return { connection, channel };
}

// ─── Main ───
async function main() {
  const config = parseArgs();
  const startTime = Date.now();

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║          PUSH UNSPLASH IMAGES → RabbitMQ                    ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  console.log(`  📂 Dataset  : ${config.dataset}`);
  console.log(`  ⏭️  Skip     : ${config.skip}`);
  console.log(`  🔢 Limit    : ${config.limit || 'ALL'}`);
  console.log(`  📦 Chunk    : ${config.chunk} images/message`);
  console.log(`  🏷️  BatchId  : ${config.batchId || '(sẽ tạo mới)'}`);
  console.log(`  🧪 Dry Run  : ${config.dryRun}`);
  console.log(`  📝 Skip DB  : ${config.skipDb}`);
  console.log('');

  // ────────────────────────────────────────────────────────────
  // 1. Parse dataset
  // ────────────────────────────────────────────────────────────
  if (!fs.existsSync(config.dataset)) {
    console.error(`❌ File không tồn tại: ${config.dataset}`);
    process.exit(1);
  }

  const allRows = parseTsv(config.dataset);
  console.log(`📊 Tổng số ảnh trong dataset: ${allRows.length}`);

  // 2. Apply skip & limit
  const slicedRows = config.limit > 0
    ? allRows.slice(config.skip, config.skip + config.limit)
    : allRows.slice(config.skip);

  console.log(`🎯 Sau skip=${config.skip}, limit=${config.limit || 'ALL'}: ${slicedRows.length} ảnh`);

  if (slicedRows.length === 0) {
    console.log('\n⚠️  Không có ảnh nào để xử lý. Kiểm tra lại --skip và --limit.');
    process.exit(0);
  }

  // Filter valid URLs
  const validRows = slicedRows.filter((r) => r.photo_image_url);
  if (validRows.length !== slicedRows.length) {
    console.log(`⚠️  Bỏ qua ${slicedRows.length - validRows.length} ảnh không có URL`);
  }

  console.log(`✅ Ảnh hợp lệ: ${validRows.length}`);
  console.log(`📨 Sẽ tạo ~${Math.ceil(validRows.length / config.chunk)} messages\n`);

  // ────────────────────────────────────────────────────────────
  // DRY RUN — preview only
  // ────────────────────────────────────────────────────────────
  if (config.dryRun) {
    console.log('═══ DRY RUN MODE ═══');
    console.log(`Sẽ xử lý ${validRows.length} ảnh, chia thành ${Math.ceil(validRows.length / config.chunk)} messages`);
    console.log('\nSample ảnh đầu tiên:');
    for (let i = 0; i < Math.min(5, validRows.length); i++) {
      console.log(`  [${config.skip + i}] ${validRows[i]!.photo_id} → ${validRows[i]!.photo_image_url}`);
    }
    if (validRows.length > 5) {
      console.log(`  ... và ${validRows.length - 5} ảnh khác`);
    }
    console.log('\nSample ảnh cuối:');
    for (let i = Math.max(0, validRows.length - 3); i < validRows.length; i++) {
      console.log(`  [${config.skip + i}] ${validRows[i]!.photo_id} → ${validRows[i]!.photo_image_url}`);
    }
    process.exit(0);
  }

  // ────────────────────────────────────────────────────────────
  // 3. Resolve or create BatchIndex
  // ────────────────────────────────────────────────────────────
  let batchId = config.batchId;
  if (batchId) {
    const existing = await prisma.batchIndex.findUnique({ where: { id: batchId } });
    if (!existing) {
      console.error(`❌ BatchIndex với id=${batchId} không tồn tại trong DB.`);
      await prisma.$disconnect();
      process.exit(1);
    }
    console.log(`✅ Sử dụng BatchIndex: ${batchId} (status: ${existing.status})`);
  } else {
    const newBatch = await prisma.batchIndex.create({
      data: { status: 'PROCESSING' },
    });
    batchId = newBatch.id;
    console.log(`🆕 Tạo BatchIndex mới: ${batchId}`);
  }

  // ────────────────────────────────────────────────────────────
  // 4. Create Image + ImageIndex records in DB
  // ────────────────────────────────────────────────────────────
  const imageRecords: Array<{ id: string; path: string }> = [];

  if (config.skipDb) {
    console.log('\n⏭️  --skip-db: Bỏ qua tạo DB records. Tạo image records từ TSV...');
    for (const row of validRows) {
      // Khi skip-db, tạo UUID mới — worker sẽ xử lý bằng path (URL)
      imageRecords.push({
        id: crypto.randomUUID(),
        path: row.photo_image_url,
      });
    }
    console.log(`   ✅ ${imageRecords.length} image records (in-memory only)\n`);
  } else {
    console.log('\n📝 Đang tạo records trong PostgreSQL...');
    let dbSuccess = 0;
    let dbSkipped = 0;

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i]!;
      const imageId = crypto.randomUUID();

      try {
        await prisma.$transaction(async (tx) => {
          await tx.image.create({
            data: {
              id: imageId,
              path: row.photo_image_url,
              width: parseInt(row.photo_width) || null,
              height: parseInt(row.photo_height) || null,
              fileSize: null,
              fileFormat: 'jpg',
            },
          });

          await tx.imageIndex.create({
            data: {
              imageId: imageId,
              batchId: batchId,
              status: 'PENDING',
            },
          });
        });

        imageRecords.push({ id: imageId, path: row.photo_image_url });
        dbSuccess++;
      } catch (error) {
        dbSkipped++;
        const errCode = (error as any)?.code;
        if (errCode === 'P2002') {
          // Unique constraint violation — skip silently
          if (dbSkipped <= 3) {
            console.log(`   ⚠️  [${i + 1}] Đã tồn tại, bỏ qua: ${row.photo_id}`);
          } else if (dbSkipped === 4) {
            console.log(`   ⚠️  ... (sẽ ẩn các lỗi trùng tiếp theo)`);
          }
        } else {
          console.error(`   ❌ [${i + 1}] Lỗi DB [${errCode}]: ${(error as Error).message}`);
        }
      }

      // Progress log every 1000 or at end
      if ((i + 1) % 1000 === 0 || i === validRows.length - 1) {
        const pct = (((i + 1) / validRows.length) * 100).toFixed(1);
        console.log(`   📊 DB Progress: ${i + 1}/${validRows.length} (${pct}%) — ✅ ${dbSuccess} created, ⏭️ ${dbSkipped} skipped`);
      }
    }

    console.log(`\n✅ DB Insert hoàn tất: ${dbSuccess} created, ${dbSkipped} skipped\n`);

    // Update batch totalImages
    if (dbSuccess > 0) {
      const totalInBatch = await prisma.imageIndex.count({ where: { batchId } });
      await prisma.batchIndex.update({
        where: { id: batchId },
        data: {
          totalImages: totalInBatch,
          status: 'PROCESSING',
        },
      });
    }
  }

  if (imageRecords.length === 0) {
    console.log('⚠️  Không có ảnh mới nào để đẩy vào RabbitMQ.');
    await prisma.$disconnect();
    process.exit(0);
  }

  // ────────────────────────────────────────────────────────────
  // 5. Publish messages to RabbitMQ
  // ────────────────────────────────────────────────────────────
  const { connection, channel } = await connectRabbitMQ();
  console.log('✅ Kết nối RabbitMQ thành công!\n');

  const totalMessages = Math.ceil(imageRecords.length / config.chunk);
  console.log(`📤 Đẩy ${imageRecords.length} ảnh → queue "${INDEXING_QUEUE}"`);
  console.log(`   Chunk: ${config.chunk} images/msg → ${totalMessages} messages\n`);

  let messagesSent = 0;

  for (let i = 0; i < imageRecords.length; i += config.chunk) {
    const chunk = imageRecords.slice(i, i + config.chunk);

    const message = JSON.stringify({
      batchId,
      images: chunk,
    });

    channel.sendToQueue(
      INDEXING_QUEUE,
      Buffer.from(message),
      { persistent: true },
    );

    messagesSent++;

    // Progress log
    if (messagesSent % 100 === 0 || i + config.chunk >= imageRecords.length) {
      const pct = ((messagesSent / totalMessages) * 100).toFixed(1);
      console.log(`   📨 [${messagesSent}/${totalMessages}] (${pct}%) — ảnh ${i + 1}–${Math.min(i + config.chunk, imageRecords.length)}`);
    }
  }

  // ────────────────────────────────────────────────────────────
  // 6. Cleanup & Summary
  // ────────────────────────────────────────────────────────────
  await channel.close();
  await connection.close();
  await prisma.$disconnect();

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║                       ✅ HOÀN TẤT                          ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║  🏷️  Batch ID       : ${batchId}`);
  console.log(`║  📊 Images pushed  : ${imageRecords.length}`);
  console.log(`║  📨 Messages sent  : ${messagesSent}`);
  console.log(`║  📦 Chunk size     : ${config.chunk} images/message`);
  console.log(`║  ⏱️  Duration       : ${elapsed}s`);
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
}

main().catch((err) => {
  console.error('💥 Fatal error:', err);
  process.exit(1);
});
