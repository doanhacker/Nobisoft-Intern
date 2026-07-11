"""
Visual Search AI Service — FastAPI Application
=================================================
3 endpoints phục vụ Backend (theo docs/api_flow_documentation.md):

  POST /api/process-image   →  Indexing: embed ảnh + OCR
  POST /api/embed-image     →  Search by Image: chỉ embed ảnh
  POST /api/embed-text      →  Search by Text Semantic: embed text

Tất cả response tuân theo format:
  { "success": bool, "data": {...} | null, "error_message": str | null }
"""

import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, UploadFile, HTTPException

from app.schemas import TextEmbedRequest, EmbedResponse, ProcessImageResponse
from app.services.encoder import ClipEngine
from app.services.ocr_service import OcrEngine

logger = logging.getLogger(__name__)

# Cấu hình logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)

# Allowed image MIME types
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


# ──────────────────────────────────────────────────────────
# Lifespan: Nạp model lúc startup
# ──────────────────────────────────────────────────────────


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Nạp CLIP + EasyOCR model vào bộ nhớ khi app khởi động."""
    logger.info("AI Service đang khởi động...")

    # Khởi tạo Singleton — model được nạp 1 lần duy nhất
    clip_engine = ClipEngine()
    ocr_engine = OcrEngine()

    # Lưu vào app.state để các endpoint truy cập
    app.state.clip_engine = clip_engine
    app.state.ocr_engine = ocr_engine

    logger.info("AI Service đã sẵn sàng phục vụ.")
    yield
    logger.info("AI Service đang tắt.")


app = FastAPI(
    title="Visual Search AI Service",
    version="0.2.0",
    description="CLIP Embedding + EasyOCR cho Visual Search Engine",
    lifespan=lifespan,
)


# ──────────────────────────────────────────────────────────
# Health Check
# ──────────────────────────────────────────────────────────


@app.get("/health")
def health_check() -> dict[str, str]:
    """Kiểm tra trạng thái service."""
    return {"status": "ok", "service": "ai-service"}


# ──────────────────────────────────────────────────────────
# POST /api/process-image — Indexing (embed + OCR)
# ──────────────────────────────────────────────────────────


@app.post("/api/process-image", response_model=ProcessImageResponse)
async def process_image(image: UploadFile = File(...)):
    """
    Xử lý ảnh cho Indexing: tạo embedding vector + trích xuất OCR text.

    - Input: File ảnh (multipart/form-data)
    - Output: { success, data: { embedding, ocrLines } }
    - Dùng bởi: Backend POST /api/admin/indexing
    """
    start_time = time.time()

    # 1. Validate file type
    if image.content_type not in ALLOWED_MIME_TYPES:
        return ProcessImageResponse(
            success=False,
            error_message=f"File không hợp lệ. Chỉ chấp nhận jpg, png, webp. "
            f"Nhận được: {image.content_type}",
            processing_time_ms=round((time.time() - start_time) * 1000, 2)
        )

    # 2. Đọc file bytes
    image_bytes = await image.read()

    # 3. Validate file size
    if len(image_bytes) > MAX_FILE_SIZE:
        return ProcessImageResponse(
            success=False,
            error_message=f"File quá lớn ({len(image_bytes) / 1024 / 1024:.1f}MB). "
            f"Tối đa 10MB.",
            processing_time_ms=round((time.time() - start_time) * 1000, 2)
        )

    # 4. Tạo embedding vector
    clip_engine: ClipEngine = app.state.clip_engine
    embedding = clip_engine.embed_image_from_bytes(image_bytes)

    if not embedding:
        return ProcessImageResponse(
            success=False,
            error_message="Không thể tạo embedding từ ảnh. Ảnh có thể bị hỏng.",
            processing_time_ms=round((time.time() - start_time) * 1000, 2)
        )

    # 5. Trích xuất OCR text
    ocr_engine: OcrEngine = app.state.ocr_engine
    ocr_lines = ocr_engine.extract_text_from_bytes(image_bytes)

    # 6. Trả kết quả theo API contract
    return ProcessImageResponse(
        success=True,
        data={
            "embedding": embedding,
            "ocrLines": ocr_lines,
        },
        processing_time_ms=round((time.time() - start_time) * 1000, 2)
    )


# ──────────────────────────────────────────────────────────
# POST /api/embed-image — Search by Image (embedding only)
# ──────────────────────────────────────────────────────────


@app.post("/api/embed-image", response_model=EmbedResponse)
async def embed_image(image: UploadFile = File(...)):
    """
    Mã hóa ảnh thành embedding vector (512 chiều). Không chạy OCR.

    - Input: File ảnh (multipart/form-data)
    - Output: { success, data: { embedding } }
    - Dùng bởi: Backend POST /api/search/by-image
    """
    start_time = time.time()

    # 1. Validate file type
    if image.content_type not in ALLOWED_MIME_TYPES:
        return EmbedResponse(
            success=False,
            error_message=f"File không hợp lệ. Chỉ chấp nhận jpg, png, webp. "
            f"Nhận được: {image.content_type}",
            processing_time_ms=round((time.time() - start_time) * 1000, 2)
        )

    # 2. Đọc file bytes
    image_bytes = await image.read()

    # 3. Validate file size
    if len(image_bytes) > MAX_FILE_SIZE:
        return EmbedResponse(
            success=False,
            error_message=f"File quá lớn ({len(image_bytes) / 1024 / 1024:.1f}MB). "
            f"Tối đa 10MB.",
            processing_time_ms=round((time.time() - start_time) * 1000, 2)
        )

    # 4. Tạo embedding vector
    clip_engine: ClipEngine = app.state.clip_engine
    embedding = clip_engine.embed_image_from_bytes(image_bytes)

    if not embedding:
        return EmbedResponse(
            success=False,
            error_message="Không thể tạo embedding từ ảnh. Ảnh có thể bị hỏng.",
            processing_time_ms=round((time.time() - start_time) * 1000, 2)
        )

    return EmbedResponse(
        success=True,
        data={"embedding": embedding},
        processing_time_ms=round((time.time() - start_time) * 1000, 2)
    )


# ──────────────────────────────────────────────────────────
# POST /api/embed-text — Search by Text Semantic
# ──────────────────────────────────────────────────────────


@app.post("/api/embed-text", response_model=EmbedResponse)
async def embed_text(request: TextEmbedRequest):
    """
    Mã hóa text thành embedding vector (512 chiều, cùng space với image).

    - Input: JSON { "text": "sunset on the beach" }
    - Output: { success, data: { embedding } }
    - Dùng bởi: Backend POST /api/search/by-text (searchType=TEXT_SEMANTIC)
    """
    start_time = time.time()

    clip_engine: ClipEngine = app.state.clip_engine
    embedding = clip_engine.embed_text(request.text)

    if not embedding:
        return EmbedResponse(
            success=False,
            error_message=f"Không thể tạo embedding cho text: '{request.text}'",
            processing_time_ms=round((time.time() - start_time) * 1000, 2)
        )

    return EmbedResponse(
        success=True,
        data={"embedding": embedding},
        processing_time_ms=round((time.time() - start_time) * 1000, 2)
    )
