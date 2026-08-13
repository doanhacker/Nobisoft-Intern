#!/usr/bin/env node
/**
 * ══════════════════════════════════════════════════════════════
 * PERFORMANCE TEST: SEARCH BY TEXT (SEMANTIC)
 * ══════════════════════════════════════════════════════════════
 *
 * Test GET /api/search/text?mode=semantic&q=...
 * Gửi query tiếng Anh, backend embed text bằng CLIP rồi search Qdrant.
 *
 * Chạy:  node perf-test-search-semantic.js
 * Output: JSON kết quả in ra stdout, progress in ra stderr
 */

// ─── CẤU HÌNH ──────────────────────────────────────────────────
const BASE_URL = 'https://visualsearch.duckdns.org';
const ACCESS_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImYyNDc2YmRkLWUwNjEtNDgwZi1hZjljLTI0NjIzN2YwY2JmMSIsImVtYWlsIjoidXNlckBleGFtcGxlLmNvbSIsInJvbGUiOiJBRE1JTiIsImlhdCI6MTc4NjYxODkzMSwiZXhwIjoxNzg2NzA1MzMxfQ.5Xc659gKoPlKRdDi6RJ-VqlgOpqy5j2naZVfNZPrxWE';

const REQUEST_TIMEOUT_MS = 60_000;        // 1 phút timeout
const DELAY_BETWEEN_SCENARIOS_MS = 3_000; // Nghỉ giữa scenarios

// Các mức concurrent cần test
const CONCURRENCY_LEVELS = [1, 100, 1000];

// Pool query tiếng Anh — random chọn cho mỗi request
const QUERY_POOL = [
  'cat sitting on table',
  'sunset over ocean',
  'red sports car',
  'mountain landscape snow',
  'dog running in park',
  'city skyline at night',
  'flower garden colorful',
  'coffee cup on desk',
  'beach with palm trees',
  'person riding bicycle',
];
// ────────────────────────────────────────────────────────────────

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

function randomQuery() {
  return QUERY_POOL[Math.floor(Math.random() * QUERY_POOL.length)];
}

// ─── CORE LOGIC ─────────────────────────────────────────────────

/**
 * Gửi 1 request search semantic.
 */
async function sendSearchSemantic(query) {
  const params = new URLSearchParams({
    mode: 'semantic',
    q: query,
    page: '1',
    limit: '20',
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const start = Date.now();

  try {
    const res = await fetch(`${BASE_URL}/api/search/text?${params}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
      signal: controller.signal,
    });
    const elapsed = Date.now() - start;
    const data = await res.json();
    return {
      success: res.ok,
      status: res.status,
      durationMs: elapsed,
      query,
      resultCount: data?.data?.results?.length ?? 0,
      error: res.ok ? null : (data?.message ?? `HTTP ${res.status}`),
    };
  } catch (err) {
    return {
      success: false,
      status: 0,
      durationMs: Date.now() - start,
      query,
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

  const promises = Array.from({ length: concurrency }, () =>
    sendSearchSemantic(randomQuery()),
  );
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
  console.error('🚀 PERFORMANCE TEST: SEARCH TEXT (SEMANTIC)');
  console.error(`📅 ${new Date().toISOString()}`);
  console.error(`🔗 ${BASE_URL}`);
  console.error(`📊 ${CONCURRENCY_LEVELS.length} scenarios planned`);
  console.error(`🔤 Query pool: ${QUERY_POOL.length} queries`);
  console.error('═══════════════════════════════════════════════════');

  checkTokenExpiry(ACCESS_TOKEN);

  // Nâng connection pool nếu có thể
  try {
    const { Agent, setGlobalDispatcher } = await import('undici');
    setGlobalDispatcher(new Agent({ connections: 2000, pipelining: 1 }));
    console.error('🔌 Connection pool: 2000 connections');
  } catch {
    console.error('🔌 Connection pool: mặc định (~128)');
  }

  const output = {
    testName: 'search-text-semantic',
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    config: {
      requestTimeoutMs: REQUEST_TIMEOUT_MS,
      queryPool: QUERY_POOL,
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
