# Đặc tả API: Xác thực, Phiên làm việc & Hạ tầng Tải tệp (Auth & Common API)

> **Mô-đun:** Authentication, Session Management, System Health & S3 Chunked Upload  
> **Tài liệu tham chiếu:** [docs/api/README.md](./README.md)  
> **Tệp mã nguồn Backend:** `services/api/app/main.py`, `services/api/app/google_login.py`, `services/api/app/routes_exam.py`

---

## 1. Bảng Tổng hợp Endpoint

| Phương thức | Đường dẫn API | Mục đích sử dụng | Quyền hạn (Role) |
|---|---|---|---|
| `POST` | `/api/auth/login` | Đăng nhập tài khoản bằng Username & Mật khẩu | Mọi người dùng |
| `GET` | `/api/auth/me` | Lấy thông tin tài khoản hiện hành từ Session | Đã đăng nhập |
| `POST` | `/api/auth/refresh` | Cấp mới Access Token bằng Refresh Token | Đã đăng nhập |
| `POST` | `/api/auth/logout` | Đăng xuất, thu hồi phiên và xóa Cookie | Đã đăng nhập |
| `GET` | `/api/auth/google/start` | Bắt đầu luồng Google OIDC SSO (FPT Edu) | Mọi người dùng |
| `GET` | `/api/auth/google/callback` | Callback tiếp nhận Google Token & cấp phiên | Google OAuth |
| `GET` | `/api/health` | Kiểm tra trạng thái Database, Redis và AI Provider | Public |
| `POST` | `/api/uploads/init` | Khởi tạo phiên tải tệp đa phân mảnh lên MinIO S3 | `STUDENT`, `TEACHER` |
| `PUT` | `/api/uploads/{key}/chunks/{index}` | Tải lên một chunk (tối đa 4MB) kèm mã SHA-256 | `STUDENT`, `TEACHER` |
| `GET` | `/api/uploads/{key}/status` | Kiểm tra danh sách các chunk đã tải lên thành công | `STUDENT`, `TEACHER` |
| `POST` | `/api/uploads/{key}/complete` | Hợp nhất toàn bộ các chunk thành file S3 hoàn chỉnh | `STUDENT`, `TEACHER` |

---

## 2. Chi tiết Từng Endpoint

### 2.1. Đăng nhập hệ thống (Standard Login)

- **URL:** `POST /api/auth/login`
- **Quyền hạn:** Không yêu cầu đăng nhập trước.
- **Rate Limit:** Tối đa 10 request/phút theo IP/Username (Redis bucket).
- **Mô tả:** Tiếp nhận thông tin đăng nhập, xác thực mật khẩu (Argon2id), cấp JWT Access Token và thiết lập Cookie `access_token` và `refresh_token` (HTTP-only).

#### Request Body Schema (`schemas.Login`):
```json
{
  "username": "examiner1",
  "password": "Password123!"
}
```

#### Headers Response (Cookie):
```http
Set-Cookie: access_token=eyJhbGciOiJIUzI1Ni...; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600
Set-Cookie: refresh_token=dGhpcy1pcy1hLXJl...; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800
```

#### Success Response (`200 OK`):
```json
{
  "user": {
    "id": "usr_9f8d1a2b",
    "username": "examiner1",
    "name": "Nguyễn Văn Khảo Thí",
    "roles": ["EXAMINER"],
    "status": "ACTIVE"
  },
  "token": "eyJhbGciOiJIUzI1Ni...",
  "access_token": "eyJhbGciOiJIUzI1Ni..."
}
```

#### Error Responses:
- `401 Unauthorized` (`INVALID_CREDENTIALS`): Tên đăng nhập hoặc mật khẩu không đúng, hoặc tài khoản đã bị vô hiệu hóa (`INACTIVE`).
- `429 Too Many Requests` (`RATE_LIMITED`): Vượt quá 10 lần đăng nhập thất bại trong 1 phút.

---

### 2.2. Lấy thông tin tài khoản hiện tại (Current User Profile)

- **URL:** `GET /api/auth/me`
- **Quyền hạn:** Đã đăng nhập (`Cookie` hoặc `Authorization: Bearer <token>`).

#### Success Response (`200 OK`):
```json
{
  "id": "usr_9f8d1a2b",
  "username": "examiner1",
  "name": "Nguyễn Văn Khảo Thí",
  "roles": ["EXAMINER"],
  "status": "ACTIVE"
}
```

#### Error Responses:
- `401 Unauthorized` (`INVALID_CREDENTIALS`): Token không hợp lệ hoặc đã hết hạn.

