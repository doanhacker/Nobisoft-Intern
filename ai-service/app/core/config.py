# Cấu hình tập trung cho AI Service
# Tất cả hằng số cấu hình đều nằm ở đây để dễ quản lý và thay đổi.

# ── Batch Processing ──
MAX_BATCH_SIZE = 4

# ── Image Validation ──
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
}

# ── Image Preprocessing ──
# Kích thước tối đa cạnh dài nhất cho inference.
# CLIP chỉ dùng 224x224, nhưng OCR cần ảnh lớn hơn để đọc chữ.
MAX_INFERENCE_SIZE = 1024  # px

# ── AI Models ──
# Model CLIP Tiêu chuẩn (English): Gemma 2B trên Backend sẽ dịch prompt Tiếng Việt sang Tiếng Anh
CLIP_MODEL_NAME = "openai/clip-vit-base-patch32"

# Ngôn ngữ cho EasyOCR
OCR_LANGUAGES = ["en", "vi"]
