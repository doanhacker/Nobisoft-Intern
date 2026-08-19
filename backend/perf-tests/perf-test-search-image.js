
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASE_URL = 'https://visualsearch.duckdns.org';
const ACCESS_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImYyNDc2YmRkLWUwNjEtNDgwZi1hZjljLTI0NjIzN2YwY2JmMSIsImVtYWlsIjoidXNlckBleGFtcGxlLmNvbSIsInJvbGUiOiJBRE1JTiIsImlhdCI6MTc4NjYxODkzMSwiZXhwIjoxNzg2NzA1MzMxfQ.5Xc659gKoPlKRdDi6RJ-VqlgOpqy5j2naZVfNZPrxWE';

const REQUEST_TIMEOUT_MS = 60_000;
const DELAY_BETWEEN_SCENARIOS_MS = 3_000;

const CONCURRENCY_LEVELS = [1, 10, 50, 100, 200, 1000];

const IMAGE_DIR = join(__dirname, 'val2017');

const POOL_SIZE = 100;

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

async function sendSearchByImage() {

  const img = IMAGE_POOL[Math.floor(Math.random() * IMAGE_POOL.length)];
  const formData = new FormData();
  const blob = new Blob([img.buffer], { type: img.type });
  formData.append('image', blob, img.name);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const start = Date.now();

  try {
    const res = await fetch(`${BASE_URL}/api/search/image`, {
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
      resultCount: data?.data?.results?.length ?? 0,
      error: res.ok ? null : (data?.message ?? `HTTP ${res.status}`),
    };
  } catch (err) {
    return {
      success: false,
      status: 0,
      durationMs: Date.now() - start,
      resultCount: 0,
      error: err.name === 'AbortError' ? 'TIMEOUT' : err.message,
    };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Chạy 1 scenario: N requests đồng thời.
 */
async function runScenario(concurrency) {
  const wallStart = Date.now();

  const promises = Array.from({ length: concurrency }, () => sendSearchByImage());
  const settled = await Promise.allSettled(promises);

  const wallTimeMs = Date.now() - wallStart;

  const results = settled.map((s) =>
    s.status === 'fulfilled'
      ? s.value
      : { success: false, durationMs: 0, error: s.reason?.message ?? 'UNKNOWN' },
  );

  const ok = results.filter((r) => r.success);
  const fail = results.filter((r) => !r.success);
  const times = ok.map((r) => r.durationMs);

  const errors = {};
  fail.forEach((r) => {
    const key = r.error || 'UNKNOWN';
    errors[key] = (errors[key] || 0) + 1;
  });

  return {
    name: `${concurrency} concurrent request${concurrency > 1 ? 's' : ''}`,
    concurrency,
    totalRequests: concurrency,
    successCount: ok.length,
    failCount: fail.length,
    successRate: `${((ok.length / concurrency) * 100).toFixed(2)}%`,
    wallTimeMs,
    stats: calcStats(times),
    throughputRps: concurrency > 0 ? +((ok.length / (wallTimeMs / 1000)).toFixed(2)) : 0,
    errors,
  };
}

// ─── MAIN ───────────────────────────────────────────────────────

async function main() {
  console.error('═══════════════════════════════════════════════════');
  console.error('🚀 PERFORMANCE TEST: SEARCH BY IMAGE');
  console.error(`📅 ${new Date().toISOString()}`);
  console.error(`🔗 ${BASE_URL}`);
  console.error(`📊 ${CONCURRENCY_LEVELS.length} scenarios planned`);
  console.error('═══════════════════════════════════════════════════');

  checkTokenExpiry(ACCESS_TOKEN);

  // Load ảnh thật từ COCO val2017
  IMAGE_POOL = loadImagePool(IMAGE_DIR, POOL_SIZE);

  // Nâng connection pool nếu có thể
  try {
    const { Agent, setGlobalDispatcher } = await import('undici');
    setGlobalDispatcher(new Agent({ connections: 2000, pipelining: 1 }));
    console.error('🔌 Connection pool: 2000 connections');
  } catch {
    console.error('🔌 Connection pool: mặc định (~128)');
  }

  const output = {
    testName: 'search-by-image',
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    config: {
      requestTimeoutMs: REQUEST_TIMEOUT_MS,
      imageSource: 'COCO val2017',
      imagePoolSize: IMAGE_POOL.length,
    },
    scenarios: [],
  };

  for (let i = 0; i < CONCURRENCY_LEVELS.length; i++) {
    const concurrency = CONCURRENCY_LEVELS[i];

    console.error('');
    console.error(`━━━ [${i + 1}/${CONCURRENCY_LEVELS.length}] ${concurrency} concurrent ━━━`);

    const scenario = await runScenario(concurrency);
    output.scenarios.push(scenario);

    console.error(`    ✅ ${scenario.successCount}/${scenario.totalRequests} OK (${scenario.successRate})`);
    console.error(`    ⏱️  Wall: ${scenario.wallTimeMs}ms`);
    if (scenario.stats) {
      console.error(
        `    📊 avg=${scenario.stats.avgMs}ms | p50=${scenario.stats.p50Ms}ms | p95=${scenario.stats.p95Ms}ms | p99=${scenario.stats.p99Ms}ms`,
      );
    }
    console.error(`    🚀 Throughput: ${scenario.throughputRps} req/s`);
    if (Object.keys(scenario.errors).length > 0) {
      console.error(`    ❌ Errors: ${JSON.stringify(scenario.errors)}`);
    }

    if (i < CONCURRENCY_LEVELS.length - 1) {
      await sleep(DELAY_BETWEEN_SCENARIOS_MS);
    }
  }

  console.error('');
  console.error('═══════════════ KẾT QUẢ JSON ═══════════════');
  console.log(JSON.stringify(output, null, 2));
}

main().catch((err) => {
  console.error('❌ Fatal:', err);
  process.exit(1);
});
