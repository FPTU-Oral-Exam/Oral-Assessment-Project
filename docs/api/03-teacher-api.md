# Đặc tả API: Giảng viên Bộ môn (Teacher API)

> **Mô-đun:** Course Workspace, Học liệu Giáo trình RAG (pgvector 768 chiều), Chuẩn đầu ra (LO), Chủ đề (Topics), Tiêu chí Rubric, Soạn Blueprint & Đóng băng Snapshot Đề thi, Đánh giá & Chấm bài thi vấn đáp  
> **Vai trò truy cập:** `TEACHER`, `SYSTEM_ADMIN`  
> **Tài liệu tham chiếu:** [docs/api/README.md](./README.md), [docs/specifications/03-actor-teacher.md](../specifications/03-actor-teacher.md)  
> **Tệp mã nguồn Backend:** `services/api/app/routes_admin.py`

---

## 1. Bảng Tổng hợp Endpoint Giảng viên

| Nhóm chức năng | Phương thức | Đường dẫn API | Mô tả chức năng | Use Case Ánh xạ |
|---|---|---|---|---|
| **Course Workspace** | `GET` | `/api/admin/courses` | Danh sách môn học giảng viên phụ trách giảng dạy | `UC-TEACHER-001` |
| | `GET` | `/api/admin/courses/{id}/workspace` | Tải toàn bộ cây dữ liệu môn học (RAG, LO, Topics, Rubrics) | `UC-TEACHER-001` |
| **Giáo trình & RAG** | `POST` | `/api/admin/courses/{id}/documents` | Upload PDF giáo trình lên MinIO, kích hoạt Celery bóc tách text | `UC-TEACHER-009` |
| | `GET` | `/api/admin/documents/{key}/content` | Xem nội dung các chunks văn bản đã bóc tách từ PDF | `UC-TEACHER-009` |
| | `POST` | `/api/admin/documents/{key}/retry` | Thử lại quá trình bóc tách & embedding nếu gặp sự cố | `UC-TEACHER-009` |
| | `GET` | `/api/admin/courses/{id}/rag` | Thử nghiệm tìm kiếm vector ngữ nghĩa (pgvector 768 chiều) | `UC-TEACHER-009` |
| **LO & Topics** | `POST` | `/api/admin/courses/{id}/outcomes` | Tạo mới Chuẩn đầu ra (Learning Outcome) cho môn học | `UC-TEACHER-002` |
| | `PUT` | `/api/admin/outcomes/{key}` | Cập nhật mã và nội dung Chuẩn đầu ra | `UC-TEACHER-002` |
| | `DELETE`| `/api/admin/outcomes/{key}` | Xóa Chuẩn đầu ra | `UC-TEACHER-002` |
| | `POST` | `/api/admin/courses/{id}/topics` | Tạo Chủ đề thi (liên kết LO với các chương giáo trình) | `UC-TEACHER-002` |
| | `PUT` | `/api/admin/topics/{key}` | Cập nhật Chủ đề thi | `UC-TEACHER-002` |
| | `DELETE`| `/api/admin/topics/{key}` | Xóa Chủ đề thi | `UC-TEACHER-002` |
| **Rubric Đánh giá** | `POST` | `/api/admin/courses/{id}/rubrics` | Tạo Rubric tiêu chí chấm điểm đa chiều có trọng số | `UC-TEACHER-002` |
| | `PUT` | `/api/admin/rubrics/{key}` | Cập nhật tiêu chí hoặc trọng số của Rubric | `UC-TEACHER-002` |
| | `DELETE`| `/api/admin/rubrics/{key}` | Xóa Rubric khỏi môn học | `UC-TEACHER-002` |
| **Đề thi & Snapshot**| `POST` | `/api/admin/exams` | Tạo Exam Blueprint (phân bổ số câu theo topic & độ khó) | `UC-TEACHER-003` |
| | `PUT` | `/api/admin/exams/{key}` | Cập nhật cấu hình Blueprint đề thi | `UC-TEACHER-003` |
| | `POST` | `/api/admin/exams/{key}/publish` | **Công bố đề thi:** Đóng băng Snapshot bất biến vào CSDL | `UC-TEACHER-004` |
| **Đánh giá & Chấm thi**| `GET` | `/api/admin/results` | Danh sách bài thi của sinh viên cần rà soát/chấm điểm | `UC-TEACHER-006` |
| | `GET` | `/api/admin/results/{key}` | Chi tiết bài thi: nghe audio MinIO, xem transcript, điểm AI | `UC-TEACHER-006` |
| | `POST` | `/api/admin/attempts/{key}/regrade-transcript`| Chấm lại bài thi sau khi Giảng viên sửa bản transcript | `UC-TEACHER-006` |
| | `POST` | `/api/admin/attempts/{key}/override` | Giảng viên điều chỉnh điểm chính thức kèm lý do bắt buộc | `UC-TEACHER-007` |
| | `POST` | `/api/admin/results/{key}/approve` | Giảng viên phê duyệt kết quả chính thức | `UC-TEACHER-007` |

