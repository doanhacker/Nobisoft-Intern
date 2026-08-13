from contextlib import asynccontextmanager

from fastapi import FastAPI

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

app.include_router(indexing_router)
app.include_router(search_router)
