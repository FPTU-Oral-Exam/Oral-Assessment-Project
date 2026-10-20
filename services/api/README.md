# Services API — `services/api/app/`

## Tổng quan

Backend FastAPI cho **AI Oral Assessment Platform** (Hệ thống Thi vấn đáp Tự động bằng AI). Server chịu trách nhiệm quản lý tất cả logic nghiệp vụ: xác thực, quản lý kỳ thi, chấm điểm AI, và lưu trữ bằng chứng audio.

---

## Cấu trúc thư mục

```
services/api/app/
├── main.py                        # 🎯 FastAPI app entry point, route registration
├── config.py                      # ⚙️  Settings từ .env (SQLite/S3/Redis/AI providers)
├── db.py                          # 🗄️  SQLAlchemy engine, SessionLocal, Base
├── models.py                      # 📋  Tất cả ORM models
├── security.py                    # 🔐  Auth: JWT, argon2 password, role guards
│
├── schemas.py                     # 📝  Pydantic schemas (shared)
├── schemas_academy.py             # 📝  Academy: Question Bank, Matrices, Rubrics
├── schemas_examiner.py            # 📝  Examiner: Semesters, Batches, Results
│
├── routes_exam.py                 # 👤 Student: thi, upload audio, xem điểm
├── routes_examiner.py             # 🧑‍⚖️ Examiner: quản lý ca thi, kết quả, xuất FAP
├── routes_admin.py                # 🏛️  Admin: courses, rubrics, exams, user management
├── routes_academy.py              # 🎓 Academy: ngân hàng câu hỏi ENTs Speaking, ma trận đề
├── routes_demo_grading.py         # 🧪  Demo grading endpoints
│
├── stt.py                        # 🎤  Speech-to-text endpoint
├── speech.py                      # 🎙️  STT providers (Whisper/GCP/Gemini)
│
├── ai.py                          # 🤖  AI adapter: embedding, RAG retrieval, LLM grading
├── grading.py                     # 📊  Grading availability & review logic
├── worker.py                      # ⚙️  Background worker: transcribe → grade → finalize
│
├── fluency.py                    # 🗣️  Fluency metrics (speech rate, pauses)
├── pronunciation_wer.py          # 🔊  Pronunciation WER scoring
├── metrics.py                    # 📈  Grading metrics aggregation
│
├── storage.py                    # 💾  Local filesystem hoặc S3/MinIO storage
├── audio_processing.py           # 🔧  Audio preprocessing (RNNoise, format conversion)
│
├── knowledge.py                  # 📚  RAG: chunk scope, topic mappings
├── documents.py                   # 📄  Document processing pipeline
├── reindex.py                    # 🔍  Elasticsearch reindex
│
├── runtime_settings.py           # 🌍  Runtime config (AI provider, public origin)
├── google_credentials.py         # 🔑  Google service account credentials
├── google_login.py               # 🚪  Google OAuth login flow
│
├── bootstrap.py                  # 🚀  Bootstrap admin account
├── seed_demo.py                  # 🎭  Demo accounts seeding
├── seed_demo_data.py             # 🎭  Demo courses/exams seeding
│
├── course_deletion.py            # 🗑️  Safe course deletion cascade
├── retakes.py                    # 🔄  Retake policy & allowance logic
├── practice.py                   # 🏋️  Practice session course ID
│
└── migrations/
    └── rbac_migration_v2_to_standard_roles.py
```

---

## 1. Core — `main.py`, `config.py`, `db.py`, `models.py`, `security.py`

| File | Mô tả |
|------|--------|
| `main.py` | FastAPI app, CORS middleware, error handlers, lifespan, route registration |
| `config.py` | Pydantic `Settings` từ `.env` (DB, JWT, S3, Redis, AI provider, STT...) |
| `db.py` | SQLAlchemy `create_engine`, `SessionLocal`, `Base`, `get_db()` dependency |
| `models.py` | ~30 ORM models: `User`, `Course`, `Exam`, `ExamSession`, `Attempt`, `Upload`, `Audit`, `Rubric`, `AcademicQuestion`, `AcademicMatrix`, `Semester`, `Section`, `ScheduleSlot`, `ExamVariant`, `CourseCandidate`, `ExamBatch`, v.v. |
| `security.py` | JWT token, argon2 hashing, `current_user`, role guards (`staff`, `academy`, `examiner`, `admin`), `course_access()` |

