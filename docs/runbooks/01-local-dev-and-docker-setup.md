# RUNBOOK-01: Thiết Lập Môi Trường Phát Triển & Docker Cluster

> **Mục tiêu:** Hướng dẫn từng bước khởi động toàn bộ hạ tầng dự án trên môi trường cục bộ (Windows 11).

---

## 1. Yêu cầu Tiên quyết (Prerequisites)

* **Hệ điều hành:** Windows 11 (hỗ trợ WSL2 hoặc native PowerShell).
* **Công cụ cài đặt:**
  - Docker Desktop (đang chạy với Linux containers).
  - Node.js LTS (v20+ hoặc v22+) & npm.
  - Python 3.12+ (khuyến nghị cài đặt thêm virtualenv).
  - Git.

---

## 2. Bước 1: Chuẩn bị Biến môi trường (Environment Variables)

Sao chép file mẫu `.env.example` thành `.env` tại thư mục gốc:

```powershell
Copy-Item .env.example .env
```

Các biến môi trường quan trọng cần lưu ý:
* `DATABASE_URL`: `postgresql+asyncpg://oraluser:oralpass@localhost:5432/oraldb`
* `REDIS_URL`: `redis://localhost:6379/0`
* `MINIO_ENDPOINT`: `localhost:9000`
* `MINIO_ACCESS_KEY`: `oralstorage`
* `MINIO_SECRET_KEY`: `oralstorage123`
* `JWT_SECRET_KEY`: Khóa bí mật ký mã token JWT.

---

## 3. Bước 2: Khởi chạy Cụm Hạ tầng Docker (Infrastructure Cluster)

Khởi động các dịch vụ cơ sở hạ tầng nền tảng (PostgreSQL, Redis, MinIO):

```powershell
# Khởi động cụm dịch vụ chạy ngầm
docker compose up -d postgres redis minio

# Kiểm tra trạng thái containers
docker compose ps
```

Đảm bảo cả 3 container `postgres`, `redis`, và `minio` đều ở trạng thái `Up (healthy)`.

---

## 4. Bước 3: Cài đặt Dependencies Monorepo

Tại thư mục gốc dự án:

```powershell
# Cài đặt toàn bộ packages cho @oralai/shared, student-app, và staff-portal
npm.cmd install

# Build thư viện dùng chung trước khi khởi chạy apps
npm.cmd run build -w packages/shared
```

---

## 5. Bước 4: Khởi chạy Backend API & Celery Worker

### 5.1. Tạo môi trường ảo Python & Cài đặt thư viện:

```powershell
# Di chuyển vào thư mục backend
cd services/api

# Tạo môi trường ảo
python -m venv .venv

# Kích hoạt môi trường ảo (PowerShell)
.venv\Scripts\Activate.ps1

# Cài đặt dependencies
pip install -r requirements.txt
```

### 5.2. Chạy Backend API (FastAPI):

```powershell
# Chạy API server có hot-reload
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
*Kiểm tra Swagger Docs:* Truy cập `http://localhost:8000/docs`.

### 5.3. Chạy Celery Background Worker (Cửa sổ terminal mới):

> [!NOTE]
> Trên hệ điều hành Windows, Celery worker cần tham số `-P solo` hoặc `-P threads` để tránh lỗi tiến trình fork.

```powershell
cd services/api
.venv\Scripts\Activate.ps1
celery -A app.worker.celery_app worker --loglevel=info -P solo
```

---

## 6. Bước 5: Khởi chạy Dual-Frontend Clients

### 6.1. Khởi chạy Staff Portal (Web Next.js):
Mở một cửa sổ PowerShell mới tại thư mục gốc:

```powershell
npm.cmd run dev -w apps/staff-portal
```
*Truy cập Web Portal:* Mở trình duyệt tại `http://localhost:3000`.

### 6.2. Khởi chạy Student App (Desktop Electron):
Mở một cửa sổ PowerShell mới tại thư mục gốc:

```powershell
npm.cmd run dev -w apps/student-app
```
*Cửa sổ ứng dụng Electron sẽ tự động bật lên.*

---

## 7. Bảng Kiểm tra Sức khỏe Dịch vụ (Health Check Matrix)

| Điểm truy cập / Dịch vụ | URL | Thông tin xác thực mặc định |
| :--- | :--- | :--- |
| **Staff Portal (Web)** | `http://localhost:3000` | Các tài khoản demo (Xem RUNBOOK-03) |
| **Backend REST API** | `http://localhost:8000/docs` | Swagger Interactive Documentation |
| **MinIO Console** | `http://localhost:9001` | User: `oralstorage` / Pass: `oralstorage123` |
| **PostgreSQL** | `localhost:5432` | User: `oraluser` / Pass: `oralpass` / DB: `oraldb` |
| **Redis** | `localhost:6379` | Không mật khẩu |
