# Visual Search Engine

Hệ thống tìm kiếm ảnh trực quan hỗ trợ tìm kiếm bằng ảnh, văn bản ngữ nghĩa, OCR và prompt. Dự án gồm giao diện React, Backend Express, AI Service FastAPI, tiến trình indexing nền và các dịch vụ lưu trữ dữ liệu chạy bằng Docker Compose.

## Tính năng chính

- Đăng ký, đăng nhập bằng JWT và phân quyền `USER`/`ADMIN`.
- Upload nhiều ảnh và theo dõi trạng thái indexing theo batch.
- Tìm ảnh tương đồng bằng ảnh đầu vào.
- Tìm kiếm văn bản theo semantic, OCR và prompt tiếng Việt.
- Lưu lịch sử tìm kiếm và ảnh người dùng đã click.
- Đề xuất ảnh dựa trên lịch sử tương tác.
- Quản lý ảnh cá nhân của người dùng.
- Quản lý kho ảnh, thùng rác, khôi phục và xóa vĩnh viễn ảnh.
- Resize ảnh, tạo thumbnail và cache tại Nginx.
- Tự động xóa vĩnh viễn ảnh đã ở trong thùng rác quá thời hạn.
- Rate limit tại Backend và Nginx.
- Reverse proxy HTTPS bằng Nginx và tự động gia hạn chứng chỉ bằng Certbot.

## Kiến trúc hệ thống

```text
Client
  |
  v
Nginx :80/:443
  |-- Frontend (React + Vite) :5173
  |-- Backend (Express + TypeScript) :8000
          |-- PostgreSQL + Prisma :5432
          |-- Qdrant :6333
          |-- Redis :6379
          |-- Ollama :11434
          |-- AI Service (FastAPI) :9000
          |-- RabbitMQ :5672
                  |
                  v
          Indexing Worker (.NET 8)
```

### Trách nhiệm của từng service

| Service | Vai trò |
| --- | --- |
| Frontend | Giao diện tìm kiếm, upload, lịch sử và trang quản trị |
| Backend | Xác thực, phân quyền, validate, API nghiệp vụ và điều phối các service |
| AI Service | Tạo embedding CLIP, OCR và tiền xử lý ảnh |
| Indexing Worker | Nhận batch từ RabbitMQ, gọi AI và lưu kết quả indexing |
| PostgreSQL | Lưu người dùng, metadata ảnh, OCR, batch và lịch sử tìm kiếm |
| Qdrant | Lưu vector ảnh và truy vấn độ tương đồng |
| RabbitMQ | Hàng đợi xử lý indexing bất đồng bộ |
| Redis | Cache dữ liệu tìm kiếm và kết quả dùng lại |
| Ollama | Hỗ trợ chuyển prompt tiếng Việt thành truy vấn tìm kiếm |
| Nginx | Reverse proxy, HTTPS, rate limit và cache thumbnail |

## Công nghệ sử dụng

- Frontend: React 19, TypeScript, Vite, TanStack Router/Query, Tailwind CSS.
- Backend: Node.js 22, Express 5, TypeScript, Prisma, Zod, JWT, Sharp.
- AI: Python 3.12, FastAPI, CLIP, EasyOCR, PyTorch CPU.
- Worker: .NET 8 Worker Service.
- Hạ tầng: PostgreSQL 16, Qdrant, RabbitMQ, Redis, Ollama, Nginx, Certbot và Docker Compose.

## Cấu trúc thư mục

