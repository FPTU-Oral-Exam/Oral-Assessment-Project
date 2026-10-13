# Đặc tả API: Giảng viên Bộ môn (Teacher API)

> **Mô-đun:** Coi thi (Lịch coi thi `/schedule` & Giám sát phòng thi `/proctor`), Đánh giá & Chấm bài thi vấn đáp (`/results`), Điều chỉnh điểm (`/override`), Hiệu đính transcript chấm lại (`/regrade`), Phê duyệt kết quả (`/approve`), Thẩm định chấm chéo 2 vòng độc lập (`/re-evaluations`).  
> **Vai trò truy cập:** `TEACHER`, `SYSTEM_ADMIN`  
> **Tài liệu tham chiếu:** [docs/api/README.md](./README.md), [docs/specifications/03-actor-teacher.md](../specifications/03-actor-teacher.md)  
> **Tệp mã nguồn Backend:** `services/api/app/routes_teacher.py` (Tiền tố: `/teacher`)

---

## 1. Bảng Tổng hợp Endpoint Giảng viên

| Nhóm chức năng | Phương thức | Đường dẫn API | Mô tả chức năng | Quyền hạn |
|---|---|---|---|---|
| **Coi thi & Giám sát** | `GET` | `/api/teacher/schedule` | Danh sách ca thi/phòng thi giảng viên được phân công coi thi | `TEACHER` |
| | `GET` | `/api/teacher/proctor/{slot_id}` | Chi tiết ca thi và danh sách thí sinh trong phòng giám sát | `TEACHER` |
| **Đánh giá & Chấm thi** | `GET` | `/api/teacher/results` | Danh sách bài thi sinh viên cần rà soát/chấm điểm theo ca thi | `TEACHER` |
| | `GET` | `/api/teacher/results/{session_id}` | Chi tiết bài thi: nghe audio MinIO, xem transcript, điểm AI & tiêu chí rubric | `TEACHER` |
| | `POST` | `/api/teacher/attempts/{attempt_id}/override` | Giảng viên điều chỉnh điểm chính thức kèm lý do bắt buộc | `TEACHER` |
| | `POST` | `/api/teacher/attempts/{attempt_id}/regrade` | Chấm lại câu hỏi sau khi Giảng viên hiệu đính văn bản transcript | `TEACHER` |
| | `POST` | `/api/teacher/results/{session_id}/approve` | Giảng viên phê duyệt kết quả chính thức cho lần thi | `TEACHER` |
| **Thẩm định Chấm chéo** | `GET` | `/api/teacher/re-evaluations` | Danh sách bài thẩm định chấm chéo vòng 2 (Blind Marking) | `TEACHER` |
| | `POST` | `/api/teacher/re-evaluations/{id}/submit` | Giảng viên 2 nộp điểm chấm thẩm định độc lập | `TEACHER` |
| | `POST` | `/api/teacher/attempts/{attempt_id}/request-re-eval` | Gửi yêu cầu chuyển sang thẩm định chấm chéo độc lập vòng 2 | `TEACHER` |

---

## 2. Chi tiết Từng Endpoint

### 2.1. Lịch Coi thi Giảng viên (`GET /api/teacher/schedule`)

- **Mô tả:** Trả về tất cả các ca thi/phòng thi mà Giảng viên hiện tại được phân công coi thi (`ScheduleSlot.batch_id` gắn với `ExamBatch.assigned_teacher_id == user.id` hoặc các môn học/lớp phụ trách).
- **Yêu cầu xác thực:** Cookie HTTP-only `auth_token` hoặc Bearer JWT (Role `TEACHER` hoặc `SYSTEM_ADMIN`).

#### Phản hồi thành công (`200 OK`):
```json
[
  {
    "id": "slot_01",
    "slot_number": 1,
    "room": "A301",
    "date": 1743465600.0,
    "start_time": "08:00",
    "end_time": "10:00",
    "status": "READY",
    "grade_locked": false,
    "student_count": 15,
    "exam_id": "exam_01",
    "exam_name": "Thi Vấn Đáp Tiếng Anh Cuối Kỳ",
    "course_id": "course_01",
    "course_name": "Tiếng Anh Chuyên Ngành",
    "course_code": "ENG101",
    "semester_name": "Spring 2026",
    "batch_id": "batch_01",
    "batch_name": "Ca 1 - Sáng T2"
  }
]
```

---

### 2.2. Giám sát Phòng thi Trực tiếp (`GET /api/teacher/proctor/{slot_id}`)

- **Mô tả:** Lấy thông tin phòng thi và danh sách thí sinh được phân bổ vào phòng thi đó cùng trạng thái thi cử thực tế (`DEVICE_CHECK`, `IN_PROGRESS`, `SUBMITTED`, `COMPLETED`).
- **Tham số:** `slot_id` (UUID chuỗi định danh ca thi).

