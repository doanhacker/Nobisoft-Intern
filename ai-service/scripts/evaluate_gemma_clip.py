"""
Script Đánh Giá Định Lượng AI: Gemma 2B + English CLIP (Mode: Prompt Search)

Mục đích: Đo lường độ chính xác và hiệu năng của chức năng "Tìm bằng Prompt"
(Gemma 2B dịch prompt Tiếng Việt → English CLIP → Qdrant Vector Search).

Cách chạy:
    # 1. Đánh giá trên Local:
    python ai-service/scripts/evaluate_gemma_clip.py

    # 2. Đánh giá trên Server đã Deploy:
    python ai-service/scripts/evaluate_gemma_clip.py --base-url https://api.yourdomain.com
"""

import argparse
import json
import os
import sys
import time
import urllib.parse
import urllib.request
from typing import Any

# Đảm bảo UTF-8 cho Windows Terminal
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

BENCHMARK_FILE = os.path.join(
    os.path.dirname(__file__), "..", "tests", "eval_vietnamese_benchmark.json"
)


def parse_args():
    parser = argparse.ArgumentParser(description="AI Search Benchmark Evaluator - Prompt Mode (Gemma 2B + CLIP)")
    parser.add_argument(
        "--base-url",
        default="http://localhost:8000",
        help="Base URL của Backend API (Local hoặc Server)",
    )
    parser.add_argument("--top-k", type=int, default=5, help="Số lượng kết quả Top K")
    parser.add_argument(
        "--mode",
        default="prompt",
        choices=["prompt", "semantic", "ocr"],
        help="Chế độ tìm kiếm (mặc định: prompt = Gemma 2B + English CLIP)",
    )
    return parser.parse_args()


def calculate_precision_at_k(results: list[str], relevant: set[str], k: int = 5) -> float:
    top_k = results[:k]
    if not top_k:
        return 0.0
    hits = sum(1 for item in top_k if item in relevant)
    return hits / len(top_k)


def calculate_recall_at_k(results: list[str], relevant: set[str], k: int = 5) -> float:
    if not relevant:
        return 0.0
    top_k = results[:k]
    hits = sum(1 for item in top_k if item in relevant)
    return hits / len(relevant)


def calculate_mrr(results: list[str], relevant: set[str]) -> float:
    for rank, item in enumerate(results, start=1):
        if item in relevant:
            return 1.0 / rank
    return 0.0


def calculate_ap_at_k(results: list[str], relevant: set[str], k: int = 5) -> float:
    if not relevant:
        return 0.0
    top_k = results[:k]
    score = 0.0
    num_hits = 0.0

    for i, item in enumerate(top_k, start=1):
        if item in relevant:
            num_hits += 1.0
            score += num_hits / i

    return score / min(len(relevant), k)


