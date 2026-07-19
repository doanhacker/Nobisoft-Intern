from pydantic import BaseModel, Field, field_validator


class ImageEmbeddingData(BaseModel):
    embedding: list[float] = Field(min_length=512, max_length=512)


class ImageEmbeddingResponse(BaseModel):
    success: bool
    data: ImageEmbeddingData | None = None
    error_message: str | None = None


class TextEmbeddingRequest(BaseModel):
    text: str = Field(min_length=1, max_length=500)

    @field_validator("text")
    @classmethod
    def validate_text(cls, value: str) -> str:
        normalized_value = value.strip()
        if not normalized_value:
            raise ValueError("Nội dung tìm kiếm không được để trống")
        return normalized_value


class TextEmbeddingResponse(BaseModel):
    success: bool
    data: ImageEmbeddingData | None = None
    error_message: str | None = None
