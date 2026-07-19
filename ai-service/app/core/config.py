#  cấu hình file , định dạng , model name.=> tạo cấu hình

MAX_BATCH_SIZE = 4
MAX_FILE_SIZE = 10 * 1024 * 1024

ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
}

CLIP_MODEL_NAME = "openai/clip-vit-base-patch32"
OCR_LANGUAGES = ["en", "vi"]
# ocr nhận diện ngôn ngữ 