---

## 2. Chi tiết Từng Endpoint

### 2.1. Course Workspace (Không gian Môn học)

- **URL:** `GET /api/admin/courses/{id}/workspace`
- **Mô tả:** Tải cấu trúc dữ liệu hoàn chỉnh của một môn học phục vụ giao diện đa tab Course Workspace (Giáo trình, Chuẩn đầu ra, Chủ đề, Rubric, Đề thi).

#### Success Response (`200 OK`):
```json
{
  "course": {
    "id": "crs_mas291",
    "code": "MAS291",
    "name": "Statistics & Probability"
  },
  "documents": [
    {
      "id": "doc_01",
      "filename": "Probability_Statistics_for_Engineers.pdf",
      "status": "READY",
      "chunk_count": 142
    }
  ],
  "learning_outcomes": [
    {
      "id": "lo_01",
      "code": "LO1",
      "description": "Hiểu và áp dụng định lý Bayes trong phân tích dữ liệu",
      "weight": 1.0
    }
  ],
  "topics": [
    {
      "id": "top_01",
      "name": "Bayesian Inference",
      "learning_outcome_ids": ["lo_01"],
      "chapter_ids": ["ch_03"]
    }
  ],
  "rubrics": [
    {
      "id": "rub_01",
      "name": "Standard Oral Rubric 2026",
      "criteria": [
        { "name": "Content", "max_score": 10, "weight": 0.5 },
        { "name": "Fluency", "max_score": 10, "weight": 0.3 },
        { "name": "Grammar", "max_score": 10, "weight": 0.2 }
      ]
    }
  ],
  "exams": []
}
```

---

### 2.2. Nạp Giáo trình PDF & RAG Engine

#### Tải lên giáo trình PDF:
- **URL:** `POST /api/admin/courses/{id}/documents`
- **Content-Type:** `multipart/form-data`
- **Form Data:**
  - `file`: File nhị phân `.pdf`
- **Xử lý ngầm (Under the hood):** Server lưu file PDF lên bucket MinIO, sau đó phát sinh tác vụ Celery Worker chạy ngầm:
  1. Trích xuất text từng trang kèm tọa độ PDF.
  2. Bóc tách mục lục chương mục (`BookSection`).
  3. Chia nhỏ văn bản thành các chunks có overlap 15%.
  4. Tạo embedding 768 chiều và lưu vào bảng `chunks` (PostgreSQL pgvector).

#### Thử nghiệm tìm kiếm Vector ngữ nghĩa (RAG Search Test):
- **URL:** `GET /api/admin/courses/{id}/rag?q={query}&topic_id={topic_id}`
- **Success Response (`200 OK`):**
```json
{
  "query": "Giải thích định lý Bayes",
  "matches": [
    {
      "chunk_id": "chk_881",
      "content": "Định lý Bayes mô tả xác suất của một biến cố dựa trên các điều kiện liên quan...",
      "page_number": 45,
      "similarity_score": 0.892
    }
  ]
}
```

---

### 2.3. Tạo Chuẩn đầu ra, Chủ đề & Rubric

#### Tạo Chuẩn đầu ra (LO):
- **URL:** `POST /api/admin/courses/{course_id}/outcomes`
- **Request Body Schema (`schemas.LOIn`):**
```json
{
  "code": "LO2",
  "description": "Phân tích và tính toán phân phối chuẩn (Gaussian Distribution)",
  "weight": 1.0
}
```

