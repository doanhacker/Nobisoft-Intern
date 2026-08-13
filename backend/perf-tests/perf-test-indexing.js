#!/usr/bin/env node
/**
 * ══════════════════════════════════════════════════════════════
 * PERFORMANCE TEST: INDEXING (Upload + Worker Processing)
 * ══════════════════════════════════════════════════════════════
 *
 * Luồng indexing gồm 2 phase riêng biệt:
 *
 *   Phase 1 — UPLOAD (Backend API):
 *     POST /api/upload → Multer save → DB insert → RabbitMQ publish
 *     Đo: thời gian API phản hồi (HTTP response time)
 *
 *   Phase 2 — INDEXING (Worker C# qua RabbitMQ):
 *     Worker consume → Resize → AI Service batch → Qdrant upsert → DB update
 *     Đo: thời gian từ upload xong đến batch COMPLETED
 *         + totalDurationMs (server-side AI processing time)
 *
 * Ma trận test: [totalImages, maxConcurrentApiCalls]
 *   - totalImages: số ảnh cần upload trong 1 batch (1, 10, 100, 1000)
 *   - maxConcurrentApiCalls: tối đa bao nhiêu API call gửi song song
 *     (mỗi API call tối đa 20 ảnh)
 *
 *   Ví dụ: [100, 100] = upload 100 ảnh trong 1 batch,
 *          cần 5 API calls (mỗi call 20 ảnh), gửi tối đa 100 song song
 *          → cả 5 calls bắn cùng lúc.
 *
 * Ảnh test: đọc từ thư mục val2017/ (COCO val2017 dataset, 5000 ảnh thật)
 *   - Mỗi scenario dùng ảnh KHÁC NHAU (không trùng với scenario trước)
 *   - Nếu chạy lại, tăng START_IMAGE_INDEX để bỏ qua ảnh đã index
 *
 * Chạy:  node perf-test-indexing.js
 * Output: JSON kết quả in ra stdout, progress in ra stderr
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ─── CẤU HÌNH ──────────────────────────────────────────────────
const BASE_URL = 'https://visualsearch.duckdns.org';
const ACCESS_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImYyNDc2YmRkLWUwNjEtNDgwZi1hZjljLTI0NjIzN2YwY2JmMSIsImVtYWlsIjoidXNlckBleGFtcGxlLmNvbSIsInJvbGUiOiJBRE1JTiIsImlhdCI6MTc4NjYxODkzMSwiZXhwIjoxNzg2NzA1MzMxfQ.5Xc659gKoPlKRdDi6RJ-VqlgOpqy5j2naZVfNZPrxWE';

const IMAGES_PER_API_CALL = 20;
const REQUEST_TIMEOUT_MS = 120_000;       // 2 phút timeout mỗi API call
const POLL_INTERVAL_MS = 3_000;           // Poll batch status mỗi 3 giây
const POLL_TIMEOUT_MS = 600_000;          // Timeout polling: 10 phút
const DELAY_BETWEEN_SCENARIOS_MS = 5_000; // Nghỉ giữa các scenario

// Bắt đầu lấy ảnh từ vị trí nào trong pool.
// Nếu lần trước test bị lỗi giữa chừng, tăng số này để bỏ qua ảnh đã index.
// Ví dụ: lần 1 chạy hết 3333 ảnh → lần 2 đặt = 3333
const START_IMAGE_INDEX = 0;

// Đường dẫn thư mục ảnh COCO val2017
const IMAGE_DIR = join(__dirname, 'val2017');

// Ma trận test: [totalImages, maxConcurrentApiCalls]
//   totalImages: tổng ảnh cần upload trong 1 batch
//   maxConcurrentApiCalls: tối đa bao nhiêu API call chạy song song
const SCENARIOS = [
  // ── Batch 8000 ảnh (400 API calls) ──
  [8000, 200],  // 400 calls, 200 song song
];
// ────────────────────────────────────────────────────────────────

// ─── ĐỌC ẢNH THẬT TỪ COCO val2017 ─────────────────────────────

function loadImagePool(dir, maxCount) {
  if (!existsSync(dir)) {
    console.error(`❌ Không tìm thấy thư mục ảnh: ${dir}`);
    console.error('   Hãy tải COCO val2017 và giải nén vào thư mục perf-tests/val2017/');
    console.error('   Download: http://images.cocodataset.org/zips/val2017.zip');
    process.exit(1);
  }

  const files = readdirSync(dir)
    .filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f))
    .slice(0, maxCount);

  if (files.length === 0) {
    console.error(`❌ Thư mục ${dir} không có ảnh nào!`);
    process.exit(1);
  }

  console.error(`🖼️  Đang load ${files.length} ảnh từ ${dir}...`);
  const pool = files.map((f) => ({
    name: f,
    buffer: readFileSync(join(dir, f)),
    type: f.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg',
  }));

  const totalMB = (pool.reduce((a, b) => a + b.buffer.length, 0) / (1024 * 1024)).toFixed(1);
  const avgKB = Math.round(pool.reduce((a, b) => a + b.buffer.length, 0) / pool.length / 1024);
  console.error(`✅ Pool sẵn sàng: ${pool.length} ảnh | tổng ${totalMB}MB | trung bình ~${avgKB}KB/ảnh`);

  return pool;
}

let IMAGE_POOL = [];

// Con trỏ toàn cục: mỗi scenario lấy ảnh tiếp nối, không trùng lặp
let globalImageCursor = START_IMAGE_INDEX;

/**
 * Lấy N ảnh tiếp theo từ pool (không trùng với lần gọi trước).
 * Nếu hết ảnh sẽ quay vòng (wrap around).
 */