#### Phản hồi thành công (`200 OK`):
```json
{
  "slot": {
    "id": "slot_01",
    "slot_number": 1,
    "room": "A301",
    "date": 1743465600.0,
    "start_time": "08:00",
    "end_time": "10:00",
    "status": "IN_PROGRESS",
    "grade_locked": false,
    "student_count": 2
  },
  "exam": {
    "id": "exam_01",
    "name": "Thi Vấn Đáp Tiếng Anh Cuối Kỳ",
    "course_id": "course_01",
    "course_name": "Tiếng Anh Chuyên Ngành",
    "course_code": "ENG101"
  },
  "candidates": [
    {
      "student_id": "usr_sv01",
      "name": "Nguyễn Văn An",
      "username": "SE180001",
      "email": "annv@fpt.edu.vn",
      "status": "SUBMITTED",
      "session_id": "sess_01",
      "started_at": 1743465620.0,
      "completed_at": 1743466800.0,
      "final_score": 8.5
    }
  ]
}
```

---

### 2.3. Danh sách Bài thi Cần Chấm (`GET /api/teacher/results`)

- **Mô tả:** Lấy danh sách các bài thi (ExamSession) trong phạm vi các ca thi giảng viên phụ trách coi thi/chấm điểm.
- **Query Parameters:**
  - `course_id`: Lọc theo mã định danh môn học (tùy chọn).
  - `exam_id`: Lọc theo kỳ thi (tùy chọn).
  - `status`: Lọc theo trạng thái bài thi (`SUBMITTED`, `REVIEW_REQUIRED`, `COMPLETED`).

---

### 2.4. Chi tiết Bài thi & Bằng chứng (`GET /api/teacher/results/{session_id}`)

- **Mô tả:** Tải toàn bộ bằng chứng âm thanh MinIO, bản dịch Whisper STT, điểm thành phần theo rubric, lịch sử chấm của từng câu hỏi trong bài thi.

---

### 2.5. Điều chỉnh Điểm Chính thức (`POST /api/teacher/attempts/{attempt_id}/override`)

- **Mô tả:** Giảng viên can thiệp ghi đè điểm cho một câu hỏi thi kèm lý do bắt buộc. Hệ thống tự động tính lại điểm trung bình kết quả toàn bài và lưu vết Audit log.

#### Request Body (`application/json`):
```json
{
  "score": 9.0,
  "reason": "Sinh viên bổ sung ví dụ thực tế chính xác về giao thức mạng",
  "criteria": [
    {
      "name": "Độ chính xác",
      "score": 9.0,
      "feedback": "Phân tích xuất sắc"
    }
  ]
}
```

---

### 2.6. Hiệu đính Transcript & AI Chấm lại (`POST /api/teacher/attempts/{attempt_id}/regrade`)

- **Mô tả:** Giảng viên chỉnh sửa trực tiếp các từ ngữ bị phiên âm sai do lỗi âm thanh/giọng địa phương và kích hoạt Celery Worker chấm lại tự động theo Rubric.

#### Request Body (`application/json`):
```json
{
  "corrected_transcript": "Process là tiến trình có không gian địa chỉ riêng biệt...",
  "reason": "Sửa lỗi nhận diện sai thuật ngữ chuyên môn con trỏ"
}
```

---

### 2.7. Phê duyệt Kết quả Bài thi (`POST /api/teacher/results/{session_id}/approve`)

- **Mô tả:** Giảng viên xác nhận điểm thi chính thức, chốt điểm và chuyển trạng thái bài thi sang `COMPLETED`.

---

### 2.8. Thẩm định Chấm chéo Độc lập Vòng 2 (`GET /api/teacher/re-evaluations`)

- **Mô tả:** Danh sách các bài thi được chuyển sang chấm chéo độc lập (Blind Marking). Nếu Giảng viên là người chấm vòng 2, điểm của Giảng viên 1 (`score_1`) sẽ tự động được ẩn đi cho đến khi hoàn thành chấm.

---

### 2.9. Nộp Điểm Thẩm định Vòng 2 (`POST /api/teacher/re-evaluations/{re_eval_id}/submit`)

- **Mô tả:** Giảng viên 2 nộp điểm đánh giá độc lập. Hệ thống tự động tính điểm chính thức là trung bình cộng của 2 vòng chấm: `final_score = (score_1 + score_2) / 2`.

#### Request Body (`application/json`):
```json
{
  "score_2": 8.5,
  "feedback": "Đồng thuận với ý trả lời nhưng đánh giá cao hơn phần phát âm"
}
```
