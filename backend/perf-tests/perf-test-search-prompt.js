
const BASE_URL = 'https://visualsearch.duckdns.org';
const ACCESS_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImYyNDc2YmRkLWUwNjEtNDgwZi1hZjljLTI0NjIzN2YwY2JmMSIsImVtYWlsIjoidXNlckBleGFtcGxlLmNvbSIsInJvbGUiOiJBRE1JTiIsImlhdCI6MTc4NjYxODkzMSwiZXhwIjoxNzg2NzA1MzMxfQ.5Xc659gKoPlKRdDi6RJ-VqlgOpqy5j2naZVfNZPrxWE';

const REQUEST_TIMEOUT_MS = 90_000;
const DELAY_BETWEEN_SCENARIOS_MS = 5_000;

const CONCURRENCY_LEVELS = [1, 10, 50, 100, 200];

const QUERY_POOL = [
  'tìm cho tôi ảnh một con mèo đang ngồi trên bàn', 'ảnh phong cảnh hoàng hôn trên biển', 'chiếc xe thể thao màu đỏ đang chạy trên phố', 'cảnh núi non phủ tuyết trắng', 'một chú chó đang chạy nhảy trong công viên',
  'khung cảnh thành phố lung linh về đêm', 'khu vườn hoa rực rỡ sắc màu', 'tách cà phê nóng để trên bàn làm việc', 'bãi biển xanh mướt với những cây cọ', 'người đàn ông đang đạp xe đạp',
  'áo khoác da phong cách cổ điển', 'căn bếp thiết kế tối giản hiện đại', 'nhóm bạn đang cười đùa vui vẻ', 'ảnh chụp cận cảnh một con bướm', 'cảnh đường phố dưới trời mưa',
  'chiếc bánh pizza nướng thơm phức', 'máy tính xách tay trên bàn gỗ', 'cây đàn guitar acoustic dựa vào tường', 'rừng thông chìm trong tuyết', 'những chiếc khinh khí cầu bay trên bầu trời',
  'con mèo con lông xù dễ thương', 'bộ đồ nghề máy ảnh chuyên nghiệp', 'chiếc bánh kem sô cô la hấp dẫn', 'những người đi bộ dưới cơn mưa', 'bầu trời đêm đầy sao tuyệt đẹp',
  'bức tranh trừu tượng nhiều màu sắc', 'ngôi nhà cổ bị bỏ hoang', 'con đường mòn xanh mướt trong rừng', 'người trượt ván đang biểu diễn', 'góc nhìn từ trên cao của hồ bơi',
  'con hổ hoang dã trong rừng rậm', 'một bát trái cây tươi ngon', 'những cuốn sách cũ xếp chồng lên nhau', 'bình minh ló rạng trên đỉnh núi', 'đàn ngựa đang chạy trên cánh đồng',
  'em bé đang mỉm cười hạnh phúc', 'flycam đang bay lơ lửng trên không', 'đĩa sushi cuộn hải sản ngon mắt', 'người đàn ông say sưa đọc sách', 'người phụ nữ đang tập yoga',
  'chiếc xe đua cổ điển sang trọng', 'khu chợ sầm uất đông đúc', 'chiếc váy cưới trắng tinh khôi đẹp mắt', 'một ly trà nóng bốc khói', 'người trượt tuyết trên sườn núi',
  'lều cắm trại dưới bầu trời đầy sao', 'chú cún con lông vàng đáng yêu', 'rau củ quả tươi xanh trên bàn ăn', 'ánh đèn neon rực cả góc phố', 'người lướt sóng cưỡi trên ngọn sóng lớn'
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
 * Gửi 1 request search prompt (tiếng Việt → Ollama dịch → CLIP → Qdrant).
 */
async function sendSearchPrompt(query) {
  const params = new URLSearchParams({
    mode: 'prompt',
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
    sendSearchPrompt(randomQuery()),
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
  console.error('🚀 PERFORMANCE TEST: SEARCH TEXT (PROMPT)');
  console.error(`📅 ${new Date().toISOString()}`);
  console.error(`🔗 ${BASE_URL}`);
  console.error(`📊 ${CONCURRENCY_LEVELS.length} scenarios planned`);
  console.error(`🔤 Query pool: ${QUERY_POOL.length} queries (tiếng Việt → Ollama)`);
  console.error('═══════════════════════════════════════════════════');
  console.error('');
  console.error('⚠️  Lưu ý: Luồng prompt chậm hơn semantic do thêm bước Ollama dịch.');
  console.error('   Ollama (gemma2:2b) là bottleneck chính, đặc biệt ở high concurrency.');

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
    testName: 'search-text-prompt',
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
