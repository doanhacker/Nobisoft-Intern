import asyncio
import json

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile

from app.core.config import MAX_BATCH_SIZE
from app.schemas.indexing import BatchIndexingResponse


router = APIRouter(
    prefix="/api/indexing",
    tags=["Indexing"],
)


@router.post(
    "/batch",
    response_model=BatchIndexingResponse,
)
async def index_batch(
    request: Request,
    image_ids: str = Form(
        ...,
        description=(
            "Các ID theo đúng thứ tự file, phân cách bằng dấu phẩy. "
            "Endpoint cũng chấp nhận JSON array."
        ),
    ),
    images: list[UploadFile] = File(
        ...,
        description="Từ 1 đến 4 file JPG, PNG hoặc WebP.",
        json_schema_extra={
            "items": {
                "type": "string",
                "format": "binary",
            }
        },
    ),
) -> BatchIndexingResponse:
    try:
        decoded_image_ids = json.loads(image_ids)
    except json.JSONDecodeError:
        # Swagger UI có thể serialize chuỗi form thành danh sách phân cách
        # bằng dấu phẩy và loại bỏ dấu ngoặc của JSON array.
        decoded_image_ids = [
            image_id.strip()
            for image_id in image_ids.split(",")
            if image_id.strip()
        ]

    if not isinstance(decoded_image_ids, list) or not all(
        isinstance(image_id, str) and image_id.strip()
        for image_id in decoded_image_ids
    ):
        raise HTTPException(
            status_code=400,
            detail="image_ids phải là JSON array gồm các chuỗi không rỗng",
        )

    parsed_image_ids = [
        image_id.strip() for image_id in decoded_image_ids
    ]

    if len(images) == 0:
        raise HTTPException(
            status_code=400,
            detail="Batch phải có ít nhất một ảnh",
        )

    if len(images) > MAX_BATCH_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"Tối đa {MAX_BATCH_SIZE} ảnh mỗi batch",
        )

    if len(parsed_image_ids) != len(images):
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Số lượng image_ids phải bằng số lượng images",
                "image_ids_count": len(parsed_image_ids),
                "images_count": len(images),
            },
        )

    if len(set(parsed_image_ids)) != len(parsed_image_ids):
        raise HTTPException(
            status_code=400,
            detail="image_id trong batch không được trùng",
        )

    service = request.app.state.indexing_service

    # Mỗi ảnh là một task riêng. IndexingService giới hạn toàn cục tối đa
    # 4 tác vụ inference CPU chạy đồng thời, kể cả khi có nhiều request.
    results = await asyncio.gather(
        *(
            service.process_image(
                image_id=image_id,
                image=image,
            )
            for image_id, image in zip(parsed_image_ids, images)
        )
    )

    succeeded = sum(
        1 for result in results if result.success
    )
    failed = len(results) - succeeded

    return BatchIndexingResponse(
        success=failed == 0,
        total=len(results),
        succeeded=succeeded,
        failed=failed,
        results=results,
    )
