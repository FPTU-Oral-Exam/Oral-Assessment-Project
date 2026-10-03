# System Overview

## 1. Giới thiệu

**AI Oral Assessment Platform** (mã nguồn: `AI-Oral-Assessment-Platform`) là hệ thống thi vấn đáp trên máy tính dành cho sinh viên, trong đó:

- Sinh viên đăng nhập vào ứn- Sinh viên đăng nhập vào ứng dụng desktop (Student App Thin-Client) để làm bài thi
- Câu hỏi được sinh bởi AI dựa trên môn học, Learning Outcome, chủ đề, độ khó và blueprint
- Sinh viên trả lời bằng giọng nói; ứng dụng ghi âm raw và lọc nhiễu real-time qua RNNoise WASM
- Audio được chia chunk 4MB kèm SHA-256 integrity checksum tải trực tiếp lên MinIO
- Audio được chuyển thành văn bản (STT - Speech-to-Text) bởi PhoWhisper Server-Side Worker từ file âm thanh trên MinIO
- Chống gian lận (Anti-tampering): Không STT local, không cho phép sinh viên xem hay sửa transcript trên client
- Việc chấm điểm dựa trên: câu hỏi + transcript server + rubric + kiến thức từ RAG (pgvector)
- Audio/video là **bằng chứng pháp lý (evidence)** bất biến để giảng viên/khảo thí đối soát và xử lý phúc khảo

> **Giai đoạn hiện tại:** Đã hoàn thành kiến trúc Dual-Frontend, chuẩn hóa 4 vai trò đại học và E2E testing khép kín.

---

## 2. Mục tiêu nghiệp vụ

| # | Mục tiêu                                           |
| - | ---------------------------------------------------- |
| 1 | Chuẩn hóa thi vấn đáp tự động bằng AI               |
| 2 | Giảm tải việc ra đề thủ công và chấm thi diện rộng   |
| 3 | Chấm điểm sơ bộ/tự động minh bạch theo Rubric chuẩn  |
| 4 | Cho phép giảng viên/khảo thí audit lại kết quả dễ dàng|
| 5 | Lưu evidence để xử lý khiếu nại và phúc khảo         |
| 6 | Tạo nhiều bài thi cho nhiều môn học khác nhau       |
| 7 | Tái sử dụng chung nền tảng qua Dual-Frontend         |

---

## 3. Kiến trúc tổng thể

