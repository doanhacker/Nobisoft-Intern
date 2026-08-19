from io import BytesIO

from fastapi import UploadFile
from PIL import Image, UnidentifiedImageError

from app.core.config import ALLOWED_CONTENT_TYPES, MAX_FILE_SIZE
from app.schemas.indexing import ImageMetadata
from app.services.preprocessing import preprocess_image


class InvalidImageError(Exception):
    pass


async def read_and_preprocess_image(
    image: UploadFile,
) -> tuple[Image.Image, bytes, ImageMetadata]:
    if image.content_type not in ALLOWED_CONTENT_TYPES:
        raise InvalidImageError(
            f"Định dạng không hợp lệ: {image.content_type}"
        )

    image_bytes = await image.read()

    if not image_bytes:
        raise InvalidImageError("File ảnh rỗng")

    if len(image_bytes) > MAX_FILE_SIZE:
        raise InvalidImageError("File ảnh vượt quá 10MB")

    try:
        pil_image = Image.open(BytesIO(image_bytes))
        pil_image.load()
    except (UnidentifiedImageError, OSError) as exc:
        raise InvalidImageError("Không thể đọc file ảnh") from exc

    original_format = (pil_image.format or "unknown").lower()
    width, height = pil_image.size

    rgb_image = pil_image.convert("RGB")

    # Tiền xử lý ảnh: xoay đúng chiều, resize, tăng chất lượng OCR
    rgb_image = preprocess_image(rgb_image)

    metadata = ImageMetadata(
        width=width,
        height=height,
        format=original_format,
        file_size=len(image_bytes),
    )

    return rgb_image, image_bytes, metadata