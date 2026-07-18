FROM python:3.12-slim

WORKDIR /app

# Cài system dependencies cần thiết cho EasyOCR (opencv, libgl)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Cài đúng bộ PyTorch CPU-only trước để requirements không kéo bản GPU.
RUN pip install --no-cache-dir \
    torch==2.13.0 \
    torchvision==0.28.0 \
    --index-url https://download.pytorch.org/whl/cpu

# Cài các dependencies còn lại
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY app ./app

# Tải trước CLIP model vào image (force re-download để fix lỗi model bị corrupt)
RUN python -c "from transformers import CLIPModel, CLIPProcessor; CLIPModel.from_pretrained('openai/clip-vit-base-patch32'); CLIPProcessor.from_pretrained('openai/clip-vit-base-patch32'); print('CLIP model cached successfully')"

# Tải trước đúng bộ EasyOCR mà ứng dụng sử dụng để runtime không cần tải thêm.
RUN python -c "import easyocr; easyocr.Reader(['en', 'vi'], gpu=False); print('EasyOCR models cached successfully')"

EXPOSE 9000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "9000", "--reload"]
