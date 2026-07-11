"""
OCR Service — EasyOCR Singleton
================================
Module trích xuất text từ ảnh sử dụng EasyOCR.
Áp dụng Singleton Pattern giống ClipEngine để tránh nạp model OCR nhiều lần.

Output format tuân theo API contract:
    ocrLines: [{rawText, confidenceScore, boundingBox}, ...]
"""

import io
import logging
import threading

import easyocr
from PIL import Image

logger = logging.getLogger(__name__)


class OcrEngine:
    """
    Singleton class quản lý EasyOCR Reader.

    Usage:
        ocr = OcrEngine()
        lines = ocr.extract_text_from_bytes(image_bytes)
    """

    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    logger.info("Khởi tạo OcrEngine: Nạp mô hình EasyOCR...")
                    instance = super(OcrEngine, cls).__new__(cls)
                    instance._initialize()
                    cls._instance = instance
        return cls._instance

    def _initialize(self):
        """Nạp EasyOCR Reader vào bộ nhớ."""
        # gpu=False cho môi trường không có GPU, tự chuyển sang GPU nếu có
        self.reader = easyocr.Reader(["en"], gpu=False)
        logger.info("OcrEngine đã sẵn sàng.")

    def extract_text_from_bytes(self, image_bytes: bytes) -> list[dict]:
        """
        Trích xuất text từ ảnh (bytes) và trả về theo format API contract.

        Args:
            image_bytes: Dữ liệu binary của ảnh

        Returns:
            List[dict] với mỗi phần tử có format:
            {
                "rawText": str,
                "confidenceScore": float,
                "boundingBox": {"x": int, "y": int, "width": int, "height": int}
            }
            Trả về [] nếu ảnh không có text hoặc lỗi.
        """
        try:
            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

            # EasyOCR nhận numpy array
            import numpy as np

            image_np = np.array(image)

            # readtext trả về: [(bbox, text, confidence), ...]
            # bbox là list 4 điểm [[x1,y1],[x2,y2],[x3,y3],[x4,y4]]
            results = self.reader.readtext(image_np)

            ocr_lines = []
            for bbox, text, confidence in results:
                # Chỉ giữ kết quả có confidence >= 0.3
                if confidence < 0.3:
                    continue

                # Chuyển bbox 4 điểm thành {x, y, width, height}
                x_coords = [point[0] for point in bbox]
                y_coords = [point[1] for point in bbox]
                x_min = int(min(x_coords))
                y_min = int(min(y_coords))
                width = int(max(x_coords) - x_min)
                height = int(max(y_coords) - y_min)

                ocr_lines.append(
                    {
                        "rawText": text,
                        "confidenceScore": round(float(confidence), 4),
                        "boundingBox": {
                            "x": x_min,
                            "y": y_min,
                            "width": width,
                            "height": height,
                        },
                    }
                )

            logger.info(f"OCR phát hiện {len(ocr_lines)} dòng text.")
            return ocr_lines

        except Exception as e:
            logger.error(f"Lỗi OCR: {str(e)}")
            return []

    def extract_text_from_path(self, image_path: str) -> list[dict]:
        """Trích xuất text từ file path."""
        try:
            with open(image_path, "rb") as f:
                return self.extract_text_from_bytes(f.read())
        except FileNotFoundError:
            logger.error(f"OCR: Không tìm thấy file {image_path}")
            return []