---

### 2.3. Làm mới Access Token (Token Refresh)

- **URL:** `POST /api/auth/refresh`
- **Cơ chế:** Đọc `refresh_token` từ Cookie HTTP-only hoặc body request. Kiểm tra tính hợp lệ trong bảng `auth_sessions`. Nếu hợp lệ, thu hồi token cũ (`revoked = True`) và cấp cặp token mới (Token Rotation).

#### Success Response (`200 OK`):
```json
{
  "user": {
    "id": "usr_9f8d1a2b",
    "username": "examiner1",
    "name": "Nguyễn Văn Khảo Thí",
    "roles": ["EXAMINER"],
    "status": "ACTIVE"
  },
  "token": "eyJhbGciOiJIUzI1Ni...",
  "access_token": "eyJhbGciOiJIUzI1Ni..."
}
```

---

### 2.4. Đăng xuất hệ thống (Logout)

- **URL:** `POST /api/auth/logout`
- **Mô tả:** Đánh dấu thu hồi phiên làm việc trong cơ sở dữ liệu (`revoked = True`), xóa toàn bộ Cookie `access_token` và `refresh_token` trên trình duyệt.

#### Success Response (`200 OK`):
```json
{
  "ok": true
}
```

---

### 2.5. Kiểm tra trạng thái máy chủ (System Health Check)

- **URL:** `GET /api/health`
- **Quyền hạn:** Public
- **Mô tả:** Thực hiện truy vấn `SELECT 1` trên PostgreSQL và `PING` tới Redis.

#### Success Response (`200 OK`):
```json
{
  "status": "ok",
  "ai_provider": "gemini"
}
```

---

### 2.6. Khởi tạo phiên tải tệp đa phân mảnh (Init Chunked Upload)

- **URL:** `POST /api/uploads/init`
- **Quyền hạn:** `STUDENT`, `TEACHER`, `SYSTEM_ADMIN`
- **Mô tả:** Đăng ký tải file lớn (ví dụ: audio bài thi `.webm` hoặc giáo trình `.pdf`). Server tính toán số lượng chunk dự kiến và cấp mã `upload_id`.

#### Request Body Schema (`schemas.UploadIn`):
```json
{
  "attempt_id": "att_4a5b6c7d8e",
  "kind": "AUDIO",
  "mime_type": "audio/webm",
  "size": 8388608,
  "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
}
```

#### Success Response (`200 OK`):
```json
{
  "upload_id": "upl_1122334455",
  "chunk_size": 4194304,
  "expected_chunks": 2,
  "status": "INITIATED"
}
```

---

### 2.7. Tải lên một phân mảnh tệp (Upload Chunk)

- **URL:** `PUT /api/uploads/{key}/chunks/{index}`
- **Path Parameters:**
  - `key` (string): `upload_id` nhận được từ bước Init.
  - `index` (integer): Thứ tự chunk (bắt đầu từ `0`).
- **Headers:** `Content-Type: application/octet-stream`
- **Request Body:** Dữ liệu binary thuần của chunk (tối đa 4MB).
- **Mô tả:** Lưu chunk vào vùng đệm MinIO (`uploads/{upload_id}/part_{index}`).

#### Success Response (`200 OK`):
```json
{
  "chunk_index": 0,
  "size": 4194304,
  "status": "UPLOADED"
}
```

---

### 2.8. Kiểm tra tiến độ phân mảnh (Upload Status)

- **URL:** `GET /api/uploads/{key}/status`
- **Mô tả:** Trả về danh sách các chunk đã được tải lên thành công, giúp Client tự động tiếp tục tải (Resume) nếu mất kết nối giữa chừng.

#### Success Response (`200 OK`):
```json
{
  "upload_id": "upl_1122334455",
  "uploaded_chunks": [0],
  "expected_chunks": 2,
  "is_complete": false
}
```

---

### 2.9. Hoàn tất & Hợp nhất phân mảnh (Complete Upload)

- **URL:** `POST /api/uploads/{key}/complete`
- **Mô tả:** Server kiểm tra đủ số lượng chunk, ghép nối các chunk trên MinIO S3 thành file duy nhất, kiểm tra mã hash SHA-256 đối chiếu tính toàn vẹn (Anti-tampering), và cập nhật trạng thái `COMPLETED`.

#### Success Response (`200 OK`):
```json
{
  "upload_id": "upl_1122334455",
  "status": "COMPLETED",
  "object_name": "evidence/att_4a5b6c7d8e_audio.webm",
  "sha256_verified": true
}
```
