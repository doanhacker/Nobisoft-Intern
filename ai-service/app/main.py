from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request

from app.api.indexing import router as indexing_router
from app.api.search import router as search_router
from app.services.clip_service import ClipService
from app.services.indexing_service import IndexingService
from app.services.ocr_service import OcrService


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Khởi tạo model một lần khi service bắt đầu chạy."""
    clip_service = ClipService()
    ocr_service = OcrService()
    app.state.indexing_service = IndexingService(
        clip_service=clip_service,
        ocr_service=ocr_service,
    )
    yield


app = FastAPI(
    title="Visual Search AI Service",
    version="1.0.0",
    description="Batch image embedding and OCR service",
    lifespan=lifespan,
)

# Swagger UI hiện ổn định hơn với multipart array trên OpenAPI 3.0.3.
app.openapi_version = "3.0.3"


@app.get("/api/health", tags=["Health"])
@app.get("/health", tags=["Health"])
async def health_check(request: Request) -> dict[str, str]:
    """Kiểm tra AI Service và các model đã sẵn sàng."""
    service = getattr(request.app.state, "indexing_service", None)
    if (
        not service
        or not hasattr(service, "clip_service")
        or getattr(service.clip_service, "model", None) is None
    ):
        raise HTTPException(status_code=503, detail="AI Service chưa sẵn sàng")
    return {"status": "ok"}


app.include_router(indexing_router)
app.include_router(search_router)