```
┌──────────────────────────────────────────────────────────────────────┐
│                    STUDENT APP (Thin-Client Desktop)                 │
│  (Electron 33 + Vite + React 18 + RNNoise WASM + ChunkedUploader)    │
│  • Đăng nhập (Memory-only JWT / Google OIDC)                         │
│  • Xem danh sách bài thi được giao                                   │
│  • Kiểm tra micro/camera & đo độ ồn môi trường 10 giây               │
│  • Ghi âm raw câu trả lời (Audio-only, không gõ phím)                │
│  • Upload chunk 4MB có SHA-256 checksum trực tiếp lên MinIO          │
│  • Gọi Submit Audio Endpoint (gửi upload_id, AWAITING_STT)           │
│  • Xem kết quả bài thi sau khi Server hoàn tất chấm điểm             │
└──────────────────────────────────┬───────────────────────────────────┘
                                   │ HTTPS REST / WebSocket
                                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    STAFF PORTAL (Web Cán bộ & Giảng viên)            │
│  (Next.js 15 App Router + TypeScript + Tailwind CSS + RBAC)          │
│  • Phân quyền 3 Route Groups nghiêm ngặt:                            │
│    ├── (admin): Quản trị người dùng, cấu hình hệ thống, audit log    │
│    ├── (examiner): Quản lý kỳ thi, lịch thi, sinh viên, duyệt điểm   │
│    └── (teacher): Quản lý môn học, giáo trình RAG, Rubric, chấm bài  │
└──────────────────────────────────┬───────────────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     BACKEND API (FastAPI Python 3.12+)               │
│                                                                      │
│  Auth │ Users │ Courses │ Documents │ Exams │ Grading │ Evidence     │
│                                                                      │
│  ┌─────────────┐         ┌─────────────┐                             │
│  │ PostgreSQL  │         │ Object S3   │                             │
│  │ + pgvector  │         │ (MinIO)     │                             │
│  └─────────────┘         └─────────────┘                             │
│           │                                                          │
│           ▼                                                          │
│  ┌────────────────────────────────────────────────────────────┐      │
│  │               BACKGROUND WORKER (Celery / Redis)           │      │
│  │  • Server STT Pipeline: PhoWhisper từ audio MinIO          │      │
│  │  • RAG Engine: Bóc tách PDF, embedding 768 chiều (pgvector)│      │
│  │  • Grading Engine: LLM Judge (Gemini / Ollama) theo Rubric │      │
│  └────────────────────────────────────────────────────────────┘      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 4. Các thành phần chính

### 4.1 Student App (Thin-Client Desktop)

- **Công nghệ:** Electron 33 + Vite + React 18 + TypeScript + `@oralai/shared`
- **Đặc tính chống gian lận (Anti-tampering):**
  - Zero-STT-Local: Không chạy PhoWhisper trên client, không sinh transcript.
  - Zero-Manual-Input: Không cho phép gõ bàn phím nhập câu trả lời.
  - Bộ nhớ an toàn: Lưu JWT token trong memory, không lưu localStorage/cookie.
  - Chunked Uploader: Chia nhỏ audio thành các chunk 4MB kèm SHA-256 checksum chống giả mạo khi truyền file lên MinIO.
  - RNNoise WASM AudioWorklet: Lọc tạp âm nền real-time ở tần số 48 kHz.

### 4.2 Staff Portal (Cổng Thông tin Cán bộ)

- **Công nghệ:** Next.js 15 App Router + React 18 + TypeScript + Tailwind CSS
- **Chức năng:**
  - RBAC Middleware kiểm soát quyền truy cập theo 3 role: `SYSTEM_ADMIN`, `EXAMINER`, `TEACHER`.
  - Quản lý môn học toàn trường (Khảo thí) và phân công môn học (Giảng viên).
  - Upload giáo trình PDF, trích xuất mục lục, chunking và sinh embedding RAG.
  - Tạo Learning Outcomes, Topics, Rubrics đa tiêu chí có trọng số.
  - Thiết kế Exam Blueprint và công bố đề thi với Exam Snapshot Versioning.
  - Chấm bài, thẩm định các bài thi có biên độ tự tin thấp (`REVIEW_REQUIRED`), phúc khảo độc lập.
  - Duyệt và khóa sổ điểm, xuất bảng điểm chuẩn FAP.

### 4.3 Backend API & Background Worker

- **Công nghệ:** FastAPI + Python 3.12+ + SQLAlchemy 2.0 + Alembic + Celery + Redis
- **Chức năng:**
  - Authentication kép: HTTP-only Cookie (cho Staff Web) và JWT Bearer Token (cho Student App).
  - Quản lý phiên thi (Exam Sessions) và phân bổ câu hỏi.
  - Endpoint chuyên dụng `POST /api/question-attempts/{key}/submit-audio` tiếp nhận bài nộp audio từ client.
  - Background Worker chạy tác vụ nặng: PhoWhisper STT từ file MinIO, RAG vector retrieval, chấm điểm LLM.

### 4.4 Database

- **PostgreSQL 16 + pgvector** (Chuẩn 3NF gồm 23 bảng):
  - Users, Courses, Enrollments
  - Learning Outcomes, Topics, Documents, Chunks (vector 768 chiều)
  - Rubrics, Exams, ExamSnapshots (đóng băng JSONB), Exam Sessions, Question Attempts
  - Assessments, Evidence, Audit Logs, MediaCleanup

### 4.5 Object Storage

- **MinIO/S3** cho:
  - Audio/video files bằng chứng thi (tổ chức theo `uploads/`)
  - Giáo trình PDF gốc và tài liệu bổ sung RAG

---

## 5. Actors (Người dùng hệ thống)

| Actor                                     | Vai trò         | Mô tả                                                                                          |
| ----------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------ |
| **Khảo thí (Examiner)**          | `EXAMINER`        | Quản lý kỳ thi: danh mục môn học toàn trường, giao đề, thêm sinh viên, setup lịch thi, chốt điểm |
| **Giảng viên (Teacher)**          | `TEACHER`      | Nhận yêu cầu ra đề, upload giáo trình RAG, tạo rubric, công bố đề, chấm điểm và rà soát        |
| **Sinh viên (Student)**            | `STUDENT`      | Thi trên máy tính qua Student App, ghi âm trả lời và tải bằng chứng                            |
| **Admin hệ thống (System Admin)** | `SYSTEM_ADMIN` | Quản trị tài khoản, cấu hình hệ thống (AI provider, storage, audit logs)                         |

---

## 6. Luồng chính của hệ thống

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        LUỒNG TẠO ĐỀ THI                                 │
├─────────────────────────────────────────────────────────────────────────┤
│  1. Khảo thí tạo môn học và giao yêu cầu làm đề cho Giảng viên         │
│  2. Giảng viên upload giáo trình (PDF) → extract → chunk → embedding    │
│  3. Giảng viên tạo Learning Outcomes (LO) cho môn                       │
│  4. Giảng viên tạo Topics (liên kết LO + chương giáo trình)             │
│  5. Giảng viên tạo Rubric (tiêu chí đánh giá & trọng số)                │
│  6. Giảng viên tạo Exam Blueprint (phân bổ câu hỏi theo topic/độ khó)   │
│  7. Giảng viên bấm "Sinh câu hỏi & công bố" (Exam Snapshot đóng băng)   │
│  8. Khảo thí setup ca thi và giao đề cho sinh viên dự thi               │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                        LUỒNG LÀM BÀI THI (STUDENT APP)                  │
├─────────────────────────────────────────────────────────────────────────┤
│  1. Sinh viên đăng nhập vào Student App (Electron)                      │
│  2. Sinh viên chọn bài thi đã được giao                                 │
│  3. Kiểm tra camera/micro & đo tiếng ồn môi trường 10 giây (RNNoise)   │
│  4. Sinh viên trả lời từng câu hỏi:                                     │
│     - Bấm "Bắt đầu trả lời" → ghi âm raw MediaRecorder                  │
│     - Bấm "Kết thúc trả lời" → dừng ghi âm                              │
│     - Student App tự động chia chunk 4MB (SHA-256) tải lên MinIO        │
│     - Gọi API submit-audio gửi upload_id (Backend gán AWAITING_STT)     │
│  5. Sinh viên bấm "Nộp bài thi" khi hoàn thành các câu hỏi             │
│  6. Background Worker tự động:                                          │
│     - Phiên âm PhoWhisper từ file audio MinIO                           │
│     - RAG vector search tài liệu đã snapshot                            │
│     - LLM Judge chấm điểm theo Rubric và tính AI Confidence             │
│  7. Sinh viên xem kết quả trên màn hình Results                         │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                        LUỒNG CHẤM ĐIỂM & DUYỆT                          │
├─────────────────────────────────────────────────────────────────────────┤
│  1. AI chấm điểm → sinh điểm số và confidence score                     │
│  2. Nếu confidence ≥ threshold → auto accept                            │
│  3. Nếu confidence < threshold → đánh dấu REVIEW_REQUIRED               │
│  4. Giảng viên nghe audio MinIO, đối chiếu transcript và rubric         │
│  5. Giảng viên có thể:                                                  │
│     - Yêu cầu chấm lại (re-grade)                                       │
│     - Điều chỉnh điểm kèm lý do giải trình bắt buộc                     │
│  6. Khảo thí duyệt điểm chính thức, khóa sổ điểm và xuất file FAP       │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Các thuật ngữ quan trọng

| Thuật ngữ                     | Giải thích                                                            |
| ------------------------------- | ----------------------------------------------------------------------- |
| **Learning Outcome (LO)** | Chuẩn đầu ra - kiến thức/kỹ năng cần đánh giá                |
| **Topic**                 | Chủ đề - liên kết LO với chương giáo trình                    |
| **Rubric**                | Tiêu chí đánh giá - gồm các tiêu chí, mô tả, điểm tối đa, trọng số|
| **Exam Blueprint**        | Bản thiết kế - phân bổ số câu hỏi theo topic/difficulty         |
| **Exam Snapshot**         | Ảnh chụp đề - freeze rubric, knowledge, prompt versions bất biến       |
| **RAG**                   | Retrieval-Augmented Generation - truy xuất kiến thức giáo trình    |
| **Server-Side STT**       | Phiên âm giọng nói tập trung tại server bằng PhoWhisper Worker       |
| **Evidence**              | Bằng chứng - audio raw tải lên MinIO được bảo toàn toàn vẹn     |

---

## 8. Trạng thái các thực thể chính

### Exam Status

| Status        | Mô tả                                  |
| ------------- | ---------------------------------------- |
| `DRAFT`     | Bản nháp, chưa công bố              |
| `PUBLISHED` | Đã công bố, sinh viên có thể làm |
| `ARCHIVED`  | Đã lưu trữ                           |

### ExamSession Status

| Status              | Mô tả                    |
| ------------------- | -------------------------- |
| `DEVICE_CHECK`    | Đang kiểm tra thiết bị |
| `IN_PROGRESS`     | Đang làm bài            |
| `UPLOADING`       | Đang upload media         |
| `SUBMITTED`       | Đã nộp, chờ chấm      |
| `REVIEW_REQUIRED` | Cần giảng viên duyệt   |
| `COMPLETED`       | Hoàn thành               |

### QuestionAttempt Status

| Status         | Mô tả              |
| -------------- | -------------------- |
| `READY`      | Sẵn sàng trả lời |
| `RECORDING`  | Đang ghi âm        |
| `PROCESSING` | Đang xử lý STT/chấm điểm |
| `SUBMITTED`  | Đã nộp            |
| `GRADED`     | Đã chấm điểm    |

---

## 9. Đặc tả hiện tại

- Hỗ trợ thi vấn đáp tự động với Server-Side PhoWhisper và AI LLM Judge (Gemini/Ollama).
- Thin-Client Electron với RNNoise WASM AudioWorklet lọc tạp âm real-time 48 kHz.
- Upload phân mảnh 4MB có SHA-256 integrity checksum chống giả mạo bằng chứng.
- Snapshot bất biến đề thi, rubric và vector embedding khi công bố.

---

## 10. Tài liệu liên quan

| Tài liệu | Đường dẫn |
| :--- | :--- |
| User Guide | [user-guide.md](../user-guide.md) |
| Database Schema & ERD (3NF) | [database-schema.md](../architecture/database-schema.md) |
| Master Spec: Dual-Frontend | [2026-09-30-dual-frontend-architecture.md](../superpowers/specs/2026-09-30-dual-frontend-architecture.md) |
| Actor: Khảo thí | [02-actor-examiner.md](02-actor-examiner.md) |
| Actor: Giảng viên | [03-actor-teacher.md](03-actor-teacher.md) |
| Actor: Sinh viên | [04-actor-student.md](04-actor-student.md) |
| Actor: System Admin | [05-actor-system-admin.md](05-actor-system-admin.md) |
| Business Rules | [06-business-rules.md](06-business-rules.md) |
| Technical Constraints | [07-technical-constraints.md](07-technical-constraints.md) |
| Kho lưu trữ MVP cũ | [legacy-mvp](../archive/legacy-mvp/README.md) |

