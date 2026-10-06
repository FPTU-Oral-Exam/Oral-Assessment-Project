# Đặc tả API: Sinh viên Thin-Client Desktop (Student API)

> **Mô-đun:** Student Exam Workflow, Audio Streaming, Chunked Upload to MinIO & Result Viewing  
> **Ứng dụng Client:** `apps/student-app` (Electron 33 + Vite + React 18 + RNNoise WASM)  
> **Vai trò truy cập:** `STUDENT`  
> **Tài liệu tham chiếu:** [docs/api/README.md](./README.md), [docs/specifications/04-actor-student.md](../specifications/04-actor-student.md)  
> **Tệp mã nguồn Backend:** `services/api/app/routes_exam.py`

---

## 1. Bản đồ Luồng Làm bài thi của Sinh viên (Anti-Tampering Flow)

Hệ thống tuân thủ nghiêm ngặt **Nguyên tắc Bất biến số 2 (Server-side STT & Anti-Tampering)**:
- Ứng dụng Desktop tuyệt đối không chạy PhoWhisper local, không tạo và không được phép sửa transcript.
- Toàn bộ câu trả lời chỉ ghi âm raw audio, chia chunk 4MB có SHA-256 integrity checksum tải trực tiếp lên MinIO.
- Điểm số được chấm dựa trên Transcript do **Worker Server tự động phiên âm từ file bằng chứng MinIO**.

```
  STUDENT APP (Desktop)                                   FASTAPI BACKEND & MINIO                    CELERY WORKER
           │                                                         │                             │
   [1] GET /api/exams/available                                      │                             │
           ├────────────────────────────────────────────────────────>│                             │
           │<────────────────────────────────────────────────────────┤ (Danh sách bài thi)          │
           │                                                         │                             │
   [2] POST /api/exam-sessions                                       │                             │
           ├────────────────────────────────────────────────────────>│ (Khởi tạo phiên thi)        │
           │                                                         │                             │
   [3] POST /api/question-attempts/{id}/start                        │                             │
           ├────────────────────────────────────────────────────────>│ (Bắt đầu trả lời câu hỏi)   │
           │ [Ghi âm raw audio MediaRecorder]                        │                             │
           │                                                         │                             │
   [4] Upload chunk 4MB lên MinIO (PUT /uploads/{id}/chunks/{i})     │                             │
           ├────────────────────────────────────────────────────────>│ (Lưu chunk MinIO S3)        │
           │                                                         │                             │
   [5] POST /api/question-attempts/{id}/submit-audio                 │                             │
           ├────────────────────────────────────────────────────────>│ (Gán trạng thái AWAITING_STT)│
           │                                                         │─────────── Đẩy Job ────────>│
           │                                                         │                             │ [PhoWhisper STT]
           │                                                         │                             │ [RAG Search]
           │                                                         │                             │ [LLM Judge Rubric]
   [6] POST /api/exam-sessions/{id}/finish                           │                             │
           ├────────────────────────────────────────────────────────>│ (Nộp toàn bộ bài thi)       │
           │                                                         │                             │
   [7] GET /api/exam-sessions/{id}                                   │                             │
           ├────────────────────────────────────────────────────────>│ (Xem kết quả đánh giá)      │
```

---

## 2. Bảng Tổng hợp Endpoint Sinh viên

| Phương thức | Đường dẫn API | Mục đích sử dụng | Use Case Ánh xạ |
|---|---|---|---|
| `GET` | `/api/exams/available` | Lấy danh sách các bài thi mà sinh viên được phân quyền làm bài | `UC-STUDENT-001` |
| `POST` | `/api/exam-sessions` | Khởi tạo phiên thi cho sinh viên từ Snapshot đã đóng băng | `UC-STUDENT-002` |
| `GET` | `/api/exam-sessions/{key}` | Lấy chi tiết phiên thi (danh sách câu hỏi được phân bổ) | `UC-STUDENT-002` |
| `POST` | `/api/exam-sessions/{key}/start` | Bắt đầu bấm giờ làm bài thi chính thức | `UC-STUDENT-002` |
| `POST` | `/api/question-attempts/{key}/start`| Bắt đầu trả lời một câu hỏi (ghi nhận thời gian bắt đầu câu) | `UC-STUDENT-003` |
| `POST` | `/api/question-attempts/{key}/submit-audio`| Nộp file audio bằng chứng (`upload_id`), chuyển trạng thái `AWAITING_STT`| `UC-STUDENT-003` |
| `POST` | `/api/exam-sessions/{key}/finish` | Hoàn thành và nộp toàn bộ bài thi vấn đáp | `UC-STUDENT-004` |

---

