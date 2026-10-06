# Tài liệu Đặc tả REST API Tổng quan & Phân quyền (API Architecture & RBAC)

> **Dự án:** AI Oral Assessment Platform (Hệ thống Thi vấn đáp Tự động bằng AI)  
> **Phiên bản:** `v1.0.0` (Chuẩn hóa Kiến trúc Dual-Frontend & 4 Vai trò Đại học)  
> **Cập nhật:** 05/10/2026  
> **Mục tiêu:** Cung cấp tài liệu tham chiếu chuẩn xác, đầy đủ và phân tách rành mạch cho toàn bộ API Backend phục vụ phát triển, tích hợp và tái cấu trúc Dual-Frontend.

---

## 1. Cấu trúc Bộ Tài liệu API (`docs/api/`)

Bộ tài liệu được chia tách độc lập theo từng vai trò nghiệp vụ (Actors) và phân hệ hạ tầng để loại bỏ hoàn toàn sự chồng chéo:

| # | Tài liệu | Đối tượng sử dụng | Mô tả phạm vi chức năng |
|---|---|---|---|
| **00** | [**`00-auth-and-common.md`**](./00-auth-and-common.md) | Mọi người dùng & Client | Đăng nhập (Dual-Auth), Google SSO, Refresh Token, Health check, Tải tệp phân mảnh MinIO S3 (`/uploads/*`). |
| **01** | [**`01-system-admin-api.md`**](./01-system-admin-api.md) | `SYSTEM_ADMIN` | Quản lý người dùng toàn trường, cấu hình AI runtime (Gemini/Ollama), STT parameters, Audit logs. |
| **02** | [**`02-examiner-api.md`**](./02-examiner-api.md) | `EXAMINER` | Quản lý Học kỳ, Danh mục môn toàn trường, Lớp học phần, Import sinh viên Excel, Lịch thi, Ca thi (`/schedule`), Duyệt điểm, Khóa sổ FAP. |
| **03** | [**`03-teacher-api.md`**](./03-teacher-api.md) | `TEACHER` | Course Workspace RAG giáo trình (pgvector 768 chiều), Chuẩn đầu ra (LO), Topics, Rubrics, Blueprint & Đóng băng đề thi (Exam Snapshot), Chấm bài. |
| **04** | [**`04-student-api.md`**](./04-student-api.md) | `STUDENT` | Client Desktop (Electron Thin-Client): Lấy đề thi, Khởi tạo phiên thi, Bắt đầu câu hỏi, Tải audio 4MB MinIO, Nộp bài thi (`AWAITING_STT`), Xem kết quả. |

---

## 2. Giao thức Xác thực Kép (Dual-Authentication Architecture)

Hệ thống phục vụ đồng thời hai loại ứng dụng client với các yêu cầu bảo mật đặc thù:

```
┌────────────────────────────────────────────────────────┐     ┌────────────────────────────────────────────────────────┐
│        STAFF PORTAL (Web Cán bộ & Giảng viên)          │     │        STUDENT APP (Desktop App Thin-Client)           │
│       (SYSTEM_ADMIN, EXAMINER, TEACHER)                │     │                     (STUDENT)                          │
├────────────────────────────────────────────────────────┤     ├────────────────────────────────────────────────────────┤
│ • Giao thức: HTTP-only Cookie                          │     │ • Giao thức: Authorization: Bearer <access_token>      │
│ • Cơ chế: Trình duyệt tự động đính kèm Cookie          │     │ • Cơ chế: Token lưu hoàn toàn trong RAM (Memory-only)  │
│ • Chống tấn công XSS: JavaScript không đọc được token  │     │ • Chống trích xuất: Không lưu vào localStorage/File    │
│ • Kiểm soát CORS: Chặn origin lạ, chặn CSRF            │     │ • Thu hồi tức thì khi đóng ứng dụng Desktop            │
└───────────────────────────┬────────────────────────────┘     └───────────────────────────┬────────────────────────────┘
                            │ Cookie: access_token=...                                     │ Authorization: Bearer ...
                            ▼                                                              ▼
┌───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                             FASTAPI BACKEND CORE                                                      │
│                                           (services/api/app/security.py)                                              │
└───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Chi tiết tham số Token:
- **`access_token`:** Thời hạn sống ngắn (thường 60 phút), chứa claims `sub` (user_id), `username`, `roles`.
- **`refresh_token`:** Thời hạn sống dài (7 - 14 ngày), lưu hash trong bảng `auth_sessions`, có cơ chế thu hồi (Revocation) khi đăng xuất.

---

## 3. Quy ước Điểm cuối & Môi trường (Base URLs & Headers)

### Địa chỉ kết nối:
- **Môi trường Phát triển (Local Dev):** `http://localhost:8000/api`
- **Môi trường Docker Compose nội bộ:** `http://api:8000/api`
- **Tài liệu Swagger tự động (OpenAPI):** `http://localhost:8000/docs`

### Headers bắt buộc cho mọi Request:
```http
Content-Type: application/json
Accept: application/json
```
- Nếu dùng Client Desktop: `Authorization: Bearer <access_token>`
- Nếu dùng Client Web: `credentials: 'include'` (để fetch tự gửi Cookie HTTP-only).