#### Tạo Rubric tiêu chí đánh giá:
- **URL:** `POST /api/admin/courses/{course_id}/rubrics`
- **Request Body Schema (`schemas.RubricIn`):**
```json
{
  "name": "Rubric Thi Vấn Đáp MAS291",
  "criteria": [
    {
      "name": "Độ chính xác nội dung",
      "description": "Trả lời đúng trọng tâm câu hỏi, nắm vững công thức",
      "max_score": 10.0,
      "weight": 0.6
    },
    {
      "name": "Khả năng diễn đạt & Phản xạ",
      "description": "Nói lưu loát, thuật ngữ chính xác",
      "max_score": 10.0,
      "weight": 0.4
    }
  ]
}
```

---

### 2.4. Soạn Blueprint & Đóng băng Snapshot Đề thi

#### Tạo Exam Blueprint:
- **URL:** `POST /api/admin/exams`
- **Request Body Schema (`schemas.ExamIn`):**
```json
{
  "course_id": "crs_mas291",
  "rubric_id": "rub_01",
  "name": "Đề thi Vấn đáp Final Fall 2026",
  "description": "Đề thi vấn đáp 3 câu: 1 Dễ, 1 Vừa, 1 Khó",
  "time_limit": 1800,
  "question_count": 3,
  "blueprint": [
    { "topic_id": "top_01", "difficulty": "EASY", "count": 1 },
    { "topic_id": "top_01", "difficulty": "MEDIUM", "count": 1 },
    { "topic_id": "top_02", "difficulty": "HARD", "count": 1 }
  ],
  "max_attempts": 1
}
```

#### Công bố đề thi (Publish & Snapshot Versioning):
- **URL:** `POST /api/admin/exams/{key}/publish`
- **Mô tả:** **Nguyên tắc Bất biến số 4:** Đóng băng toàn bộ cấu hình, tài liệu RAG, ngân hàng câu hỏi và Rubric tại thời điểm công bố vào bảng `exam_snapshots`. Khi sinh viên vào thi, đề thi sẽ lấy dữ liệu từ bản snapshot này, đảm bảo tính công bằng tuyệt đối dù giáo trình môn học có bị cập nhật về sau.

---

### 2.5. Đánh giá & Chấm bài thi (Grading & Override)

#### Lấy chi tiết bài thi:
- **URL:** `GET /api/admin/results/{key}`
- **Success Response (`200 OK`):**
```json
{
  "attempt_id": "att_01",
  "student_name": "Nguyễn Văn Sinh Viên",
  "audio_url": "http://localhost:9000/evidence/att_01_audio.webm",
  "transcript": "Dạ thưa thầy, định lý Bayes là xác suất có điều kiện...",
  "stt_confidence": 0.94,
  "ai_score": 8.5,
  "ai_feedback": "Sinh viên trả lời đúng bản chất công thức, phản xạ tốt.",
  "status": "COMPLETED",
  "criteria_scores": [
    { "name": "Độ chính xác nội dung", "score": 8.5 },
    { "name": "Khả năng diễn đạt & Phản xạ", "score": 8.5 }
  ]
}
```

#### Chấm lại sau khi sửa Transcript:
- **URL:** `POST /api/admin/attempts/{key}/regrade-transcript`
- **Request Body Schema (`schemas.RegradeTranscriptIn`):**
```json
{
  "corrected_transcript": "Dạ thưa thầy, định lý Bayes là xác suất có điều kiện của A khi biết B...",
  "reason": "PhoWhisper nhận diện thiếu từ khóa 'khi biết B'"
}
```
- **Mô tả:** Worker kích hoạt LLM Judge chấm lại dựa trên văn bản đã hiệu chỉnh, cập nhật lại điểm số tự động.

#### Điều chỉnh điểm chính thức (Score Override):
- **URL:** `POST /api/admin/attempts/{key}/override`
- **Request Body Schema (`schemas.ScoreOverrideIn`):**
```json
{
  "score": 9.0,
  "reason": "Sinh viên phát âm chưa thật chuẩn nhưng tư duy giải thích mô hình rất sáng tạo.",
  "criteria": [
    { "name": "Độ chính xác nội dung", "score": 9.5 },
    { "name": "Khả năng diễn đạt & Phản xạ", "score": 8.5 }
  ]
}
```
- **Ràng buộc:** Lý do điều chỉnh điểm (`reason`) là **bắt buộc** và được ghi nhận bất biến vào bảng `audits` phục vụ thanh tra khảo thí.
