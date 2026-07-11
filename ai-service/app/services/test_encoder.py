"""
Test Script cho ClipEngine
===========================
Kiểm thử:
1. Singleton Pattern — đảm bảo chỉ 1 instance trong bộ nhớ
2. Text Embedding — vector 512 chiều, kiểu float
3. Image Embedding — vector 512 chiều từ ảnh thật
4. Chuẩn hóa L2 — ||vector||₂ ≈ 1.0
5. Cross-modal — text và image nằm cùng vector space

Cách chạy:
    python -m app.services.test_encoder
"""

import math
import os
import sys

# Thêm đường dẫn để import được module
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from app.services.encoder import ClipEngine


def test_singleton():
    """Kiểm thử Singleton: 2 lần khởi tạo phải trả về cùng 1 object."""
    print("\n--- Test 1: Singleton Pattern ---")
    engine_1 = ClipEngine()
    engine_2 = ClipEngine()

    assert engine_1 is engine_2, "FAIL: Hai instance có địa chỉ bộ nhớ khác nhau!"
    assert id(engine_1) == id(engine_2), "FAIL: id() không trùng khớp!"

    print(f"  engine_1 id: {id(engine_1)}")
    print(f"  engine_2 id: {id(engine_2)}")
    print("   PASS: Singleton hoạt động — chỉ 1 instance trong bộ nhớ.")


def test_text_embedding():
    """Kiểm thử embed_text: vector 512 chiều, kiểu float."""
    print("\n--- Test 2: Text Embedding ---")
    engine = ClipEngine()

    vector = engine.embed_text("a sunset on the beach")

    # Kiểm tra kiểu dữ liệu trả về
    assert isinstance(vector, list), f"FAIL: Trả về {type(vector)}, kỳ vọng list"
    # Kiểm tra kích thước vector
    assert len(vector) == 512, f"FAIL: Vector có {len(vector)} chiều, kỳ vọng 512"
    # Kiểm tra từng phần tử là float
    assert isinstance(vector[0], float), f"FAIL: Phần tử có kiểu {type(vector[0])}, kỳ vọng float"

    print(f"  Kích thước vector: {len(vector)}")
    print(f"  Kiểu phần tử: {type(vector[0])}")
    print(f"  5 giá trị đầu: {[round(v, 4) for v in vector[:5]]}")
    print("   PASS: Text embedding đúng format.")


def test_l2_normalization():
    """Kiểm thử chuẩn hóa L2: ||vector||₂ ≈ 1.0."""
    print("\n--- Test 3: L2 Normalization ---")
    engine = ClipEngine()

    vector = engine.embed_text("a red car on the road")
    # Tính L2 norm: sqrt(sum(x_i^2))
    l2_norm = math.sqrt(sum(x * x for x in vector))

    # Cho phép sai số rất nhỏ do floating point
    assert abs(l2_norm - 1.0) < 1e-5, f"FAIL: L2 norm = {l2_norm}, kỳ vọng ≈ 1.0"

    print(f"  L2 norm: {l2_norm:.6f}")
    print("   PASS: Vector đã chuẩn hóa L2 (nằm trên mặt cầu đơn vị).")


def test_image_embedding():
    """Kiểm thử embed_image: cần ảnh mẫu để chạy."""
    print("\n--- Test 4: Image Embedding ---")

    # Tạo ảnh mẫu tạm thời để test
    from PIL import Image

    test_image_path = "_test_sample.jpg"
    # Tạo ảnh 224x224 RGB ngẫu nhiên
    import random
    img = Image.new("RGB", (224, 224), color=(
        random.randint(0, 255),
        random.randint(0, 255),
        random.randint(0, 255),
    ))
    img.save(test_image_path)

    try:
        engine = ClipEngine()
        vector = engine.embed_image(test_image_path)

        assert isinstance(vector, list), f"FAIL: Trả về {type(vector)}, kỳ vọng list"
        assert len(vector) == 512, f"FAIL: Vector có {len(vector)} chiều, kỳ vọng 512"
        assert isinstance(vector[0], float), f"FAIL: Phần tử có kiểu {type(vector[0])}"

        # Kiểm tra L2 norm
        l2_norm = math.sqrt(sum(x * x for x in vector))
        assert abs(l2_norm - 1.0) < 1e-5, f"FAIL: L2 norm = {l2_norm}"

        print(f"  Kích thước vector: {len(vector)}")
        print(f"  L2 norm: {l2_norm:.6f}")
        print(f"  5 giá trị đầu: {[round(v, 4) for v in vector[:5]]}")
        print("   PASS: Image embedding đúng format.")
    finally:
        # Dọn dẹp ảnh tạm
        if os.path.exists(test_image_path):
            os.remove(test_image_path)


def test_cross_modal_similarity():
    """Kiểm thử text và image nằm cùng vector space (cosine similarity > 0)."""
    print("\n--- Test 5: Cross-Modal Vector Space ---")

    from PIL import Image

    test_image_path = "_test_cross_modal.jpg"
    # Tạo ảnh đỏ đơn sắc
    img = Image.new("RGB", (224, 224), color=(255, 0, 0))
    img.save(test_image_path)

    try:
        engine = ClipEngine()
        vec_image = engine.embed_image(test_image_path)
        vec_text = engine.embed_text("a solid red image")

        # Cosine similarity = dot product (vì đã L2 normalize)
        similarity = sum(a * b for a, b in zip(vec_image, vec_text))

        print(f"  Cosine similarity (red image vs 'a solid red image'): {similarity:.4f}")
        # Similarity nên > 0 (cùng vector space)
        assert -1.0 <= similarity <= 1.0, f"FAIL: Similarity ngoài khoảng [-1, 1]"

        print("   PASS: Text và Image chia sẻ cùng vector space.")
    finally:
        if os.path.exists(test_image_path):
            os.remove(test_image_path)


def run_all_tests():
    print("=" * 55)
    print("  KIỂM THỬ ĐỘ TIN CẬY — ClipEngine")
    print("=" * 55)

    test_singleton()
    test_text_embedding()
    test_l2_normalization()
    test_image_embedding()
    test_cross_modal_similarity()

    print("\n" + "=" * 55)
    print("  TẤT CẢ CÁC BÀI KIỂM THỬ ĐỀU PASS!")
    print("=" * 55)


if __name__ == "__main__":
    run_all_tests()