### Auth flow
```
POST /auth/login → verify argon2 → issue_tokens() → JWT (access) + refresh token (DB session)
GET  /auth/me    → current_user dependency
POST /auth/refresh → validate refresh token → issue new JWT
POST /auth/logout → revoke session
```

### Role guards (authorization)
```python
staff    = roles("SYSTEM_ADMIN", "ADMIN", "EXAMINER", "REVIEWER", "TEACHER", "ACADEMY")
academy  = roles("SYSTEM_ADMIN", "ADMIN", "ACADEMY")
examiner = roles("SYSTEM_ADMIN", "ADMIN", "EXAMINER", "REVIEWER")
admin    = roles("SYSTEM_ADMIN", "ADMIN")
```

---

## 2. API Routes

### `routes_exam.py` — Student Endpoints (path: `/exams/*`, `/exam-sessions/*`)
> Prefix: root (không prefix)

| Endpoint | Method | Mô tả |
|----------|--------|--------|
| `/exams/available` | GET | Danh sách kỳ thi SV được giao |
| `/exam-sessions` | POST | Tạo phiên thi, lấy câu hỏi |
| `/exam-sessions/{key}` | GET | Trạng thái phiên thi |
| `/exam-sessions/{key}/start` | POST | Bắt đầu thi |
| `/exam-sessions/{key}/finish` | POST | Nộp bài, trigger worker chấm điểm |
| `/question-attempts/{key}/start` | POST | Bắt đầu câu hỏi |
| `/question-attempts/{key}/submit` | POST | Nộp transcript |
| `/question-attempts/{key}/submit-audio` | POST | Nộp audio (server STT) |
| `/uploads/init` | POST | Khởi tạo upload chunked |
| `/uploads/{key}/chunks/{index}` | PUT | Upload 1 chunk (4MB) |
| `/uploads/{key}/complete` | POST | Hoàn tất upload, verify checksum |
| `/evidence/{key}/content` | GET | Stream audio evidence (Range request) |
| `/student/results` | GET | Lịch sử kết quả |
| `/student/results/{session_id}` | GET | Chi tiết 1 kết quả |

### `routes_examiner.py` — Examiner Portal (prefix: `/examiner/*`)

| Endpoint | Method | Mô tả |
|----------|--------|--------|
| `/examiner/semesters` | GET/POST | Danh sách / tạo học kỳ |
| `/examiner/semesters/{id}` | GET | Chi tiết học kỳ (courses, candidates) |
| `/examiner/semesters/{id}/activate/complete` | POST | Kích hoạt / hoàn thành học kỳ |
| `/examiner/semesters/{id}/courses` | GET/POST | Courses trong học kỳ |
| `/examiner/courses` | GET | Tất cả courses |
| `/examiner/courses/{id}` | GET/PUT | Chi tiết / cập nhật course |
| `/examiner/courses/{id}/sections` | GET/POST | Quản lý lớp học |
| `/examiner/courses/{id}/exams` | GET/POST | Exams của course |
| `/examiner/exams` | GET | Tất cả exams |
| `/examiner/exams/{id}` | GET/PUT | Chi tiết / cập nhật exam |
| `/examiner/exams/{id}/publish` | POST | Công bố exam |
| `/examiner/exams/{id}/slots` | GET/POST | Ca thi (schedule slots) |
| `/examiner/exams/{id}/generate-variants` | POST | ATA: sinh mã đề tự động |
| `/examiner/exams/{id}/batches` | GET/POST | Tạo batch + phân bổ thí sinh |
| `/examiner/enrollments/import` | POST | Import SV từ Excel |
| `/examiner/results/overview` | GET | Tổng quan kết quả (1 query, no N+1) |
| `/examiner/slots/{id}/results` | GET | Kết quả 1 ca thi |
| `/examiner/slots/{id}/export` | GET | Export FAP Excel |
| `/examiner/courses/{id}/candidates` | GET | Danh sách thí sinh |
| `/examiner/courses/{id}/candidates/import` | POST | Import thí sinh từ Excel |

### `routes_admin.py` — Admin Management (prefix: `/admin/*`)