## 3. Chi tiết Từng Endpoint

### 3.1. Lấy danh sách bài thi được giao

- **URL:** `GET /api/exams/available`
- **Quyền hạn:** `STUDENT` (Bearer Token)
- **Mô tả:** Trả về danh sách các bài thi mà sinh viên đã được ghi danh (Enrollment) và ca thi đang mở.

#### Success Response (`200 OK`):
```json
[
  {
    "id": "exm_final_mas291",
    "name": "Đề thi Vấn đáp Final Fall 2026 - MAS291",
    "course_code": "MAS291",
    "course_name": "Statistics & Probability",
    "duration_minutes": 30,
    "question_count": 3,
    "status": "READY"
  }
]
```

---

### 3.2. Khởi tạo & Bắt đầu phiên thi

#### Khởi tạo phiên thi:
- **URL:** `POST /api/exam-sessions`
- **Request Body Schema (`schemas.SessionIn`):**
```json
{
  "exam_id": "exm_final_mas291",
  "new_attempt": false
}
```
- **Success Response (`200 OK`):**
```json
{
  "session_id": "ses_99887766",
  "exam_id": "exm_final_mas291",
  "status": "CREATED",
  "created_at": 1792022400.0,
  "questions": [
    {
      "attempt_id": "att_01",
      "sequence": 1,
      "text": "Bạn hãy phát biểu định lý Bayes và giải thích ý nghĩa của các đại lượng P(A|B) và P(B|A)?",
      "difficulty": "EASY",
      "status": "NOT_STARTED"
    },
    {
      "attempt_id": "att_02",
      "sequence": 2,
      "text": "Nêu sự khác biệt cơ bản giữa phân phối rời rạc và phân phối liên tục, lấy ví dụ thực tế?",
      "difficulty": "MEDIUM",
      "status": "NOT_STARTED"
    }
  ]
}
```

#### Bắt đầu tính giờ làm bài:
- **URL:** `POST /api/exam-sessions/{key}/start`
- **Mô tả:** Kích hoạt đồng hồ đếm ngược phiên thi trên Server (Server là Single Source of Truth).

---

### 3.3. Trả lời câu hỏi & Nộp âm thanh bằng chứng

#### Bắt đầu trả lời câu hỏi:
- **URL:** `POST /api/question-attempts/{key}/start`
- **Path Parameters:** `key`: `attempt_id` của câu hỏi cần trả lời.
- **Mô tả:** Client Desktop bắt đầu ghi âm qua Web Audio API + RNNoise WASM filter.

#### Nộp bài âm thanh (Submit Audio Evidence):
Sau khi Client hoàn tất quá trình tải tệp phân mảnh lên MinIO qua cụm API `/api/uploads/*` (xem [00-auth-and-common.md](./00-auth-and-common.md)), Client gọi endpoint này:

- **URL:** `POST /api/question-attempts/{key}/submit-audio`
- **Request Body Schema (`schemas.SubmitAudioIn`):**
```json
{
  "upload_id": "upl_1122334455",
  "kind": "AUDIO"
}
```
- **Xử lý phía Server:**
  1. Kiểm tra file trên MinIO S3 đảm bảo tính toàn vẹn (Check checksum SHA-256).
  2. Gắn bản ghi `Evidence` vào bài thi.
  3. Cập nhật trạng thái câu hỏi thành `AWAITING_STT`.
  4. Đẩy tác vụ vào Celery queue: PhoWhisper STT $\rightarrow$ RAG retrieval $\rightarrow$ LLM Judge scoring.

#### Success Response (`200 OK`):
```json
{
  "attempt_id": "att_01",
  "status": "AWAITING_STT",
  "submitted_at": 1792022700.0,
  "message": "Âm thanh đã được tiếp nhận an toàn và đưa vào hàng đợi chấm điểm"
}
```

---

### 3.4. Kết thúc bài thi & Xem kết quả

#### Nộp toàn bộ bài thi:
- **URL:** `POST /api/exam-sessions/{key}/finish`
- **Mô tả:** Đóng phiên thi của sinh viên, chuyển trạng thái phiên sang `COMPLETED`.

#### Xem kết quả đánh giá:
- **URL:** `GET /api/exam-sessions/{key}`
- **Success Response (`200 OK`):**
```json
{
  "session_id": "ses_99887766",
  "status": "COMPLETED",
  "total_score": 8.5,
  "confidence_score": 0.91,
  "is_passed": true,
  "questions": [
    {
      "sequence": 1,
      "score": 8.5,
      "feedback": "Phản xạ trả lời tốt, định nghĩa chuẩn xác.",
      "status": "GRADED"
    }
  ]
}
```
