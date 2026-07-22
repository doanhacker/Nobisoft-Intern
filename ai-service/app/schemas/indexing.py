from pydantic import BaseModel, Field


class ImageMetadata(BaseModel):
    width: int
    height: int
    format: str
    file_size: int


class OcrResult(BaseModel):
    text: str
    normalized_text: str
    confidence: float = Field(ge=0, le=1)
    bounding_box: list[list[int]]


class IndexingResult(BaseModel):
    success: bool
    image_id: str
    metadata: ImageMetadata | None = None
    embedding: list[float] = Field(default_factory=list)
    ocr_results: list[OcrResult] = Field(default_factory=list)
    error: str | None = None


class BatchIndexingResponse(BaseModel):
    success: bool
    total: int
    succeeded: int
    failed: int
    processing_time_ms: float
    results: list[IndexingResult]