| Endpoint | Method | Mô tả |
|----------|--------|--------|
| `/admin/dashboard` | GET | KPI dashboard |
| `/admin/users` | GET/POST | User management |
| `/admin/courses` | GET/POST | CRUD courses |
| `/admin/courses/{id}/workspace` | GET | Full workspace (LOs, topics, rubrics, exams) |
| `/admin/courses/{id}/outcomes` | POST | Tạo Learning Outcomes |
| `/admin/courses/{id}/topics` | POST | Tạo Topics |
| `/admin/courses/{id}/documents` | POST | Upload tài liệu (PDF/PPTX/DOCX) |
| `/admin/courses/{id}/rubrics` | POST | Tạo Rubric |
| `/admin/courses/{id}/items` | GET/POST | Ngân hàng câu hỏi |
| `/admin/courses/{id}/items/import-excel` | POST | Import câu hỏi từ Excel |
| `/admin/courses/{id}/items/export-template` | GET | Template Excel import |
| `/admin/exams` | POST | Tạo exam |
| `/admin/exams/{key}/publish` | POST | Lắp ráp đề từ Item Bank + publish |
| `/admin/exams/{key}/copy` | POST | Clone exam |
| `/admin/results` | GET | Tất cả kết quả thi |
| `/admin/results/{key}` | GET | Chi tiết 1 phiên thi (attempts, reviews) |
| `/admin/results/{key}/approve` | POST | Duyệt kết quả |
| `/admin/results/{key}/retake` | POST | Cấp lượt thi lại |
| `/admin/results/{key}/delete` | DELETE | Xóa phiên thi |
| `/admin/attempts/{key}/grade-review` | POST | Yêu cầu chấm lại (AI khác) |
| `/admin/attempts/{key}/google-review` | POST | Chấm lại với Google STT |
| `/admin/attempts/{key}/gemini-review` | POST | Chấm lại với Gemini |
| `/admin/attempts/{key}/regrade-transcript` | POST | Sửa transcript + chấm lại |
| `/admin/attempts/{key}/override` | POST | Override điểm thủ công |
| `/admin/attempts/{key}/request-re-eval` | POST | Yêu cầu re-evaluation (2 giảng viên) |
| `/admin/re-evaluations` | GET | Danh sách re-evaluations |
| `/admin/re-evaluations/{key}/submit` | POST | Submit điểm re-evaluation |
| `/admin/courses/{id}/students` | GET/POST | Gán/hủy sinh viên vào course |

### `routes_academy.py` — Ban Học thuật (prefix: `/academy/*`)

| Endpoint | Method | Mô tả |
|----------|--------|--------|
| `/academy/questions` | GET/POST | Ngân hàng câu hỏi ENTs Speaking (GENERAL_INTERVIEW, PICTURE_DESCRIPTION, TOPIC_MONOLOGUE, DEEP_DISCUSSION) |
| `/academy/questions/{key}` | GET/PUT/DELETE | CRUD câu hỏi |
| `/academy/questions/{key}/approve` | POST | Duyệt câu hỏi |
| `/academy/matrices` | GET/POST | Ma trận đề thi (Exam Blueprint) |
| `/academy/matrices/{key}` | GET/PUT/DELETE | CRUD ma trận |
| `/academy/matrices/{key}/stock-health` | GET | Kiểm tra tồn kho câu hỏi (HEALTHY/WARNING/CRITICAL) |
| `/academy/matrices/{key}/generate-sample` | POST | Generate sample exam từ ma trận |
| `/academy/rubrics` | GET/POST | Rubrics Studio (Thang điểm 10.0, 5 tiêu chí) |
| `/academy/rubrics/{key}` | GET/PUT/DELETE | CRUD Rubrics |
| `/academy/question-types` | GET | 4 dạng bài mặc định (GENERAL_INTERVIEW, PICTURE_DESCRIPTION, TOPIC_MONOLOGUE, DEEP_DISCUSSION) |
| `/academy/question-types/{type}` | GET/PUT | Xem / cập nhật cấu hình dạng bài |

---

## 3. AI Services

### `ai.py` — AI Adapter
- **`embed(text, task)`**: Tạo vector embedding (demo hash / Ollama / Gemini)
- **`retrieve(db, course_id, topic_id, query)`**: RAG retrieval, trả về top-k chunks
- **`structured(instruction, data, schema)`**: Gọi LLM với structured output (Pydantic schema)
- **`grade(question, transcript, criteria, chunks, stt_confidence)`**: Chấm điểm với LLM, bound rubric 5 tiêu chí

