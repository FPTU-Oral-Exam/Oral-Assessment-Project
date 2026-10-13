# Đặc tả API: Ban Học thuật & Quản trị Ngân hàng Đề (Academy API)

> **Mô-đun:** Quản lý Ngân hàng Câu hỏi Chuẩn hóa 6 dạng PTE/Oral (RA, RS, GD, DI, SI, RL), Soạn thảo & Thẩm định Ma trận Đề thi (Exam Matrix Blueprint), Bộ Tiêu chuẩn Rubrics Đa chiều, Kiểm định Tồn kho Đề thi (Stock Health Validator) & Tự động Sinh Đề Mẫu  
> **Vai trò truy cập:** `ACADEMY`, `SYSTEM_ADMIN`  
> **Tài liệu tham chiếu:** [docs/api/README.md](./README.md)  
> **Tệp mã nguồn Frontend Service:** `apps/staff-portal/services/academy.service.ts`

---

## 1. Bảng Tổng hợp Endpoint Ban Học thuật

| Nhóm chức năng | Phương thức | Đường dẫn API | Mô tả chức năng |
|---|---|---|---|
| **Ngân hàng Câu hỏi** | `GET` | `/api/academy/questions` | Danh sách câu hỏi có phân trang, lọc theo type (RA, RS, GD, DI, SI, RL), skill, độ khó, trạng thái, thẻ prediction |
| | `GET` | `/api/academy/questions/{id}` | Chi tiết câu hỏi kèm media (hình ảnh, audio script, sample answer, key points) |
| | `POST` | `/api/academy/questions` | Tạo mới câu hỏi học thuật thích ứng theo loại media |
| | `PUT` | `/api/academy/questions/{id}` | Cập nhật nội dung câu hỏi, prompt, tiêu chí và thời gian prep/response |
| | `DELETE`| `/api/academy/questions/{id}` | Xóa câu hỏi khỏi ngân hàng |
| | `POST` | `/api/academy/questions/{id}/approve` | Phê duyệt chính thức câu hỏi (Chuyển trạng thái sang `APPROVED`) |
| | `POST` | `/api/academy/questions/import` | Nhập danh sách câu hỏi hàng loạt từ file Excel/JSON |
| **Ma trận Đề thi (Blueprint)** | `GET` | `/api/academy/matrices` | Danh sách các cấu hình Ma trận đề thi chuẩn hóa |
| | `GET` | `/api/academy/matrices/{id}` | Chi tiết cấu hình ma trận đề (phân bổ 6 dạng câu, độ khó, thời lượng) |
| | `POST` | `/api/academy/matrices` | Tạo cấu hình ma trận đề thi mới |
| | `PUT` | `/api/academy/matrices/{id}` | Cập nhật tỷ lệ và quy tắc chọn câu hỏi của ma trận |
| | `DELETE`| `/api/academy/matrices/{id}` | Xóa cấu hình ma trận |
| | `GET` | `/api/academy/matrices/{id}/stock-health` | **Kiểm định Sức khỏe Kho đề:** So sánh số câu cần trong ma trận với số lượng câu Approved trong kho |
| | `POST` | `/api/academy/matrices/{id}/generate-sample` | **Sinh Đề Mẫu:** Tự động bốc ngẫu nhiên câu hỏi từ ngân hàng theo ma trận để thẩm định |
| **Tiêu chuẩn Rubrics** | `GET` | `/api/academy/rubrics` | Danh sách bộ tiêu chuẩn Rubrics chấm điểm vấn đáp |
| | `GET` | `/api/academy/rubrics/{id}` | Chi tiết Rubric gồm danh sách tiêu chí, trọng số % và Band Descriptors |
| | `POST` | `/api/academy/rubrics` | Tạo bộ Rubric mới (ràng buộc tổng trọng số = 100%) |
| | `PUT` | `/api/academy/rubrics/{id}` | Cập nhật tiêu chí hoặc mô tả thang điểm (Descriptors) |
| | `DELETE`| `/api/academy/rubrics/{id}` | Xóa Rubric khỏi hệ thống |

---

## 2. Chi tiết Từng Endpoint Chính

### 2.1. Lấy danh sách câu hỏi Ngân hàng Đề thi
- **URL:** `GET /api/academy/questions`
- **Query Params:**
  - `type` (optional): `RA` | `RS` | `GD` | `DI` | `SI` | `RL`
  - `skill` (optional): `SPEAKING` | `WRITING` | `READING` | `LISTENING`
  - `difficulty` (optional): `EASY` | `MEDIUM` | `HARD`
  - `status` (optional): `DRAFT` | `APPROVED` | `IN_USE`
  - `is_predicted` (optional): `true` | `false`
  - `search` (optional): chuỗi từ khóa tìm kiếm prompt/title
- **Success Response (`200 OK`):**
```json
{
  "total": 3100,
  "items": [
    {
      "id": "q-ra-01",
      "code": "RA-101",
      "skill": "SPEAKING",
      "type": "RA",
      "title": "Quantum Computing Fundamentals",
      "prompt": "Quantum mechanics explores the fundamental properties of matter at microscopic scales...",
      "prep_time": 35,
      "response_time": 40,
      "difficulty": "MEDIUM",
      "status": "APPROVED",
      "is_predicted": true,
      "usage_count": 14,
      "tags": ["Technology", "Physics"]
    }
  ]
}
```

### 2.2. Kiểm định Sức khỏe Kho đề (Stock Health Validator)
- **URL:** `GET /api/academy/matrices/{id}/stock-health`
- **Mô tả:** Đánh giá xem ngân hàng câu hỏi có đủ câu hỏi đã duyệt (`APPROVED`) để đáp ứng quy mô kỳ thi theo ma trận đã định nghĩa hay không.
- **Success Response (`200 OK`):**
```json
{
  "matrix_id": "matrix-pte-standard",
  "is_ready_for_publishing": false,
  "health_breakdown": [
    {
      "type": "RA",
      "required_count": 2,
      "available_approved_count": 18,
      "status": "HEALTHY",
      "deficit": 0
    },
    {
      "type": "DI",
      "required_count": 2,
      "available_approved_count": 1,
      "status": "CRITICAL",
      "deficit": 1
    }
  ]
}
```

### 2.3. Sinh Đề Mẫu Theo Ma Trận (Sample Exam Generator)
- **URL:** `POST /api/academy/matrices/{id}/generate-sample`
- **Mô tả:** Rút trích tự động danh sách câu hỏi từ ngân hàng tuân thủ 100% tỷ lệ độ khó và dạng câu hỏi quy định bởi ma trận.
- **Success Response (`200 OK`):**
```json
{
  "exam_sample_id": "sample-exp-9921",
  "matrix_name": "PTE Academic Standard Blueprint 2026",
  "total_questions": 8,
  "total_duration_seconds": 620,
  "questions": [
    {
      "sequence": 1,
      "type": "RA",
      "code": "RA-101",
      "prompt": "..."
    }
  ]
}
```
