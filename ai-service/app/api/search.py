from fastapi import APIRouter, File, HTTPException, Request, UploadFile

from app.schemas.search import (
    ImageEmbeddingData,
    ImageEmbeddingResponse,
    TextEmbeddingRequest,
    TextEmbeddingResponse,
)
from app.services.image_service import InvalidImageError


router = APIRouter(prefix="/api", tags=["Search"])


@router.post(
    "/embed-image",
    response_model=ImageEmbeddingResponse,
)
async def embed_image(
    request: Request,
    image: UploadFile = File(..., description="Ảnh dùng để tìm kiếm."),
) -> ImageEmbeddingResponse:
    service = request.app.state.indexing_service

    try:
        embedding = await service.create_image_embedding(image)
    except InvalidImageError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Không thể tạo embedding cho ảnh: {exc}",
        ) from exc

    return ImageEmbeddingResponse(
        success=True,
        data=ImageEmbeddingData(embedding=embedding),
    )


@router.post(
    "/embed-text",
    response_model=TextEmbeddingResponse,
)
async def embed_text(
    request: Request,
    payload: TextEmbeddingRequest,
) -> TextEmbeddingResponse:
    service = request.app.state.indexing_service

    try:
        embedding = await service.create_text_embedding(payload.text)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Không thể tạo embedding cho văn bản: {exc}",
        ) from exc

    return TextEmbeddingResponse(
        success=True,
        data=ImageEmbeddingData(embedding=embedding),
    )
