# Đặc tả API: Quản trị Hệ thống (System Admin API)

> **Mô-đun:** User Management, RBAC Configuration, AI Platform Settings, Speech Policies & Audit Trails  
> **Vai trò truy cập:** `SYSTEM_ADMIN` (Chặn toàn bộ các vai trò khác thông qua RBAC Guard)  
> **Tài liệu tham chiếu:** [docs/api/README.md](./README.md)  
> **Tệp mã nguồn Backend:** `services/api/app/routes_admin.py`, `services/api/app/runtime_settings.py`, `services/api/app/speech.py`

---

## 1. Bảng Tổng hợp Endpoint Quản trị

| Phương thức | Đường dẫn API | Mục đích sử dụng | Use Case Ánh xạ |
|---|---|---|---|
| `GET` | `/api/admin/users` | Lấy danh sách người dùng toàn trường (lọc theo role/trạng thái) | `UC-SYSADMIN-001` |
| `POST` | `/api/admin/users` | Tạo tài khoản người dùng mới (hỗ trợ 4 mã role mới) | `UC-SYSADMIN-002` |
| `PUT` | `/api/admin/users/{key}/role` | Phân quyền vai trò mới hoặc kích hoạt/khóa tài khoản | `UC-SYSADMIN-003` |
| `GET` | `/api/admin/settings/platform` | Lấy cấu hình nền tảng hiện hành (AI Provider, Storage, Security) | `UC-SYSADMIN-004` |
| `PUT` | `/api/admin/settings/platform` | Cập nhật cấu hình AI (Gemini / Ollama) và tham số runtime | `UC-SYSADMIN-004` |
| `GET` | `/api/admin/settings/speech` | Đọc cấu hình dịch vụ STT Server-side (PhoWhisper) | `UC-SYSADMIN-005` |
| `PUT` | `/api/admin/settings/speech` | Cập nhật chính sách âm thanh và ngôn ngữ phiên âm | `UC-SYSADMIN-005` |
| `POST` | `/api/admin/settings/speech/google-credentials` | Tải lên file Service Account JSON cho Google Speech phụ trợ | `UC-SYSADMIN-005` |
| `GET` | `/api/admin/dashboard` | Thống kê tổng quan hệ thống: người dùng, kỳ thi, tiến độ | `UC-SYSADMIN-006` |

---

## 2. Chi tiết Từng Endpoint

### 2.1. Lấy danh sách người dùng toàn trường

- **URL:** `GET /api/admin/users`
- **Quyền hạn:** `SYSTEM_ADMIN`
- **Query Parameters:**
  - `role` (string, optional): Lọc theo vai trò (`SYSTEM_ADMIN`, `EXAMINER`, `TEACHER`, `STUDENT`).
  - `status` (string, optional): Lọc theo trạng thái (`ACTIVE`, `INACTIVE`).
  - `search` (string, optional): Tìm kiếm theo họ tên hoặc username.

#### Success Response (`200 OK`):
```json
[
  {
    "id": "usr_1001",
    "username": "teacher1",
    "name": "ThS. Trần Thị Giảng Viên",
    "roles": ["TEACHER"],
    "status": "ACTIVE",
    "created_at": 1728100000.0
  },
  {
    "id": "usr_1002",
    "username": "examiner1",
    "name": "Nguyễn Văn Khảo Thí",
    "roles": ["EXAMINER"],
    "status": "ACTIVE",
    "created_at": 1728100500.0
  }
]
```

---

### 2.2. Tạo tài khoản người dùng mới

- **URL:** `POST /api/admin/users`
- **Status code khi thành công:** `201 Created`
- **Quy tắc mật khẩu:** Mật khẩu tối thiểu 12 ký tự, được băm bảo mật bằng Argon2id.

#### Request Body Schema (`schemas.UserIn`):
```json
{
  "username": "teacher_new",
  "password": "SecurePassword2026!@",
  "name": "TS. Lê Hoàng Minh",
  "role": "TEACHER"
}
```

> [!NOTE]
> Hệ thống hỗ trợ 4 mã vai trò chuẩn đại học: `SYSTEM_ADMIN`, `EXAMINER`, `TEACHER`, `STUDENT`.

