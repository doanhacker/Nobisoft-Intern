"""
Pydantic Schemas — Hợp đồng Dữ liệu (Data Contracts)
=======================================================
Định nghĩa cấu trúc request/response giữa AI Service ↔ Backend,
đảm bảo kiểm soát kiểu dữ liệu và validation tự động.

Tuân theo API contract trong docs/api_flow_documentation.md
"""

from pydantic import BaseModel, Field


# ──────────────────────────────────────────────────────────
# Request Models
# ──────────────────────────────────────────────────────────


class TextEmbedRequest(BaseModel):
    """Request body cho POST /api/embed-text."""

    text: str = Field(
        ...,
        min_length=1,
        max_length=1000,
        description="Chuỗi truy vấn văn bản đầu vào",
        examples=["một chiếc xe thể thao màu đỏ"],
    )


class ImageEmbedRequest(BaseModel):
    """Request schema (dùng nội bộ). API thực tế nhận multipart/form-data."""

    image_path: str = Field(
        ..., description="Đường dẫn vật lý tuyệt đối đến tệp tin ảnh"
    )


# ──────────────────────────────────────────────────────────
# Response Models
# ──────────────────────────────────────────────────────────


class EmbedResponse(BaseModel):
    """Response chung cho các endpoint embed (image/text)."""

    success: bool = Field(..., description="Trạng thái thực thi mã hóa")
    data: dict | None = Field(
        default=None,
        description="Dữ liệu kết quả chứa embedding vector",
    )
    error_message: str | None = Field(
        default=None, description="Chi tiết ngoại lệ nếu có"
    )
    processing_time_ms: float = Field(
        default=0.0, description="Thời gian xử lý tính bằng mili-giây"
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "success": True,
                    "data": {
                        "embedding": [0.0123, -0.0456, 0.0789, "... (512 chiều)"]
                    },
                    "error_message": None,
                    "processing_time_ms": 125.5
                }
            ]
        }
    }


class OcrLineItem(BaseModel):
    """Một dòng text OCR được phát hiện trên ảnh."""

    rawText: str = Field(..., description="Nội dung text gốc")
    confidenceScore: float = Field(
        ..., ge=0.0, le=1.0, description="Độ tin cậy (0-1)"
    )
    boundingBox: dict = Field(
        ...,
        description="Vị trí trên ảnh {x, y, width, height}",
    )


class ProcessImageResponse(BaseModel):
    """Response cho POST /api/process-image (Indexing: embed + OCR)."""

    success: bool = Field(..., description="Trạng thái thực thi")
    data: dict | None = Field(
        default=None,
        description="embedding + ocrLines",
    )
    error_message: str | None = Field(
        default=None, description="Chi tiết ngoại lệ nếu có"
    )
    processing_time_ms: float = Field(
        default=0.0, description="Thời gian xử lý tính bằng mili-giây"
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "success": True,
                    "data": {
                        "embedding": [0.0123, -0.0456, 0.0789, "... (512 chiều)"],
                        "ocrLines": [
                            {
                                "rawText": "NOBISOFT TECHNOLOGY CO., LTD",
                                "confidenceScore": 0.98,
                                "boundingBox": {"x": 100, "y": 50, "width": 520, "height": 30}
                            }
                        ]
                    },
                    "error_message": None,
                    "processing_time_ms": 450.2
                }
            ]
        }
    }
