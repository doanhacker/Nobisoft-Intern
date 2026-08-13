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
 * Ảnh test: đọc từ thư mục val2017/ (COCO val2017 dataset, 5000 ảnh thật)
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

// Đường dẫn thư mục ảnh COCO val2017
const IMAGE_DIR = join(__dirname, 'val2017');

// Ma trận test: [batchSize, concurrency]
// Comment bớt dòng nếu muốn bỏ qua scenario nặng
const SCENARIOS = [
  [1, 1],
  [1, 100],
  [1, 1000],
  [10, 1],
  [10, 100],
  [10, 1000],
  [100, 1],
  [100, 100],
  [100, 1000],
  [1000, 1],
  [1000, 100],
  [1000, 1000],
];
// ────────────────────────────────────────────────────────────────

// ─── ĐỌC ẢNH THẬT TỪ COCO val2017 ─────────────────────────────

/**
 * Load danh sách file ảnh từ thư mục val2017/.
 * Đọc sẵn vào memory (Buffer) để tránh I/O trong khi đo hiệu năng.
 */
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

// Counter toàn cục để round-robin ảnh trong pool, tránh trùng tên file
let imageCounter = 0;

// ─── PHASE 1: UPLOAD API ────────────────────────────────────────

/**
 * Gửi 1 API call upload chunk ảnh.
 * Lấy ảnh thật từ IMAGE_POOL (round-robin).
 */