```text
Visual-Search-Engine/
|-- ai-service/              # Embedding, OCR và indexing AI
|-- backend/                 # Express API, Prisma và Swagger
|-- datasets/                # Dataset cục bộ, không commit dữ liệu lớn
|-- docs/                    # Tài liệu kiến trúc và luồng API
|-- frontend/                # Ứng dụng React/Vite
|-- indexing-worker/         # Worker .NET đọc RabbitMQ
|-- nginx/                   # Cấu hình reverse proxy, HTTPS và cache
|-- scripts/                 # Script setup, SSL và Ollama
|-- storage/                 # Ảnh upload và ảnh truy vấn cục bộ
|-- docker-compose.local.yml # Môi trường local
|-- docker-compose.yml       # Môi trường triển khai HTTPS
`-- .env.example             # Mẫu biến môi trường toàn hệ thống
```

## Yêu cầu

- Git.
- Docker Desktop và Docker Compose.
- Tối thiểu khoảng 8 GB RAM trống được khuyến nghị vì AI Service và Ollama tải model vào bộ nhớ.

Không cần cài Node.js, Python, .NET, PostgreSQL hay Qdrant nếu chạy toàn bộ bằng Docker.

## Chạy dự án tại local

### 1. Clone và tạo file môi trường

```powershell
git clone <repository-url>
cd Visual-Search-Engine
Copy-Item .env.example .env
```

Đổi tối thiểu các giá trị nhạy cảm trong `.env`:

```dotenv
POSTGRES_PASSWORD=your_strong_database_password
JWT_ACCESS_SECRET=your_long_random_jwt_secret
ADMIN_EMAIL=admin@example.com
ADMIN_NAME=Admin
ADMIN_PASSWORD=ChangeMe@123
RABBITMQ_USER=app_user
RABBITMQ_PASSWORD=your_strong_rabbitmq_password
```

Các URL local mặc định:

```dotenv
FRONTEND_URL=http://localhost
BACKEND_URL=http://localhost:8000
VITE_API_URL=http://localhost:8000/api
```

### 2. Build và khởi động

```powershell
docker compose -f docker-compose.local.yml up -d --build
```

Lần build đầu tiên có thể lâu vì AI image phải tải model CLIP, EasyOCR và Ollama phải tải model ngôn ngữ.

### 3. Kiểm tra trạng thái

```powershell
docker compose -f docker-compose.local.yml ps
docker compose -f docker-compose.local.yml logs -f backend
```

Backend tự động thực hiện các bước sau khi container khởi động:

1. Đồng bộ Prisma schema bằng `prisma db push`.
2. Khởi tạo extension và index cần thiết trong PostgreSQL.
3. Tạo tài khoản admin nếu email chưa tồn tại.
4. Khởi động API server.

### Địa chỉ local

| Thành phần | URL |
| --- | --- |
| Frontend | http://localhost |
| Backend API | http://localhost:8000/api |
| Swagger Backend | http://localhost:8000/api-docs |
| Health check | http://localhost:8000/api/health |
| Swagger AI Service | http://localhost:9000/docs |
| RabbitMQ Management | http://localhost:15672 |
| Qdrant Dashboard | http://localhost:6333/dashboard |

Đăng nhập admin bằng `ADMIN_EMAIL` và `ADMIN_PASSWORD` đã khai báo trong `.env`.

## API chính

Mọi API nghiệp vụ đều có prefix `/api`. Các endpoint cần đăng nhập sử dụng header:

```http
Authorization: Bearer <accessToken>
```

| Method | Endpoint | Mô tả |
| --- | --- | --- |
| POST | `/api/auth/register` | Đăng ký tài khoản |
| POST | `/api/auth/login` | Đăng nhập và nhận access token |
| POST | `/api/upload` | Upload nhiều ảnh để indexing |
| GET | `/api/upload/batch/:batchId` | Theo dõi trạng thái batch |
| POST | `/api/search/image` | Tìm kiếm bằng ảnh |
| GET | `/api/search/text` | Tìm kiếm semantic, OCR hoặc prompt |
| POST | `/api/search/history/click` | Ghi nhận ảnh được click |
| GET | `/api/history` | Lấy lịch sử tìm kiếm cá nhân |
| GET | `/api/recommendations` | Lấy danh sách ảnh đề xuất |
| GET | `/api/images/me` | Lấy ảnh người dùng đã upload |
| DELETE | `/api/images/me/:id` | Xóa mềm ảnh cá nhân |
| GET | `/api/admin/images` | Quản lý kho ảnh |
| GET | `/api/admin/images/trash` | Lấy ảnh trong thùng rác |
| PATCH | `/api/admin/images/bulk-delete` | Xóa mềm nhiều ảnh |
| PATCH | `/api/admin/images/bulk-restore` | Khôi phục nhiều ảnh |
| DELETE | `/api/admin/images/permanent` | Xóa vĩnh viễn nhiều ảnh |
| GET | `/api/admin/users` | Quản lý người dùng |
| GET | `/api/admin/users/:userId/search-history` | Xem lịch sử của người dùng |

Chi tiết request, response, validate và mã lỗi được mô tả tại Swagger Backend.

Response Backend tuân theo cấu trúc chung:

```json
{
  "success": true,
  "message": "Thao tác thành công",
  "data": {},
  "meta": {
    "page": 1,
    "limit": 20,
    "totalDocs": 100,
    "totalPages": 5
  }
}
```

## Luồng upload và indexing

```text
Frontend upload ảnh
  -> Backend lưu file và metadata
  -> Backend gửi message vào RabbitMQ
  -> Indexing Worker nhận message
  -> AI Service tạo embedding và OCR
  -> Worker lưu vector vào Qdrant
  -> Worker cập nhật ImageIndex/ImageOcr trong PostgreSQL
  -> Frontend polling trạng thái batch
