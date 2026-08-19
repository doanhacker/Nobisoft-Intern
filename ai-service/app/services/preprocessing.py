"""
Module tiền xử lý ảnh trước khi đưa vào CLIP và EasyOCR.

Pipeline xử lý 3 bước:
1. auto_orient   — Xoay ảnh đúng chiều theo EXIF metadata (ảnh chụp từ điện thoại)
2. resize        — Thu nhỏ ảnh lớn (4K, 8K) để tăng tốc inference
3. enhance       — Tăng contrast & sharpness để OCR nhận diện chữ tốt hơn
"""

import logging

from PIL import Image, ImageEnhance, ImageOps

from app.core.config import MAX_INFERENCE_SIZE

logger = logging.getLogger(__name__)


def auto_orient(image: Image.Image) -> Image.Image:
    """
    Tự động xoay ảnh đúng chiều dựa vào EXIF metadata.

    Ảnh chụp từ điện thoại thường lưu thông tin hướng xoay
    trong EXIF thay vì xoay pixel thật. Nếu không xử lý,
    CLIP sẽ nhận diện ảnh bị xoay ngang → embedding sai.
    """
    oriented = ImageOps.exif_transpose(image)
    if oriented is not image:
        logger.info("Đã xoay ảnh theo EXIF orientation")
    return oriented


def resize_for_inference(image: Image.Image) -> Image.Image:
    """
    Thu nhỏ ảnh lớn để tăng tốc inference.

    CLIP chỉ sử dụng 224x224 pixel, còn EasyOCR cần khoảng
    1024px để đọc chữ rõ. Ảnh 4K (4000x3000) đưa thẳng vào
    là lãng phí hoàn toàn CPU và RAM.
    """
    width, height = image.size
    max_dim = max(width, height)

    if max_dim <= MAX_INFERENCE_SIZE:
        return image

    scale = MAX_INFERENCE_SIZE / max_dim
    new_width = int(width * scale)
    new_height = int(height * scale)
    resized = image.resize((new_width, new_height), Image.LANCZOS)

    logger.info(
        "Resize ảnh: %dx%d → %dx%d (%.0f%%)",
        width,
        height,
        new_width,
        new_height,
        scale * 100,
    )
    return resized


def enhance_for_ocr(image: Image.Image) -> Image.Image:
    """
    Tăng chất lượng ảnh để OCR nhận diện chữ tốt hơn.

    Ảnh quá tối hoặc contrast thấp khiến EasyOCR nhận diện
    chữ kém. Tăng nhẹ contrast (20%) và sharpness (30%) sẽ
    cải thiện đáng kể độ chính xác.
    """
    # Tăng contrast nhẹ (1.0 = giữ nguyên, 1.2 = tăng 20%)
    contrast_enhancer = ImageEnhance.Contrast(image)
    image = contrast_enhancer.enhance(1.2)

    # Tăng độ sắc nét nhẹ (1.0 = giữ nguyên, 1.3 = tăng 30%)
    sharpness_enhancer = ImageEnhance.Sharpness(image)
    image = sharpness_enhancer.enhance(1.3)

    return image


def preprocess_image(image: Image.Image) -> Image.Image:
    """
    Pipeline chính: chạy tất cả các bước tiền xử lý theo thứ tự.

    Thứ tự quan trọng:
    1. Xoay trước (vì EXIF phải xử lý trên ảnh gốc)
    2. Resize sau (để giảm kích thước xử lý cho bước tiếp theo)
    3. Enhance cuối (chỉ cần tăng chất lượng trên ảnh đã resize)
    """
    image = auto_orient(image)
    image = resize_for_inference(image)
    image = enhance_for_ocr(image)
    return image