async function uploadChunk(numImages, batchId, isLastChunk) {
  const formData = new FormData();
  for (let i = 0; i < numImages; i++) {
    const img = IMAGE_POOL[imageCounter % IMAGE_POOL.length];
    imageCounter++;
    const blob = new Blob([img.buffer], { type: img.type });
    // Tên file duy nhất để tránh trùng trên server
    const name = `perf-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}-${img.name}`;
    formData.append('images', blob, name);
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

/**
 * Upload 1 batch hoàn chỉnh (nhiều API call nối tiếp nếu > 20 ảnh).
 * Chỉ đo phase Upload — chưa tính worker indexing.
 */
async function uploadFullBatch(batchSize) {
  const chunks = [];
  let remaining = batchSize;
  while (remaining > 0) {
    chunks.push(Math.min(remaining, IMAGES_PER_API_CALL));
    remaining -= IMAGES_PER_API_CALL;
  }

  const pipelineStart = Date.now();
  const apiCallDurations = [];
  let batchId = null;
  let pipelineError = null;

  for (let i = 0; i < chunks.length; i++) {
    const isLast = i === chunks.length - 1;
    const result = await uploadChunk(chunks[i], batchId, isLast);
    apiCallDurations.push(result.durationMs);

    if (!result.success) {
      pipelineError = result.error;
      break;
    }
    if (!batchId && result.batchId) batchId = result.batchId;
  }

  const uploadDurationMs = Date.now() - pipelineStart;

  return {
    success: !pipelineError,
    batchId,
    batchSize,
    apiCallCount: chunks.length,
    uploadDurationMs,
    apiCallDurations,
    error: pipelineError,
  };
}

// ─── PHASE 2: INDEXING (Worker) ─────────────────────────────────

/**
 * Polling GET /api/upload/batch/:batchId cho đến COMPLETED/FAILED.
 * Đo thời gian chờ worker xử lý (client-side).
 * Server trả về totalDurationMs = thời gian AI processing (server-side).
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
            serverProcessingMs: d.totalDurationMs ?? null,  // AI processing time (server-side)
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
 *   1. Upload N batches đồng thời (Phase 1)
 *   2. Polling tất cả batches đến khi COMPLETED (Phase 2)
 *
 * Tách riêng metrics cho Upload vs Indexing.
 */
async function runScenario(batchSize, concurrency) {
  const overallStart = Date.now();

  // ── Phase 1: Upload ──
  const uploadStart = Date.now();
  const uploadPromises = Array.from({ length: concurrency }, () => uploadFullBatch(batchSize));
  const uploadSettled = await Promise.allSettled(uploadPromises);
  const uploadWallTimeMs = Date.now() - uploadStart;

  const uploadResults = uploadSettled.map((s) =>
    s.status === 'fulfilled'
      ? s.value
      : { success: false, uploadDurationMs: 0, batchId: null, error: s.reason?.message ?? 'UNKNOWN' },
  );

  const uploadOk = uploadResults.filter((r) => r.success);
  const uploadFail = uploadResults.filter((r) => !r.success);
  const uploadTimes = uploadOk.map((r) => r.uploadDurationMs);

  const uploadErrors = {};
  uploadFail.forEach((r) => {
    const key = r.error || 'UNKNOWN';
    uploadErrors[key] = (uploadErrors[key] || 0) + 1;
  });

  // ── Phase 2: Indexing (poll batch completion) ──
  const indexingStart = Date.now();
  const batchIdsToMonitor = uploadOk.filter((r) => r.batchId).map((r) => r.batchId);

  let indexingResults = [];
  if (batchIdsToMonitor.length > 0) {
    const pollPromises = batchIdsToMonitor.map((id) => pollBatchCompletion(id));
    const pollSettled = await Promise.allSettled(pollPromises);
    indexingResults = pollSettled.map((s) =>
      s.status === 'fulfilled'
        ? s.value
        : { status: 'ERROR', clientWaitMs: 0, serverProcessingMs: null },
    );
  }
  const indexingWallTimeMs = Date.now() - indexingStart;

  const indexingCompleted = indexingResults.filter((r) => r.status === 'COMPLETED');
  const indexingFailed = indexingResults.filter((r) => r.status === 'FAILED');
  const indexingTimeout = indexingResults.filter((r) => r.status === 'POLL_TIMEOUT');

  const clientWaitTimes = indexingCompleted.map((r) => r.clientWaitMs);
  const serverProcessingTimes = indexingCompleted
    .filter((r) => r.serverProcessingMs != null)
    .map((r) => r.serverProcessingMs);

  const overallWallTimeMs = Date.now() - overallStart;

  return {
    name: `Batch ${batchSize} ảnh × ${concurrency} concurrent`,
    batchSize,
    concurrency,
    imagesPerCall: IMAGES_PER_API_CALL,
    apiCallsPerBatch: Math.ceil(batchSize / IMAGES_PER_API_CALL),

    // ── Phase 1: Upload metrics ──
    upload: {
      totalBatches: concurrency,
      successCount: uploadOk.length,
      failCount: uploadFail.length,
      successRate: `${((uploadOk.length / concurrency) * 100).toFixed(2)}%`,
      wallTimeMs: uploadWallTimeMs,
      stats: calcStats(uploadTimes),
      throughputBatchesPerSec:
        uploadOk.length > 0 ? +((uploadOk.length / (uploadWallTimeMs / 1000)).toFixed(2)) : 0,
      throughputImagesPerSec:
        uploadOk.length > 0
          ? +(((uploadOk.length * batchSize) / (uploadWallTimeMs / 1000)).toFixed(2))
          : 0,
      errors: uploadErrors,
    },

    // ── Phase 2: Indexing metrics ──
    indexing: {
      totalMonitored: batchIdsToMonitor.length,
      completedCount: indexingCompleted.length,
      failedCount: indexingFailed.length,
      timeoutCount: indexingTimeout.length,
      wallTimeMs: indexingWallTimeMs,
      // Client-side wait: thời gian từ upload xong → COMPLETED (bao gồm queue wait + processing)
      clientWaitStats: calcStats(clientWaitTimes),
      // Server-side AI processing: totalDurationMs từ worker (chỉ AI + Qdrant + DB, không tính queue wait)
      serverProcessingStats: calcStats(serverProcessingTimes),
    },

    // ── Tổng thể ──
    overallWallTimeMs,
  };
}

// ─── MAIN ───────────────────────────────────────────────────────

async function main() {
  console.error('═══════════════════════════════════════════════════════════');
  console.error('🚀 PERFORMANCE TEST: INDEXING (Upload + Worker Processing)');
  console.error(`📅 ${new Date().toISOString()}`);
  console.error(`🔗 ${BASE_URL}`);
  console.error(`📦 ${SCENARIOS.length} scenarios planned`);
  console.error('═══════════════════════════════════════════════════════════');
  console.error('');
  console.error('📋 Luồng test:');
  console.error('   Phase 1 (Upload):   POST /api/upload → DB + RabbitMQ');
  console.error('   Phase 2 (Indexing): Worker → Resize → AI → Qdrant → DB');
  console.error('');

  checkTokenExpiry(ACCESS_TOKEN);

  // Load ảnh thật từ COCO val2017
  IMAGE_POOL = loadImagePool(IMAGE_DIR, 5000);

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
      requestTimeoutMs: REQUEST_TIMEOUT_MS,
      pollIntervalMs: POLL_INTERVAL_MS,
      pollTimeoutMs: POLL_TIMEOUT_MS,
    },
    scenarios: [],
  };

  for (let i = 0; i < SCENARIOS.length; i++) {
    const [batchSize, concurrency] = SCENARIOS[i];
    const totalImages = batchSize * concurrency;
    const totalApiCalls = Math.ceil(batchSize / IMAGES_PER_API_CALL) * concurrency;

    console.error('');
    console.error(`━━━ [${i + 1}/${SCENARIOS.length}] Batch ${batchSize} ảnh × ${concurrency} concurrent ━━━`);
    console.error(`    📊 Tổng: ${totalImages.toLocaleString()} ảnh, ${totalApiCalls.toLocaleString()} API calls`);

    const scenario = await runScenario(batchSize, concurrency);
    output.scenarios.push(scenario);

    // Upload summary
    const u = scenario.upload;
    console.error(`    📤 UPLOAD:  ${u.successCount}/${u.totalBatches} OK (${u.successRate}) — wall: ${u.wallTimeMs}ms`);
    if (u.stats) {
      console.error(`       avg=${u.stats.avgMs}ms | p50=${u.stats.p50Ms}ms | p95=${u.stats.p95Ms}ms | max=${u.stats.maxMs}ms`);
      console.error(`       throughput: ${u.throughputImagesPerSec} images/s | ${u.throughputBatchesPerSec} batches/s`);
    }
    if (Object.keys(u.errors).length > 0) {
      console.error(`       ❌ ${JSON.stringify(u.errors)}`);
    }

    // Indexing summary
    const ix = scenario.indexing;
    console.error(`    🔧 INDEX:   ${ix.completedCount}/${ix.totalMonitored} completed, ${ix.failedCount} failed, ${ix.timeoutCount} timeout — wall: ${ix.wallTimeMs}ms`);
    if (ix.clientWaitStats) {
      console.error(`       Client wait (queue + AI):   avg=${ix.clientWaitStats.avgMs}ms | p95=${ix.clientWaitStats.p95Ms}ms | max=${ix.clientWaitStats.maxMs}ms`);
    }
    if (ix.serverProcessingStats) {
      console.error(`       Server AI processing:       avg=${ix.serverProcessingStats.avgMs}ms | p95=${ix.serverProcessingStats.p95Ms}ms | max=${ix.serverProcessingStats.maxMs}ms`);
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
