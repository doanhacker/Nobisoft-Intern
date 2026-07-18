import torch
import torch.nn.functional as functional
from PIL import Image
from transformers import CLIPModel, CLIPProcessor
from typing import Any, cast

from app.core.config import CLIP_MODEL_NAME


class ClipService:
    def __init__(self) -> None:
        self.processor: Any = CLIPProcessor.from_pretrained(
            CLIP_MODEL_NAME
        )
        self.model: Any = CLIPModel.from_pretrained(
            CLIP_MODEL_NAME
        )

        self.model.eval()

    def create_image_embedding(
        self,
        image: Image.Image,
    ) -> list[float]:
        inputs = cast(
            dict[str, torch.Tensor],
            self.processor(
                images=image,
                return_tensors="pt",
            ),
        )

        with torch.inference_mode():
            model_output = self.model.get_image_features(**inputs)

            # Transformers 5.x trả BaseModelOutputWithPooling; các bản cũ
            # có thể trả thẳng Tensor.
            if isinstance(model_output, torch.Tensor):
                features = model_output
            else:
                features = cast(
                    torch.Tensor,
                    model_output.pooler_output,
                )

            # Chuẩn hóa L2 để cosine similarity ổn định.
            features = functional.normalize(
                features,
                p=2,
                dim=-1,
            )

        return [float(value) for value in features[0].tolist()]