```

## Luồng tìm kiếm

### Tìm kiếm bằng ảnh

Backend nhận file ảnh, gọi AI Service tạo embedding, truy vấn vector tương đồng trong Qdrant, đối chiếu metadata còn hiệu lực trong PostgreSQL rồi trả kết quả đã phân trang.

### Semantic search

Backend gửi văn bản đến AI Service để tạo embedding, sau đó truy vấn Qdrant và lấy metadata ảnh từ PostgreSQL.

### OCR search

Backend chuẩn hóa nội dung tìm kiếm và truy vấn `ImageOcr` trong PostgreSQL bằng index hỗ trợ text search.

### Prompt search

Ollama chuyển prompt tự nhiên, đặc biệt là tiếng Việt, thành truy vấn phù hợp trước khi thực hiện semantic search.

## Các lệnh Docker thường dùng

### Môi trường local

```powershell
# Build và khởi động toàn bộ hệ thống
docker compose -f docker-compose.local.yml up -d --build

# Khởi động lại bằng các image đã build, không build lại
docker compose -f docker-compose.local.yml up -d

# Xem container
docker compose -f docker-compose.local.yml ps

# Xem log toàn hệ thống
docker compose -f docker-compose.local.yml logs -f

# Xem log từng service
docker compose -f docker-compose.local.yml logs -f backend
docker compose -f docker-compose.local.yml logs -f frontend
docker compose -f docker-compose.local.yml logs -f ai-service
docker compose -f docker-compose.local.yml logs -f indexing-worker
docker compose -f docker-compose.local.yml logs -f database
docker compose -f docker-compose.local.yml logs -f qdrant
docker compose -f docker-compose.local.yml logs -f rabbitmq
docker compose -f docker-compose.local.yml logs -f ollama

# Build lại riêng service có source vừa thay đổi
docker compose -f docker-compose.local.yml up -d --build backend
docker compose -f docker-compose.local.yml up -d --build frontend
docker compose -f docker-compose.local.yml up -d --build ai-service
docker compose -f docker-compose.local.yml up -d --build indexing-worker

# Khởi động lại riêng service, không build lại
docker compose -f docker-compose.local.yml up -d backend
docker compose -f docker-compose.local.yml up -d frontend
docker compose -f docker-compose.local.yml up -d ai-service
docker compose -f docker-compose.local.yml up -d indexing-worker

# Dừng container nhưng giữ dữ liệu
docker compose -f docker-compose.local.yml down
```

Chỉ chạy lệnh tương ứng với service cần xử lý. Nếu sửa nhiều service, có thể build chúng trong một lệnh, ví dụ:

```powershell
docker compose -f docker-compose.local.yml up -d --build backend frontend ai-service indexing-worker
```

### Môi trường production

File Compose mặc định là `docker-compose.yml`, vì vậy không cần truyền tùy chọn `-f`:

```bash
# Build và khởi động toàn bộ hệ thống
docker compose up -d --build

# Khởi động lại bằng các image đã build
docker compose up -d

# Xem trạng thái và log
docker compose ps
docker compose logs -f

# Dừng container nhưng giữ dữ liệu
docker compose down
```

Sử dụng `--build` khi chạy lần đầu, vừa pull code mới hoặc vừa sửa source/Dockerfile. Chỉ dùng `up -d` khi image hiện tại đã chứa đúng phiên bản code cần chạy.

Không chạy `docker compose down -v` trừ khi thực sự muốn xóa toàn bộ volume PostgreSQL, Qdrant, RabbitMQ, Redis và Ollama.

## Chạy Backend ngoài Docker

Hạ tầng vẫn có thể chạy bằng Docker trong khi Backend chạy trực tiếp trên máy:

```powershell
docker compose -f docker-compose.local.yml up -d database qdrant rabbitmq redis ai-service ollama
cd backend
Copy-Item .env.example .env
npm install
npx prisma generate
npx prisma db push
npm run seed:admin
npm run dev
```

Trong `backend/.env`, các service phải dùng địa chỉ `localhost`, ví dụ `localhost:5432`, `localhost:6333` và `localhost:9000`. Tên service như `database` hoặc `qdrant` chỉ phân giải được bên trong mạng Docker.

Kiểm tra TypeScript và build Backend:

```powershell
npx tsc --noEmit
npm run build
```

## Chạy Frontend ngoài Docker

```powershell
cd frontend
npm install
npm run dev
```

Frontend mặc định chạy tại `http://localhost:5173`. Đảm bảo `ALLOWED_ORIGINS` của Backend chứa URL này.

