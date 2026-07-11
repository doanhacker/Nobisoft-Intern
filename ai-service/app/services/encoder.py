"""
CLIP Encoder Module — Singleton Pattern
========================================
Module lõi của AI Service, chịu trách nhiệm:
- Nạp mô hình CLIP (ViT-B/32) một lần duy nhất vào bộ nhớ
- Mã hóa ảnh thành vector 512 chiều (embed_image)
- Mã hóa text thành vector 512 chiều (embed_text)

Cả hai hàm đều trả về vector đã chuẩn hóa L2 (nằm trên mặt cầu đơn vị),
đảm bảo cosine similarity = dot product → tối ưu cho vector search.
"""

import logging
import threading

import torch
from PIL import Image, UnidentifiedImageError
from transformers import CLIPModel, CLIPProcessor

logger = logging.getLogger(__name__)


def _extract_features(output: object) -> torch.Tensor:
    """Trích xuất tensor đặc trưng từ output của model.

    transformers v5.x trả về BaseModelOutputWithPooling thay vì tensor thuần.
    Hàm này xử lý cả hai trường hợp để tương thích mọi phiên bản.
    """
    if isinstance(output, torch.Tensor):
        # transformers v4.x: trả về tensor trực tiếp
        return output
    # transformers v5.x: trả về BaseModelOutputWithPooling
    # pooler_output chứa vector đã project qua projection head
    if hasattr(output, "pooler_output") and output.pooler_output is not None:
        return output.pooler_output
    # Fallback: lấy [CLS] token từ last_hidden_state
    if hasattr(output, "last_hidden_state"):
        return output.last_hidden_state[:, 0, :]
    raise TypeError(f"Unexpected output type from model: {type(output)}")


class ClipEngine:
    """
    Singleton class quản lý mô hình CLIP.

    Dù khởi tạo bao nhiêu lần, chỉ có 1 instance duy nhất được tạo.
    Mô hình chỉ nạp vào RAM/VRAM một lần khi instance đầu tiên được tạo.

    Usage:
        engine = ClipEngine()
        vector = engine.embed_image("path/to/image.jpg")
        vector = engine.embed_text("a red car")
    """

    _instance = None
    _lock = threading.Lock()  # Thread-safe singleton

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                # Double-checked locking: kiểm tra lần 2 sau khi acquire lock
                if cls._instance is None:
                    logger.info("Khởi tạo ClipEngine: Nạp mô hình CLIP vào bộ nhớ...")
                    instance = super(ClipEngine, cls).__new__(cls)
                    instance._initialize()
                    cls._instance = instance
        return cls._instance

    def _initialize(self):
        """Nạp mô hình CLIP và processor vào bộ nhớ."""
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"Thiết bị tính toán: {self.device}")

        model_name = "openai/clip-vit-base-patch32"
        self.model = CLIPModel.from_pretrained(model_name).to(self.device)
        self.processor = CLIPProcessor.from_pretrained(model_name)

        # Chuyển sang chế độ inference (tắt dropout, batch norm ở eval mode)
        self.model.eval()

        logger.info("ClipEngine đã sẵn sàng.")

    def embed_text(self, query: str) -> list[float]:
        """
        Mã hóa văn bản thành vector 512 chiều đã chuẩn hóa L2.

        Args:
            query: Câu truy vấn bằng ngôn ngữ tự nhiên.
                   Ví dụ: "sunset on the beach", "a red car"

        Returns:
            List[float] có 512 phần tử, ||vector||₂ = 1.0
        """
        inputs = self.processor( text=[query], return_tensors="pt", padding=True, truncation=True) # type: ignore

        
        # transformers mới (spread **inputs có thể truyền key thừa)
        input_ids = inputs["input_ids"].to(self.device)
        attention_mask = inputs["attention_mask"].to(self.device)

        with torch.no_grad():
            raw_output = self.model.get_text_features(
                input_ids=input_ids, attention_mask=attention_mask
            )
            # Trích xuất tensor (tương thích transformers v4.x và v5.x)
            text_features = _extract_features(raw_output)
            # Chuẩn hóa L2: ép vector về mặt cầu đơn vị
            # Sau chuẩn hóa: cosine_similarity(a, b) = dot(a, b)
            text_features = torch.nn.functional.normalize(text_features, p=2, dim=-1)

        return text_features.cpu().numpy().tolist()[0]

    def embed_image(self, image_path: str) -> list[float]:
        """
        Mã hóa ảnh thành vector 512 chiều đã chuẩn hóa L2.

        Args:
            image_path: Đường dẫn tới file ảnh (jpg, png, webp, ...)

        Returns:
            List[float] có 512 phần tử nếu thành công, [] nếu lỗi.
        """
        try:
            # convert("RGB") để xử lý ảnh RGBA, grayscale, palette mode
            image = Image.open(image_path).convert("RGB")
            return self._encode_image(image)

        except FileNotFoundError:
            logger.error(f"Lỗi truy xuất: Không tìm thấy tệp tin tại {image_path}")
            return []
        except UnidentifiedImageError:
            logger.error(
                f"Lỗi định dạng: Tệp tin {image_path} không phải là hình ảnh hợp lệ"
            )
            return []
        except Exception as e:
            logger.error(f"Lỗi hệ thống không xác định tại {image_path}: {str(e)}")
            return []

    def embed_image_from_bytes(self, image_bytes: bytes) -> list[float]:
        """
        Mã hóa ảnh từ bytes (upload file) thành vector 512 chiều.

        Args:
            image_bytes: Dữ liệu binary của ảnh (từ UploadFile.read())

        Returns:
            List[float] có 512 phần tử nếu thành công, [] nếu lỗi.
        """
        import io

        try:
            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            return self._encode_image(image)

        except UnidentifiedImageError:
            logger.error("Lỗi định dạng: Dữ liệu ảnh upload không hợp lệ")
            return []
        except Exception as e:
            logger.error(f"Lỗi hệ thống khi xử lý ảnh upload: {str(e)}")
            return []

    def _encode_image(self, image: Image.Image) -> list[float]:
        """Logic mã hóa ảnh chung (internal), dùng bởi cả embed_image và embed_image_from_bytes."""
        inputs = self.processor(images=image, return_tensors="pt") # type: ignore
        pixel_values = inputs["pixel_values"].to(self.device)

        with torch.no_grad():
            raw_output = self.model.get_image_features(pixel_values=pixel_values)
            image_features = _extract_features(raw_output)
            image_features = torch.nn.functional.normalize(
                image_features, p=2, dim=-1
            )

        return image_features.cpu().numpy().tolist()[0]