function takeUniqueImages(count) {
  const images = [];
  for (let i = 0; i < count; i++) {
    images.push(IMAGE_POOL[globalImageCursor % IMAGE_POOL.length]);
    globalImageCursor++;
  }
  return images;
}

// ─── HELPERS ────────────────────────────────────────────────────

function checkTokenExpiry(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    const expiresAt = new Date(payload.exp * 1000);
    const now = new Date();
    if (expiresAt <= now) {
      console.error(`❌ Token đã hết hạn lúc ${expiresAt.toISOString()}`);
      console.error('   Hãy tạo token mới và cập nhật ACCESS_TOKEN trong script.');
      process.exit(1);
    }
    const remainingMs = expiresAt - now;
    const h = Math.floor(remainingMs / 3_600_000);
    const m = Math.floor((remainingMs % 3_600_000) / 60_000);
    console.error(`✅ Token hợp lệ — còn ${h}h${m}m (hết hạn: ${expiresAt.toLocaleString()})`);
  } catch {
    console.error('⚠️  Không thể kiểm tra token, tiếp tục...');
  }
}

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil(sorted.length * p) - 1;
  return sorted[Math.max(0, idx)];
}

function calcStats(times) {
  if (times.length === 0) return null;
  const sorted = [...times].sort((a, b) => a - b);
  const sum = times.reduce((a, b) => a + b, 0);
  return {
    avgMs: Math.round(sum / times.length),
    minMs: sorted[0],
    maxMs: sorted[sorted.length - 1],
    p50Ms: percentile(sorted, 0.5),
    p95Ms: percentile(sorted, 0.95),
    p99Ms: percentile(sorted, 0.99),
  };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ─── PHASE 1: UPLOAD API ────────────────────────────────────────

/**
 * Gửi 1 API call upload 1 chunk ảnh (tối đa 20 ảnh).
 * Nhận mảng ảnh cụ thể (từ pool) thay vì lấy random.
 */
async function uploadChunk(images, batchId, isLastChunk) {
  const formData = new FormData();
  for (const img of images) {
    const blob = new Blob([img.buffer], { type: img.type });
    formData.append('images', blob, img.name);
  }
  if (batchId) formData.append('batchId', batchId);
  if (isLastChunk) formData.append('isLastChunk', 'true');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const start = Date.now();

  try {
    const res = await fetch(`${BASE_URL}/api/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
      body: formData,
      signal: controller.signal,
    });
    const elapsed = Date.now() - start;
    const data = await res.json();
    return {
      success: res.ok,
      status: res.status,
      durationMs: elapsed,
      batchId: data?.data?.batchId ?? null,
      error: res.ok ? null : (data?.message ?? `HTTP ${res.status}`),
    };
  } catch (err) {
    return {
      success: false,
      status: 0,
      durationMs: Date.now() - start,
      batchId: null,
      error: err.name === 'AbortError' ? 'TIMEOUT' : err.message,
    };
  } finally {
    clearTimeout(timeout);
  }
}

// ─── PHASE 2: INDEXING (Worker) ─────────────────────────────────

/**
 * Polling GET /api/upload/batch/:batchId cho đến COMPLETED/FAILED.
 */
async function pollBatchCompletion(batchId) {
  const start = Date.now();
  while (Date.now() - start < POLL_TIMEOUT_MS) {
    try {
      const res = await fetch(`${BASE_URL}/api/upload/batch/${batchId}`, {
        headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
      });
      if (res.ok) {
        const json = await res.json();
        const d = json?.data;
        if (d?.status === 'COMPLETED' || d?.status === 'FAILED') {
          return {
            status: d.status,
            clientWaitMs: Date.now() - start,
            serverProcessingMs: d.totalDurationMs ?? null,
            totalImages: d.totalImages ?? 0,
            successCount: d.successCount ?? 0,
            failedCount: d.failedCount ?? 0,
          };
        }
      }
    } catch {
      /* bỏ qua lỗi polling */
    }
    await sleep(POLL_INTERVAL_MS);
  }
  return { status: 'POLL_TIMEOUT', clientWaitMs: Date.now() - start };
}

// ─── SCENARIO RUNNER ────────────────────────────────────────────

/**
 * Chạy 1 scenario hoàn chỉnh:
 *
 *   1. Lấy `totalImages` ảnh DUY NHẤT từ pool (không trùng scenario trước)
 *   2. Chia thành các chunk (mỗi chunk tối đa 20 ảnh)
 *   3. Gửi chunk đầu tiên (tuần tự) để tạo batchId
 *   4. Gửi các chunk còn lại với max `maxConcurrency` song song
 *      (chunk cuối cùng luôn gửi sau cùng với isLastChunk=true)
 *   5. Poll cho đến khi batch COMPLETED/FAILED
 *
 *   Tổng ảnh = totalImages (KHÔNG nhân với concurrency)
 */
async function runScenario(totalImages, maxConcurrency) {
  const overallStart = Date.now();

  // ── Lấy ảnh duy nhất cho scenario này ──
  const images = takeUniqueImages(totalImages);

  // Chia thành chunks (mỗi chunk tối đa 20 ảnh)
  const chunks = [];
  for (let i = 0; i < images.length; i += IMAGES_PER_API_CALL) {
    chunks.push(images.slice(i, i + IMAGES_PER_API_CALL));
  }
  const totalApiCalls = chunks.length;

  // ═══ PHASE 1: UPLOAD ═══
  const uploadStart = Date.now();
  const apiCallDurations = [];
  let batchId = null;
  let uploadErrors = {};
  let uploadFailCount = 0;

  if (chunks.length === 1) {
    // ── Chỉ 1 API call (batch ≤ 20 ảnh) ──
    const result = await uploadChunk(chunks[0], null, true);
    apiCallDurations.push(result.durationMs);
    if (result.success) {
      batchId = result.batchId;
    } else {
      uploadFailCount++;
      const key = result.error || 'UNKNOWN';
      uploadErrors[key] = (uploadErrors[key] || 0) + 1;
    }
  } else {
    // ── Nhiều API calls ──
    // Bước 1: Gửi chunk đầu tiên (tuần tự) để nhận batchId
    const firstResult = await uploadChunk(chunks[0], null, false);
    apiCallDurations.push(firstResult.durationMs);

    if (!firstResult.success) {
      // Không tạo được batch → dừng sớm
      const key = firstResult.error || 'UNKNOWN';
      uploadErrors[key] = 1;
      uploadFailCount = totalApiCalls;
    } else {
      batchId = firstResult.batchId;

      // Bước 2: Gửi các chunk giữa (index 1 → N-2) song song theo wave
      const middleChunks = chunks.slice(1, -1);
      const lastChunk = chunks[chunks.length - 1];

      for (let i = 0; i < middleChunks.length; i += maxConcurrency) {
        const wave = middleChunks.slice(i, i + maxConcurrency);
        const waveResults = await Promise.allSettled(
          wave.map((chunk) => uploadChunk(chunk, batchId, false)),
        );
        for (const r of waveResults) {
          const val = r.status === 'fulfilled' ? r.value : { success: false, durationMs: 0, error: r.reason?.message };
          apiCallDurations.push(val.durationMs);
          if (!val.success) {
            uploadFailCount++;
            const key = val.error || 'UNKNOWN';
            uploadErrors[key] = (uploadErrors[key] || 0) + 1;
          }
        }
      }

      // Bước 3: Gửi chunk cuối cùng (isLastChunk=true) SAU KHI tất cả chunk giữa xong
      const lastResult = await uploadChunk(lastChunk, batchId, true);
      apiCallDurations.push(lastResult.durationMs);
      if (!lastResult.success) {
        uploadFailCount++;
        const key = lastResult.error || 'UNKNOWN';
        uploadErrors[key] = (uploadErrors[key] || 0) + 1;
      }
    }
  }

  const uploadWallTimeMs = Date.now() - uploadStart;
  const uploadSuccessCount = totalApiCalls - uploadFailCount;

  // ═══ PHASE 2: INDEXING (Worker) ═══
  let indexingResult = null;
  let indexingWallTimeMs = 0;

  if (batchId) {
    const indexingStart = Date.now();
    indexingResult = await pollBatchCompletion(batchId);
    indexingWallTimeMs = Date.now() - indexingStart;
  }

  const overallWallTimeMs = Date.now() - overallStart;

  return {
    name: `${totalImages} ảnh (${totalApiCalls} API calls, max ${maxConcurrency} song song)`,
    totalImages,
    maxConcurrency,
    imagesPerCall: IMAGES_PER_API_CALL,
    totalApiCalls,

    // ── Phase 1: Upload metrics ──
    upload: {
      totalApiCalls,
      successCount: uploadSuccessCount,
      failCount: uploadFailCount,
      successRate: `${((uploadSuccessCount / totalApiCalls) * 100).toFixed(2)}%`,
      wallTimeMs: uploadWallTimeMs,
      stats: calcStats(apiCallDurations),
      throughputImagesPerSec:
        uploadSuccessCount > 0
          ? +((totalImages / (uploadWallTimeMs / 1000)).toFixed(2))
          : 0,
      errors: uploadErrors,
    },

    // ── Phase 2: Indexing metrics ──
    indexing: indexingResult
      ? {
        batchId,
        status: indexingResult.status,
        clientWaitMs: indexingResult.clientWaitMs,
        serverProcessingMs: indexingResult.serverProcessingMs,
        totalImages: indexingResult.totalImages,
        successCount: indexingResult.successCount,
        failedCount: indexingResult.failedCount,
        wallTimeMs: indexingWallTimeMs,
      }
      : { batchId: null, status: 'NO_BATCH', wallTimeMs: 0 },

    // ── Tổng thể ──
    overallWallTimeMs,
  };
}

// ─── MAIN ───────────────────────────────────────────────────────

async function main() {
  // Tính tổng ảnh cần cho toàn bộ test
  const totalImagesNeeded = SCENARIOS.reduce((sum, [n]) => sum + n, 0);

  console.error('═══════════════════════════════════════════════════════════');
  console.error('🚀 PERFORMANCE TEST: INDEXING (Upload + Worker Processing)');
  console.error(`📅 ${new Date().toISOString()}`);
  console.error(`🔗 ${BASE_URL}`);
  console.error(`📦 ${SCENARIOS.length} scenarios | ${totalImagesNeeded.toLocaleString()} ảnh cần dùng`);
  console.error('═══════════════════════════════════════════════════════════');
  console.error('');
  console.error('📋 Luồng test:');
  console.error('   Phase 1 (Upload):   POST /api/upload → DB + RabbitMQ');
  console.error('   Phase 2 (Indexing): Worker → Resize → AI → Qdrant → DB');
  console.error('');
  console.error('📖 Mỗi scenario dùng ảnh KHÁC NHAU (không trùng lặp)');
  if (START_IMAGE_INDEX > 0) {
    console.error(`⏭️  Bỏ qua ${START_IMAGE_INDEX} ảnh đầu (START_IMAGE_INDEX=${START_IMAGE_INDEX})`);
  }
  console.error('');

  checkTokenExpiry(ACCESS_TOKEN);

  // Load ảnh thật từ COCO val2017
  IMAGE_POOL = loadImagePool(IMAGE_DIR, 5000);

  if (START_IMAGE_INDEX + totalImagesNeeded > IMAGE_POOL.length) {
    console.error(`⚠️  Cảnh báo: cần ${totalImagesNeeded} ảnh từ vị trí ${START_IMAGE_INDEX}, nhưng pool chỉ có ${IMAGE_POOL.length} ảnh.`);
    console.error(`   Ảnh sẽ quay vòng (wrap around) và có thể trùng lặp.`);
  }

  // Nâng connection pool nếu có thể
  try {
    const { Agent, setGlobalDispatcher } = await import('undici');
    setGlobalDispatcher(new Agent({ connections: 2000, pipelining: 1 }));
    console.error('🔌 Connection pool: 2000 connections');
  } catch {
    console.error('🔌 Connection pool: mặc định (~128)');
  }

  const output = {
    testName: 'indexing',
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    config: {
      imagesPerApiCall: IMAGES_PER_API_CALL,
      imageSource: 'COCO val2017',
      imagePoolSize: IMAGE_POOL.length,
      startImageIndex: START_IMAGE_INDEX,
      totalImagesNeeded,
      requestTimeoutMs: REQUEST_TIMEOUT_MS,
      pollIntervalMs: POLL_INTERVAL_MS,
      pollTimeoutMs: POLL_TIMEOUT_MS,
    },
    scenarios: [],
  };

  for (let i = 0; i < SCENARIOS.length; i++) {
    const [totalImages, maxConcurrency] = SCENARIOS[i];
    const totalApiCalls = Math.ceil(totalImages / IMAGES_PER_API_CALL);

    console.error('');
    console.error(`━━━ [${i + 1}/${SCENARIOS.length}] ${totalImages} ảnh | ${totalApiCalls} API calls | max ${maxConcurrency} song song ━━━`);
    console.error(`    🖼️  Dùng ảnh ${globalImageCursor}-${globalImageCursor + totalImages - 1} trong pool`);

    const scenario = await runScenario(totalImages, maxConcurrency);
    output.scenarios.push(scenario);

    // Upload summary
    const u = scenario.upload;
    console.error(`    📤 UPLOAD:  ${u.successCount}/${u.totalApiCalls} API calls OK (${u.successRate}) — wall: ${u.wallTimeMs}ms`);
    if (u.stats) {
      console.error(`       avg=${u.stats.avgMs}ms | p50=${u.stats.p50Ms}ms | p95=${u.stats.p95Ms}ms | max=${u.stats.maxMs}ms`);
      console.error(`       throughput: ${u.throughputImagesPerSec} images/s`);
    }
    if (Object.keys(u.errors).length > 0) {
      console.error(`       ❌ ${JSON.stringify(u.errors)}`);
    }

    // Indexing summary
    const ix = scenario.indexing;
    if (ix.status === 'COMPLETED') {
      console.error(`    🔧 INDEX:   ✅ COMPLETED — wait: ${ix.clientWaitMs}ms`);
      if (ix.serverProcessingMs != null) {
        console.error(`       Server AI processing: ${ix.serverProcessingMs}ms`);
      }
      console.error(`       Images: ${ix.successCount}/${ix.totalImages} success`);
    } else if (ix.status === 'FAILED') {
      console.error(`    🔧 INDEX:   ❌ FAILED — wait: ${ix.clientWaitMs}ms`);
    } else if (ix.status === 'POLL_TIMEOUT') {
      console.error(`    🔧 INDEX:   ⏰ TIMEOUT — wait: ${ix.clientWaitMs}ms`);
    } else {
      console.error(`    🔧 INDEX:   ⚠️ ${ix.status}`);
    }

    console.error(`    ⏱️  TỔNG wall time: ${scenario.overallWallTimeMs}ms`);

    // Nghỉ giữa các scenarios
    if (i < SCENARIOS.length - 1) {
      await sleep(DELAY_BETWEEN_SCENARIOS_MS);
    }
  }

  // In JSON kết quả ra stdout
  console.error('');
  console.error('═══════════════ KẾT QUẢ JSON ═══════════════');
  console.log(JSON.stringify(output, null, 2));
}

main().catch((err) => {
  console.error('❌ Fatal:', err);
  process.exit(1);
});