#### Success Response (`201 Created`):
```json
{
  "id": "usr_9988aabb",
  "username": "teacher_new",
  "name": "TS. Lê Hoàng Minh",
  "roles": ["TEACHER"],
  "status": "ACTIVE"
}
```

#### Error Responses:
- `409 Conflict` (`DATA_CONFLICT`): Tên đăng nhập `username` đã tồn tại trong hệ thống.
- `422 Unprocessable Entity` (`VALIDATION_ERROR`): Mật khẩu dưới 12 ký tự hoặc thiếu trường bắt buộc.

---

### 2.3. Cập nhật vai trò & Phân quyền tài khoản

- **URL:** `PUT /api/admin/users/{key}/role`
- **Path Parameters:**
  - `key` (string): `id` của người dùng cần điều chỉnh.

#### Request Body Schema (`schemas.RoleIn`):
```json
{
  "role": "EXAMINER"
}
```

#### Success Response (`200 OK`):
```json
{
  "id": "usr_9988aabb",
  "username": "teacher_new",
  "roles": ["EXAMINER"],
  "status": "ACTIVE",
  "updated_at": 1728120000.0
}
```

---

### 2.4. Đọc & Cập nhật Cấu hình Nền tảng (Platform Settings)

- **URL:**
  - `GET /api/admin/settings/platform`
  - `PUT /api/admin/settings/platform`
- **Mô tả:** Điều chỉnh động các tham số hoạt động của toàn hệ thống mà không cần build lại mã nguồn hoặc restart Docker container.

#### Schema Cấu hình Runtime (`RuntimeSettings`):
```json
{
  "ai_provider": "gemini",
  "gemini_model": "gemini-2.5-flash",
  "gemini_api_key": "AIzaSyD...",
  "ollama_base_url": "http://localhost:11434",
  "ollama_model": "llama3:8b",
  "storage_backend": "minio",
  "public_origin": "http://localhost:3000",
  "confidence_threshold": 0.75,
  "discrepancy_threshold": 1.5
}
```

#### Success Response (`200 OK`):
```json
{
  "ok": true,
  "settings": {
    "ai_provider": "gemini",
    "gemini_model": "gemini-2.5-flash",
    "confidence_threshold": 0.75,
    "discrepancy_threshold": 1.5,
    "updated_at": 1728135000.0
  }
}
```

---

### 2.5. Cấu hình Dịch vụ Phiên âm STT (Speech Policies)

- **URL:**
  - `GET /api/admin/settings/speech`
  - `PUT /api/admin/settings/speech`

#### Request Body Schema (`schemas.SpeechPolicy`):
```json
{
  "provider": "local_server",
  "preprocessing": "denoise",
  "language": "vi"
}
```
- `provider`: `local_server` (PhoWhisper Celery Worker), `google` (Google Cloud Speech API), `gemini` (Gemini Audio STT).
- `preprocessing`: `denoise` (Kích hoạt lọc nhiễu RNNoise), `off`.
- `language`: `vi` (Tiếng Việt - mặc định PhoWhisper), `en` (Tiếng Anh - Whisper Large-v3).

#### Success Response (`200 OK`):
```json
{
  "provider": "local_server",
  "preprocessing": "denoise",
  "language": "vi",
  "google_credentials_configured": false
}
```

---

### 2.6. Thống kê Bảng điều khiển Quản trị (Admin Dashboard)

- **URL:** `GET /api/admin/dashboard`
- **Quyền hạn:** `SYSTEM_ADMIN`
- **Mô tả:** Tổng hợp các chỉ số hoạt động then chốt phục vụ giám sát toàn diện.

#### Success Response (`200 OK`):
```json
{
  "metrics": {
    "total_users": 154,
    "active_students": 120,
    "active_teachers": 28,
    "active_examiners": 6,
    "total_courses": 12,
    "total_exams": 8,
    "total_sessions_completed": 342,
    "pending_reviews": 7
  },
  "infrastructure": {
    "database": "CONNECTED",
    "redis": "PONG",
    "minio": "HEALTHY",
    "celery_workers_active": 2
  }
}
```