---

## 4. Chuẩn hóa Định dạng Lỗi Hệ thống (Standard Error Response)

Mọi phản hồi lỗi (HTTP Status $\ge 400$) từ hệ thống đều tuân thủ cấu trúc JSON đồng nhất:

```json
{
  "error": {
    "code": "MÃ_LỖI_CHUẨN_HÓA",
    "message": "Thông điệp mô tả lỗi dễ hiểu cho người dùng (tiếng Việt)",
    "details": {
      "field_name": "Chi tiết lỗi cụ thể nếu có"
    }
  }
}
```

### Bảng Mã lỗi Thường gặp:

| HTTP Code | Error Code | Ý nghĩa & Tình huống xảy ra |
|---|---|---|
| `400` | `BAD_REQUEST` | Dữ liệu gửi lên không đúng định dạng nghiệp vụ hoặc vi phạm quy tắc. |
| `401` | `INVALID_CREDENTIALS` | Sai username/password hoặc tài khoản bị vô hiệu hóa (`INACTIVE`). |
| `401` | `INVALID_REFRESH` | Refresh token hết hạn hoặc đã bị thu hồi; yêu cầu đăng nhập lại. |
| `403` | `PERMISSION_DENIED` | Người dùng không sở hữu vai trò được phép truy cập endpoint này. |
| `403` | `ORIGIN_DENIED` | Origin của request vi phạm chính sách CORS. |
| `404` | `NOT_FOUND` | Bản ghi dữ liệu không tồn tại trong hệ thống. |
| `409` | `DATA_CONFLICT` | Dữ liệu bị trùng lặp (ví dụ mã môn, mã lớp, username) hoặc đang có ràng buộc khóa ngoại. |
| `422` | `VALIDATION_ERROR` | Lỗi xác thực schema Pydantic (thiếu trường, sai độ dài, sai kiểu dữ liệu). |
| `429` | `RATE_LIMITED` | Quá số lượt gọi cho phép (ví dụ đăng nhập quá 10 lần/phút). |
| `500` | `INTERNAL_ERROR` | Lỗi ngoại lệ phía máy chủ; kèm theo `request_id` để tra cứu trong log. |

---

## 5. Ma trận Phân quyền Tổng thể (Actor Permission Matrix)

Bảng đối chiếu quyền hạn giữa **4 Vai trò Chuẩn hóa** trên toàn bộ hệ thống:

| Nhóm Tài nguyên & Nghiệp vụ | `SYSTEM_ADMIN` | `EXAMINER` (Khảo thí) | `TEACHER` (Giảng viên) | `STUDENT` (Sinh viên) |
|---|:---:|:---:|:---:|:---:|
| **Xác thực & Thông tin cá nhân** (`/auth/*`) | ✅ Full | ✅ Full | ✅ Full | ✅ Full |
| **Quản lý Tài khoản & Phân quyền** (`/admin/users`) | ✅ Full | ❌ | ❌ | ❌ |
| **Cấu hình Nền tảng & AI Provider** (`/admin/settings/*`) | ✅ Full | ❌ | ❌ | ❌ |
| **Nhật ký Kiểm toán hệ thống** (`/admin/audit`) | ✅ Full | ❌ | ❌ | ❌ |
| **Quản lý Học kỳ** (`/examiner/semesters/*`) | ✅ Read/Write | ✅ Full | 👁️ Read-only | ❌ |
| **Danh mục Môn học Toàn trường** (`/examiner/courses`) | ✅ Full | ✅ Full | ❌ | ❌ |
| **Lớp học phần & Import Thí sinh** (`/examiner/sections`, `/enrollments`) | ✅ Full | ✅ Full | 👁️ Xem lớp mình | ❌ |
| **Điều phối Ca thi & Phòng thi** (`/examiner/slots`, `/schedule`) | ✅ Full | ✅ Full | ❌ | ❌ |
| **Khóa sổ điểm & Xuất bảng điểm FAP** (`/examiner/slots/*/lock`, `/export`) | ✅ Full | ✅ Full | ❌ | ❌ |
| **Course Workspace & Giáo trình RAG** (`/admin/courses/{id}/documents`) | ✅ | 👁️ Read-only | ✅ Full môn mình | ❌ |
| **Chuẩn đầu ra & Rubric** (`/admin/courses/{id}/rubrics`) | ✅ | 👁️ Read-only | ✅ Full môn mình | ❌ |
| **Soạn Blueprint & Snapshot Đề thi** (`/admin/exams`) | ✅ | 👁️ Read-only | ✅ Full môn mình | ❌ |
| **Giám sát & Coi thi trực tiếp** (`/proctor`) | ✅ | ✅ Toàn ca | ✅ Lớp được phân công | ❌ |
| **Chấm bài, Nghe Audio, Sửa Transcript** (`/admin/attempts/*`) | ✅ | 👁️ Giám sát | ✅ Chấm bài phân công | ❌ |
| **Điều phối Phúc khảo Chấm mù (Blind)** | ✅ | ✅ Điều phối GV2 | ✅ Chấm độc lập | ❌ |
| **Tham gia thi, Ghi âm & Nộp bài** (`/exam-sessions/*`) | ❌ | ❌ | ❌ | ✅ Full |
