import re
import unicodedata
from collections.abc import Sequence
from typing import cast

import easyocr
import numpy as np
from PIL import Image

from app.core.config import OCR_LANGUAGES
from app.schemas.indexing import OcrResult


def normalize_text(text: str) -> str:
    normalized = unicodedata.normalize("NFKC", text)
    normalized = normalized.lower().strip()
    normalized = re.sub(r"\s+", " ", normalized)
    return normalized


class OcrService:
    def __init__(self) -> None:
        self.reader = easyocr.Reader(
            OCR_LANGUAGES,
            gpu=False,
        )

    def extract_text(
        self,
        image: Image.Image,
    ) -> list[OcrResult]:
        image_array = np.asarray(image)

        raw_results = self.reader.readtext(
            image_array,
            detail=1,
            paragraph=False,
        )

        results: list[OcrResult] = []

        for bounding_box, text, confidence in raw_results:
            clean_text = text.strip()

            if not clean_text:
                continue

            points = cast(
                Sequence[Sequence[float]],
                bounding_box,
            )
            integer_box: list[list[int]] = [
                [int(round(point[0])), int(round(point[1]))]
                for point in points
            ]

            results.append(
                OcrResult(
                    text=clean_text,
                    normalized_text=normalize_text(clean_text),
                    confidence=float(confidence),
                    bounding_box=integer_box,
                )
            )

        return results