## Dữ liệu mẫu và công cụ quản trị

```powershell
# Tạo lại tài khoản admin nếu chưa tồn tại
docker compose -f docker-compose.local.yml exec backend npm run seed:admin

## Triển khai production với HTTPS

1. Trỏ DNS của `DOMAIN` đến IP public của máy chủ.
2. Mở cổng `80` và `443`; giới hạn cổng SSH `22` theo IP quản trị.
3. Không public trực tiếp PostgreSQL, Qdrant, Redis, RabbitMQ, Ollama, AI Service hoặc Backend.
4. Cập nhật `.env` production:

```dotenv
DOMAIN=visualsearch.example.com
CERTBOT_EMAIL=admin@example.com
FRONTEND_URL=https://visualsearch.example.com
BACKEND_URL=https://visualsearch.example.com
VITE_API_URL=/api
```

5. Cấp chứng chỉ lần đầu trên Linux:

```bash
chmod +x scripts/init-letsencrypt.sh
./scripts/init-letsencrypt.sh
```

6. Những lần chạy tiếp theo:

```bash
docker compose up -d --build
```

Nginx nhận request public qua HTTPS và chuyển tiếp nội bộ đến Frontend hoặc Backend. Certbot kiểm tra gia hạn chứng chỉ định kỳ.

## Biến môi trường quan trọng

| Nhóm | Biến |
| --- | --- |
| Server | `DOMAIN`, `BACKEND_PORT`, `FRONTEND_URL`, `BACKEND_URL`, `VITE_API_URL` |
| Database | `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` |
| Authentication | `JWT_ACCESS_SECRET`, `JWT_ACCESS_EXPIRES_IN` |
| Admin seed | `ADMIN_EMAIL`, `ADMIN_NAME`, `ADMIN_PASSWORD` |
| Search | `SEARCH_MIN_SCORE_IMAGE`, `SEARCH_MIN_SCORE_SEMANTIC`, `SEARCH_MAX_RESULTS` |
| Storage | `STORAGE_DIR` |
| Trash | `TRASH_AUTO_CLEANUP_ENABLED`, `TRASH_RETENTION_DAYS`, `TRASH_CLEANUP_INTERVAL_HOURS` |
| RabbitMQ | `RABBITMQ_USER`, `RABBITMQ_PASSWORD` |
| Recommendation | `RECOMMENDATION_CLICK_LIMIT` |
| Ollama | `OLLAMA_URL`, `OLLAMA_MODEL` |
| Redis | `REDIS_URL` |

Không commit file `.env`, mật khẩu thật, JWT secret, dữ liệu người dùng, model hoặc file ảnh dung lượng lớn.

## Xử lý lỗi thường gặp

### Backend không kết nối được `database`

- Khi Backend chạy trong Docker, `DATABASE_URL` dùng hostname `database`.
- Khi chạy `npm run dev` trên máy, `DATABASE_URL` dùng hostname `localhost`.
- Kiểm tra database bằng `docker compose -f docker-compose.local.yml ps database`.

### Port đã được sử dụng

Đảm bảo không chạy đồng thời Backend local và container Backend trên cùng cổng `8000`. Kiểm tra container bằng:

```powershell
docker ps
```

### Sửa code nhưng container vẫn chạy bản cũ

Dockerfile copy source code vào image, vì vậy cần build lại service đã sửa:

```powershell
docker compose -f docker-compose.local.yml up -d --build backend
```

### AI Service hoặc Ollama khởi động lâu

Lần đầu cần tải model và tạo cache. Theo dõi log thay vì khởi động lại liên tục:

```powershell
docker compose -f docker-compose.local.yml logs -f ai-service ollama
```

## Quy trình Git đề xuất

```powershell
git checkout dev
git pull origin dev
git checkout -b feature/be/ten-chuc-nang

# Sau khi code và kiểm thử
git status
git add .
git commit -m "feat: describe the implemented feature"
git push -u origin feature/be/ten-chuc-nang
```

Sử dụng prefix commit phù hợp: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`.

## Tài liệu liên quan

- Swagger Backend: `:8000/api-docs`.
- Swagger AI Service: `:9000/docs` trong môi trường local.