### `grading.py`
- **`check_config(exam)`**: Đảm bảo exam snapshot khớp AI config hiện tại
- **`assessment_view(assessment, exam)`**: Normalize legacy results
- **`review_question(source, target, attempt)`**: Validate re-grading compatibility

### `worker.py` — Background Worker
```
tick() loop:
  1. Cleanup stale uploads (MediaCleanup)
  2. Process pending ReviewJob (transcription regrade / AI regrade)
  3. Process PENDING documents (PDF → chunks → embeddings)
  4. Process SUBMITTED attempts:
     a. transcribe_attempt_if_needed() — Whisper server-side STT
     b. grade_answer() — enhanced ENTs metrics pipeline
     c. finalize() — compute final_score, set status
```

### `grade_answer()` pipeline (ENTs Speaking Assessment)
1. **Fluency analysis** — speech rate (WPS), pause count, pause ratio, filled pauses từ word timestamps
2. **Pronunciation WER & Acoustic Confidence** — phân tích độ tin cậy âm học Whisper & WER từ reference/prompt
3. **5 Criteria Rubric Evaluation** — chấm 5 tiêu chí thang điểm 10.0 (*Ideas*, *Pronunciation*, *Grammar*, *Vocabulary*, *Fluency* mỗi tiêu chí 2.0đ)
4. **Band Descriptors Injection** — tiêm 4 Band Descriptors (*Exceeds standard*, *Meets standard*, *Attempt made*, *Insufficient evidence*) vào LLM prompt
5. **Acoustic-LLM Hybrid Calibration** — dung hợp chỉ số âm học thực tế hiệu chuẩn điểm phát âm & trôi chảy

---

## 4. ENTs Scoring & Acoustic Metrics

| File | Mô tả |
|------|--------|
| `fluency.py` | Speech rate (WPS), pause count, pause ratio, filled pauses |
| `pronunciation_wer.py` | Word Error Rate & acoustic alignment từ reference text |
| `metrics.py` | `aggregate_grading_metrics()` — kết hợp fluency + pronunciation WER |

---

## 5. Storage & Audio

### `storage.py`
- Backend: **Local filesystem** (default) hoặc **S3/MinIO**
- Operations: `put(key, data)`, `get(key)`, `delete(key)`, `open_stream(key)`

### `audio_processing.py`
- `prepare_audio(input_path, output_path, preprocessing)`
- Preprocessing: RNNoise denoising nếu config `denoise`
- Output luôn là WAV 16kHz mono

### `speech.py` — STT Providers
| Provider | Hàm | Ghi chú |
|---------|-----|---------|
| `local_server` | `whisper()` | Faster-Whisper Large-v3, GPU/CPU, word timestamps |
| `google` | `google_transcribe()` | GCP Speech-to-Text, service account |
| `gemini` | `gemini_transcribe()` | Gemini 2.5 Flash, server-side |

---

## 7. Supporting Services

| File | Mô tả |
|------|--------|
| `knowledge.py` | RAG chunk scope, topic→LO→document mappings |
| `documents.py` | PDF/DOCX/PPTX → text → chunks → embeddings |
| `runtime_settings.py` | Runtime config overrides (AI provider, public origin) |
| `google_credentials.py` | Upload/validate/load Google service account JSON |
| `google_login.py` | Google OAuth PKCE login flow |
| `bootstrap.py` | Tạo admin account từ env `BOOTSTRAP_ADMIN`/`BOOTSTRAP_PASSWORD` |
| `seed_demo.py` | Seed 5 tài khoản demo (admin/academy/examiner/teacher/student) |
| `course_deletion.py` | Safe cascade delete (lưu audit log) |
| `retakes.py` | Retake allowance logic per student/exam |
| `practice.py` | `COURSE_ID = "ORAL-PRACTICE"` — practice session detection |

---

## 8. Database Schema Models (models.py)

