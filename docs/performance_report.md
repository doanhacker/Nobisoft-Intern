# Báo cáo Tổng hợp Hiệu năng Hệ thống Visual Search

## Phần 1: Luồng Indexing (Upload & AI Processing)
**Đặc điểm:** Bất đồng bộ (Asynchronous) qua RabbitMQ. Khách hàng không cần đợi AI xử lý xong.

| Số ảnh | Gọi song song | Thời gian upload | Thời gian index |
|---|---|---|---|
| 1 | 1 | 824ms (1.21 img/s) | 2.16s (0.57 img/s) |
| 10 | 1 | 755ms (13.25 img/s) | 17.78s (1,68 img/s) |
| 100 | 1 | 4.97s (20.12 img/s) | 183.3s (1,62 img/s) |
| 100 | 5 | 3.39s (29.47 img/s) | 194.1s (1,53 img/s) |
| 1000 | 1 | 44.97s (22.24 img/s) | 1861.1s (1,59 img/s) |
| 1000 | 20 | 16.55s (60.39 img/s) | 1875.5s (1,59 img/s) |
| 8000 | 200 | 120s (66.6 img/s) | 18094s (1,61 img/s) |

---

## Phần 2: Luồng Tìm kiếm bằng Ảnh (Search by Image)
**Đặc điểm:** Server gọi trực tiếp AI (CLIP) nhúng vector ảnh tải lên và truy vấn Qdrant.

| Số gọi song song | Tốc độ xử lý (Throughput) | Phản hồi trung bình | Phản hồi chậm nhất | Số lỗi |
| :--- | :--- | :--- | :--- | :--- |
| 1 | 1.26 req/s | 784ms | 784ms | 0 |
| 10 | 5.73 req/s | 1.23s | 1.74s | 0 |
| 50 | 6.16 req/s | 4.60s | 8.10s | 0 |
| 100 | 6.42 req/s | 8.89s | 15.55s | 0 |
| 200 | 6.51 req/s | 17.32s | 29.67s | 0 |
| 1000 | 4.58 req/s | 20.76s | 33.94s | **726** *(Server Timeout)* |

---

## Phần 3: Luồng Tìm kiếm bằng Text (Semantic Search)
**Đặc điểm:** Server gọi AI (CLIP) nhúng vector và truy vấn Qdrant

| Số gọi song song | Tốc độ xử lý (Throughput) | Phản hồi trung bình | Phản hồi chậm nhất | Số lỗi |
| :--- | :--- | :--- | :--- | :--- |
| 1 | 1.07 req/s | 936ms | 936ms | 0 |
| 10 | 16.18 req/s | 449ms | 617ms | 0 |
| 50 | 20.23 req/s | 1.64s | 2.44s | 0 |
| 100 | 26.65 req/s | 2.32s | 3.71s | 0 |
| 200 | 33.86 req/s | 3.38s | 5.82s | 0 |
| 1000 | 34.07 req/s | 15.57s | 28.78s | **14** *(time out)* |

---

## Phần 4: Luồng Tìm kiếm bằng câu lệnh(Prompt Search)
**Đặc điểm:** Đây là luồng nặng nhất, yêu cầu gọi mô hình Ollama/Qwen2.5 để dịch và mở rộng từ khóa Tiếng Việt, sau đó mới đẩy sang CLIP nhúng vector. 

| Số gọi song song | Tốc độ xử lý (Throughput) | Phản hồi trung bình | Phản hồi chậm nhất | Số lỗi |
| :--- | :--- | :--- | :--- | :--- |
| 1 | 0.41 req/s | 2.45s | 2.45s | 0 |
| 10 | 0.57 req/s | 12.46s | 17.63s | 0 |
| 50 | 0.75 req/s | 13.04s | 30.43s | **17** *(Ollama Overload)* |
| 100 | 1.41 req/s | 7.44s | 37.52s | **47** *(Ollama Overload)* |
| 200 | 0 req/s | - | - | **200** *(TIMEOUT 100%)* |
