import asyncio

from fastapi import UploadFile
from PIL import Image

from app.schemas.indexing import IndexingResult, OcrResult
from app.services.clip_service import ClipService
from app.services.image_service import (
    InvalidImageError,
    read_and_preprocess_image,
)
from app.services.ocr_service import OcrService


class IndexingService:
    def __init__(
        self,
        clip_service: ClipService,
        ocr_service: OcrService,
    ) -> None:
        self.clip_service = clip_service
        self.ocr_service = ocr_service
        self._inference_slots = asyncio.Semaphore(4)

    def _run_inference(
        self,
        image: Image.Image,
    ) -> tuple[list[float], list[OcrResult]]:
        """Chạy phần CPU-bound trong worker thread."""
        embedding = self.clip_service.create_image_embedding(image)
        ocr_results = self.ocr_service.extract_text(image)
        return embedding, ocr_results

    async def create_image_embedding(
        self,
        image: UploadFile,
    ) -> list[float]:
        """Tạo embedding CLIP cho ảnh dùng làm truy vấn tìm kiếm."""
        pil_image, _, _ = await read_and_preprocess_image(image)

        async with self._inference_slots:
            embedding = await asyncio.to_thread(
                self.clip_service.create_image_embedding,
                pil_image,
            )

        if len(embedding) != 512:
            raise RuntimeError("Embedding phải có 512 chiều")

        return embedding

    async def create_text_embedding(
        self,
        text: str,
    ) -> list[float]:
        """Tạo embedding CLIP cho truy vấn văn bản."""
        async with self._inference_slots:
            embedding = await asyncio.to_thread(
                self.clip_service.create_text_embedding,
                text,
            )

        if len(embedding) != 512:
            raise RuntimeError("Embedding text phải có 512 chiều")

        return embedding

    async def process_image(
        self,
        image_id: str,
        image: UploadFile,
    ) -> IndexingResult:
        try:
            pil_image, _, metadata = (
                await read_and_preprocess_image(image)
            )

            # Không chạy CLIP/EasyOCR trực tiếp trên event loop. Mỗi ảnh được
            # đưa sang một thread và toàn service chỉ cho phép tối đa 4 thread
            # inference hoạt động cùng lúc.
            async with self._inference_slots:
                embedding, ocr_results = await asyncio.to_thread(
                    self._run_inference,
                    pil_image,
                )

            if len(embedding) != 512:
                raise RuntimeError(
                    "Embedding phải có 512 chiều"
                )

            return IndexingResult(
                success=True,
                image_id=image_id,
                metadata=metadata,
                embedding=embedding,
                ocr_results=ocr_results,
            )

        except InvalidImageError as exc:
            return IndexingResult(
                success=False,
                image_id=image_id,
                error=str(exc),
            )

        except Exception as exc:
            return IndexingResult(
                success=False,
                image_id=image_id,
                error=f"Xử lý ảnh thất bại: {exc}",
            )