### Core Entities
- **`User`** — id, username, email, google_sub, name, password_hash, role, status
- **`Course`** — id, code, name, credits, owner_id, teacher_id, semester_id
- **`CourseEnrollment`** — course_id + student_id (unique)
- **`LearningOutcome`** — course_id + code (unique)
- **`Topic`** — course_id, learning_outcome_id, name, description
- **`Document`** — course_id, kind (TEXTBOOK/SUPPLEMENT), storage_key, embedding_model
- **`Chunk`** — document_id, course_id, topic_id, content, embedding (Vector 768)

### Exam Entities
- **`Exam`** — course_id, rubric_id, name, blueprint, snapshot (frozen), status
- **`ExamSession`** — exam_id, student_id, status (DEVICE_CHECK/IN_PROGRESS/SUBMITTED/COMPLETED)
- **`Attempt`** — session_id, sequence, question (JSON), transcript, stt_confidence, assessment (JSON)
- **`Upload`** — attempt_id, kind, mime_type, size, sha256, total_chunks, storage_key

### Academy Entities
- **`AcademicQuestion`** — code, skill, type (RA/RS/GD/DI/SI/RL), prompt, media_url, audio_script, difficulty, status, tags, key_points
- **`AcademicMatrix`** — code, name, rubric_id, rules, difficulty_ratio
- **`QuestionTypeConfigModel`** — type, name, default_prep_time, default_response_time, max_score

### Examiner Entities
- **`Semester`** — name, year, term (SPRING/SUMMER/FALL), status
- **`Section`** — course_id, semester_id, name, code, teacher_id, day_of_week, time_slot
- **`ScheduleSlot`** — exam_id, batch_id, slot_number, date, start/end_time, room, exam_variant_id
- **`ExamVariant`** — exam_id, name, questions (JSON array), status
- **`CourseCandidate`** — course_id, student_id, roll_number, eligibility_status, allocation_status, assigned_slot_id
- **`ExamBatch`** — exam_id, name, date, rooms, max_students, assigned_teacher_id
- **`ReEvaluation`** — attempt_id, teacher_id_1, teacher_id_2, reason, score_1, score_2, final_score, blind_marking

---

## 9. Chạy Server

```bash
# Development
cd services/api
uvicorn app.main:app --reload --port 8000

# Production
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4

# Worker (chạy song song)
python -m app.worker
```

### Environment Variables (`.env`)
```env
DATABASE_URL=sqlite:///./.data/app.db
JWT_SECRET=<min-32-chars>
ACCESS_MINUTES=15
REFRESH_DAYS=7
STORAGE_BACKEND=local        # hoặc s3
S3_ENDPOINT=http://minio:9000
S3_ACCESS_KEY=
S3_SECRET_KEY=
S3_BUCKET=oral-assessment
REDIS_URL=                    # optional, cho login rate limit
AI_PROVIDER=demo              # demo | gemini | local
GEMINI_API_KEY=               # khi AI_PROVIDER=gemini
GEMINI_TIMEOUT=180
LLM_MODEL=gemini-2.5-flash
STT_PROVIDER=local_server     # local_server | google | gemini
STT_MODEL=large-v3
BOOTSTRAP_ADMIN=admin
BOOTSTRAP_PASSWORD=Admin@123456
```

---

## 10. Security Invariants

1. **Server là Source of Truth** — thời gian, câu hỏi, điểm số do server kiểm soát 100%
2. **Student App là Thin Client** — không chạy Whisper local, không sinh transcript
3. **Audio evidence chunked 4MB** — upload trực tiếp lên MinIO, server tự transcribe
4. **JWT tokens** — access token (15 phút) + refresh token (7 ngày, lưu trong DB)
5. **Role guards** — mọi endpoint đều có `Depends()` authorization check
6. **Exam Snapshot Versioning** — đề PUBLISHED đóng băng rubric, AI config, và questions

---

## 11. Dependencies

```
fastapi
uvicorn
sqlalchemy
pydantic / pydantic-settings
argon2-cffi          # password hashing
python-jose          # JWT
pyjwt
httpx                # Ollama / Gemini API calls
faster-whisper       # Server-side STT
ctranslate2
pgvector             # PostgreSQL vector search (optional)
psycopg2 / psycopg2-binary  # PostgreSQL
pypdf2 / python-docx / python-pptx  # Document processing
openpyxl            # Excel import/export
boto3               # S3/MinIO
redis                # Optional rate limiting
google-api-python-client  # GCP STT
```