def fetch_search_results(base_url: str, text_vi: str, mode: str, limit: int) -> tuple[list[str], str]:
    """Gửi request tới API Backend và lấy danh sách image_id."""
    retrieved_ids: list[str] = []
    
    # 1. Thử HTTP GET /api/v1/search/text?q=...&mode=prompt
    encoded_q = urllib.parse.quote(text_vi)
    get_url = f"{base_url}/api/v1/search/text?q={encoded_q}&mode={mode}&limit={limit}"
    
    try:
        req = urllib.request.Request(get_url, headers={"Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=15) as response:
            resp_json = json.loads(response.read().decode("utf-8"))
            if resp_json.get("success") and "data" in resp_json:
                items = resp_json["data"].get("items", [])
                retrieved_ids = [img.get("id") or img.get("imageId") for img in items if img]
                return retrieved_ids, "SUCCESS"
    except Exception as get_err:
        # 2. Fallback sang HTTP POST /api/v1/search/text
        try:
            post_url = f"{base_url}/api/v1/search/text"
            req_data = json.dumps({"queryText": text_vi, "mode": mode, "limit": limit}).encode("utf-8")
            req = urllib.request.Request(
                post_url,
                data=req_data,
                headers={"Content-Type": "application/json", "Accept": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=15) as response:
                resp_json = json.loads(response.read().decode("utf-8"))
                if resp_json.get("success") and "data" in resp_json:
                    items = resp_json["data"].get("items", [])
                    retrieved_ids = [img.get("id") or img.get("imageId") for img in items if img]
                    return retrieved_ids, "SUCCESS"
        except Exception as post_err:
            return [], f"API offline ({get_err})"

    return retrieved_ids, "EMPTY_DATA"


def main() -> None:
    args = parse_args()
    base_url = args.base_url.rstrip("/")
    k = args.top_k
    mode = args.mode

    print("\n==================================================================")
    print("   DANH GIA DINH LUONG: GEMMA 2B + ENGLISH CLIP (MODE: PROMPT)")
    print("==================================================================\n")

    print(f"Target Server API : {base_url}")
    print(f"Search Mode       : {mode.upper()} (Gemma 2B Prompt Search)")
    print(f"Top K Evaluation  : K = {k}")
    print(f"Benchmark File    : {BENCHMARK_FILE}\n")

    if not os.path.exists(BENCHMARK_FILE):
        print(f"ERROR: Khong tim thay file benchmark: {BENCHMARK_FILE}")
        return

    with open(BENCHMARK_FILE, "r", encoding="utf-8") as f:
        queries: list[dict[str, Any]] = json.load(f)

    print(f"Da nap {len(queries)} cau truy van danh gia benchmark.")
    print("-" * 68)

    precisions: list[float] = []
    recalls: list[float] = []
    mrrs: list[float] = []
    maps: list[float] = []
    latencies: list[float] = []

    for item in queries:
        query_id = item.get("query_id", "N/A")
        cat = item.get("category", "gen").upper()
        text_vi = item.get("query_text_vi", "")
        relevant_ids = set(item.get("relevant_image_ids", []))

        start_time = time.perf_counter()
        retrieved_ids, status_msg = fetch_search_results(base_url, text_vi, mode, limit=20)
        elapsed_ms = (time.perf_counter() - start_time) * 1000

        latencies.append(elapsed_ms)

        p = calculate_precision_at_k(retrieved_ids, relevant_ids, k=k)
        r = calculate_recall_at_k(retrieved_ids, relevant_ids, k=k)
        mrr = calculate_mrr(retrieved_ids, relevant_ids)
        ap = calculate_ap_at_k(retrieved_ids, relevant_ids, k=k)

        precisions.append(p)
        recalls.append(r)
        mrrs.append(mrr)
        maps.append(ap)

        print(
            f"[{query_id}] [{cat:9s}] '{text_vi[:25]:25s}' | "
            f"P@{k}:{p:.2f} | R@{k}:{r:.2f} | MRR:{mrr:.2f} | Latency:{elapsed_ms:.0f}ms ({status_msg})"
        )

    # ── TONG HOP ──
    avg_p = (sum(precisions) / len(precisions)) * 100 if precisions else 0
    avg_r = (sum(recalls) / len(recalls)) * 100 if recalls else 0
    avg_mrr = sum(mrrs) / len(mrrs) if mrrs else 0
    avg_map = sum(maps) / len(maps) if maps else 0
    avg_lat = sum(latencies) / len(latencies) if latencies else 0

    print("\n" + "=" * 68)
    print("BAO CAO DANH GIA DINH LUONG TONG HOP (PROMPT MODE - GEMMA 2B)")
    print("=" * 68)
    print(f"  * Target Environment : {base_url}")
    print(f"  * Search Mode        : {mode.upper()}")
    print(f"  * Precision@{k}        : {avg_p:.1f}%")
    print(f"  * Recall@{k}           : {avg_r:.1f}%")
    print(f"  * MRR Score          : {avg_mrr:.3f}")
    print(f"  * MAP@{k} Score        : {avg_map:.3f}")
    print(f"  * End-to-End Latency : {avg_lat:.1f} ms")
    print("=" * 68 + "\n")


if __name__ == "__main__":
    main()
