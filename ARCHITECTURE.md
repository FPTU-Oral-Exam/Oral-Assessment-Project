# ARCHITECTURE.md — BẢN ĐỒ KIẾN TRÚC TOÀN DIỆN (SYSTEM ARCHITECTURE)

> **Dự án:** AI Oral Assessment Platform (Hệ thống Thi vấn đáp Tự động bằng AI)
> **Chủ sở hữu:** Nguyễn Văn Gia Bình & Nhóm NCKH / Đồ án Tốt nghiệp CNTT
> **Phiên bản kiến trúc:** 3.0 (Monorepo, Dual-Frontend, Server-Side STT & Hybrid AI Grading)
> **Trạng thái:** ACTIVE & EVERGREEN (Tài liệu sống — Cập nhật cùng các thay đổi kiến trúc lớn)

---

## 1. TỔNG QUAN HỆ THỐNG & TRIẾT LÝ THIẾT KẾ (SYSTEM OVERVIEW)

**AI Oral Assessment Platform** là nền tảng thi vấn đáp tự động ứng dụng Trí tuệ Nhân tạo, giải quyết bài toán tổ chức thi, coi thi và chấm điểm nói tiếng Anh (chuẩn ENTs Speaking 5 tiêu chí) và vấn đáp chuyên ngành quy mô lớn tại các cơ sở giáo dục đại học.

### 5 Nguyên tắc Bất biến trong Kiến trúc (Architectural Invariants):

1. **Server là Source of Truth:** Không bao giờ tin tưởng Client (Desktop/Web). Mọi logic về thời gian làm bài, điều phối câu hỏi, trạng thái phòng thi, tính toán điểm số và khóa kết quả 100% do Server kiểm soát.
2. **Server-side STT & Anti-Tampering (Bảo mật chống gian lận):** Student App là **Thin-Client**. Client tuyệt đối không chạy PhoWhisper local, không tạo transcript và không cho phép chỉnh sửa văn bản câu trả lời. File âm thanh/video nguyên bản được tải lên MinIO dạng phân mảnh (chunk 4MB kèm SHA-256). Toàn bộ quá trình phiên âm và chấm điểm diễn ra trên Server Worker.
3. **Chuẩn hóa 5 Vai trò (Actor-based RBAC):** Hệ thống phân quyền nghiêm ngặt theo 5 actor: `SYSTEM_ADMIN`, `ACADEMY`, `EXAMINER`, `TEACHER`, `STUDENT`.
4. **Exam Snapshot Versioning:** Khi đề thi chuyển sang trạng thái `PUBLISHED`, toàn bộ tài liệu RAG, cấu hình câu hỏi, Rubric và AI Prompts tại thời điểm đó phải được **đóng băng (Freeze)**. Mọi bài thi sau đó đều chấm theo Snapshot bất biến này.
5. **Strangler Fig Refactoring Pattern:** Phát triển song song và độc lập giữa `@oralai/shared`, `apps/student-app`, `apps/staff-portal` với backend, không phá vỡ tính liên tục của hệ thống.

---

## 2. LEVEL 1: SƠ ĐỒ BỐI CẢNH HỆ THỐNG (SYSTEM CONTEXT DIAGRAM)

Mô hình C4 Level 1 thể hiện ranh giới hệ thống đối với người dùng (Actors) và các hệ thống bên ngoài (External Systems):

```mermaid
C4Context
    title System Context Diagram - AI Oral Assessment Platform

    Person(student, "Sinh viên (STUDENT)", "Tham gia phòng thi, kiểm tra thiết bị mic/cam, ghi âm/hình câu trả lời.")
    Person(teacher, "Giảng viên (TEACHER)", "Coi thi trực tiếp, giám sát phòng thi, phúc khảo/chấm lại bài thi.")
    Person(examiner, "Cán bộ Khảo thí (EXAMINER)", "Quản lý ca thi, phân công coi thi, phê duyệt bảng điểm và khóa sổ.")
    Person(academy, "Học vụ (ACADEMY)", "Quản lý Ngân hàng câu hỏi, Ma trận đề thi, Dạng bài và Chuẩn Rubrics.")
    Person(admin, "Quản trị viên (SYSTEM_ADMIN)", "Quản trị tài khoản, cấu hình hệ thống AI, API Keys và Hạ tầng mạng.")

    System(oralai, "AI Oral Assessment Platform", "Hệ thống tổ chức thi, giám sát thi trực tuyến và chấm điểm vấn đáp tự động bằng AI.")

    System_Ext(google_oauth, "Google OAuth 2.0", "Xác thực danh tính đăng nhập bằng tài khoản sinh viên/cán bộ.")
    System_Ext(fap_system, "Hệ thống Quản lý Đào tạo (FAP)", "Import danh sách thí sinh và Export bảng điểm chính thức.")

    Rel(student, oralai, "Làm bài thi qua Desktop App", "HTTPS / WebSocket / Chunked Upload")
    Rel(teacher, oralai, "Giám sát & Chấm điểm qua Web", "HTTPS / Secure Cookie")
    Rel(examiner, oralai, "Điều hành ca thi & Khóa điểm", "HTTPS / Secure Cookie")
    Rel(academy, oralai, "Soạn đề & Cấu hình Rubrics", "HTTPS / Secure Cookie")
    Rel(admin, oralai, "Cấu hình AI & Quản trị User", "HTTPS / Secure Cookie")

    Rel(oralai, google_oauth, "Xác thực OpenID Connect", "OAuth2 / OIDC")
    Rel(oralai, fap_system, "Trao đổi danh sách & Điểm số", "Excel / CSV / REST Sync")
```

---

## 3. LEVEL 2: SƠ ĐỒ THÙNG CHỨA DỊCH VỤ (CONTAINERS DIAGRAM)

Mô hình C4 Level 2 bóc tách các phân hệ phần mềm và cơ sở hạ tầng vận hành:

```mermaid
graph TB
    subgraph Clients["TẦNG CLIENT (DUAL-FRONTEND)"]
        StudentApp["<b>apps/student-app</b><br/>(Electron 33 + Vite + React 18 + TS)<br/><i>Thin-Client: Ghi âm, Kiểm tra mic, Chống gian lận</i>"]
        StaffPortal["<b>apps/staff-portal</b><br/>(Next.js 15 App Router + React 19 + Tailwind)<br/><i>Web Portal: Academy, Examiner, Teacher, Admin</i>"]
    end

    subgraph Shared["THƯ VIỆN CHIA SẺ"]
        SharedPkg["<b>packages/shared</b> (@oralai/shared)<br/><i>Zod Schemas, Domain Types, ChunkedUploader</i>"]
    end

    subgraph BackendCluster["TẦNG DỊCH VỤ MÁY CHỦ (BACKEND CLUSTER)"]
        FastAPI["<b>services/api (Core REST API)</b><br/>FastAPI + Python 3.12 + SQLAlchemy + Pydantic v2<br/><i>Dual-Auth (Cookie & Bearer), RBAC Guards, Routers</i>"]
        Worker["<b>services/api (Background Worker)</b><br/>Celery + Redis Broker + CUDA/PyTorch<br/><i>PhoWhisper/Whisper STT, RAG pgvector, Hybrid Grading</i>"]
    end

    subgraph StorageCluster["TẦNG LƯU TRỮ VÀ DỮ LIỆU (PERSISTENCE)"]
        Postgres[("<b>PostgreSQL 16 + pgvector</b><br/>(Port: 5432)<br/><i>Lưu trữ quan hệ, vector embeddings 768 chiều</i>")]
        MinIO[("<b>MinIO Object Storage (S3)</b><br/>(Port: 9000/9001)<br/><i>Lưu Audio/Video bài thi, PDF giáo trình RAG</i>")]
        Redis[("<b>Redis 7 Cache & Queue</b><br/>(Port: 6379)<br/><i>Message broker cho Celery, Cache sessions</i>")]
    end

    StudentApp -->|Tải chunk 4MB, REST API| FastAPI
    StudentApp -->|Kiểm tra schema runtime| SharedPkg
    StaffPortal -->|RESTful APIs, Secure Cookie| FastAPI
    StaffPortal -->|Kiểm tra schema runtime| SharedPkg

    FastAPI -->|Enqueue Jobs chấm thi| Redis
    Redis -->|Consume Tasks| Worker
    FastAPI -->|Truy vấn dữ liệu| Postgres
    FastAPI -->|Presigned URLs| MinIO
    Worker -->|Đọc file audio/video| MinIO
    Worker -->|Ghi nhận kết quả chấm| Postgres
```

---

## 4. LEVEL 3: CÁC THÀNH PHẦN CỐT LÕI (COMPONENT ARCHITECTURE)

### 4.1. Cấu trúc Core API (`services/api/app/`)

* **`main.py`:** Khởi tạo FastAPI app, middleware (CORS, Request Tracing, Dual-Auth extractor), đăng ký Routers.
* **Tầng Routers chuẩn hóa theo Actor:**
  - `routes_auth.py`: Xác thực JWT, Cookie session, Google OAuth.
  - `routes_academy.py`: Quản trị Item Bank, Exam Matrix Blueprint, Question Types, Rubrics Studio.
  - `routes_examiner.py`: Học kỳ, Ca thi, Phân bổ thí sinh, Phê duyệt điểm, Khóa sổ.
  - `routes_teacher.py`: Lịch coi thi (`/teacher/schedule`), Phòng coi thi trực tiếp (`/teacher/proctor`), Phúc khảo (`/teacher/results/override`).
  - `routes_student.py`: Nhận đề thi, Kiểm tra trạng thái làm bài, Nộp bài thi.
  - `routes_admin.py`: Quản lý tài khoản, cấu hình tham số AI Models, Network.
* **`models.py` & `models_academy.py`:** SQLAlchemy ORM models, bảng quan hệ và Snapshot entities.
* **`schemas.py` & `schemas_academy.py`:** Pydantic v2 schemas phục vụ Serialization & Validation.

### 4.2. Cấu trúc AI Background Worker Pipeline

```mermaid
flowchart LR
    Task["Celery Task:<br/>process_exam_submission"] --> AudioFetch["1. MinIO Fetcher:<br/>Tải tệp âm thanh/video nguyên bản"]
    AudioFetch --> SignalProc["2. Acoustic Signal Analysis:<br/>Tính WPS, đếm số quãng nghỉ (Pauses), SNR"]
    AudioFetch --> STTPipeline["3. Server-side STT Engine:<br/>PhoWhisper (VN) / Whisper Large-v3 (EN)"]
    STTPipeline --> Transcript["Sinh Transcript Server-side"]
  
    Transcript --> HybridGrading["4. Hybrid AI Grading Engine"]
    SignalProc --> HybridGrading
  
    subgraph HybridEngine["Cơ chế Chấm điểm Lai ENTs 5 Tiêu chí"]
        direction TB
        AcousticRubric["Pronunciation & Fluency:<br/>Phân tích tín hiệu âm thanh + Token Logprobs"]
        LLMRubric["Ideas, Grammar, Vocabulary:<br/>Few-Shot Prompting + 4 Band Descriptors"]
    end
  
    HybridGrading --> HybridEngine
    HybridEngine --> FinalScore["5. Tổng hợp Điểm Thang 10 & Lưu DB Postgres"]
```

---

## 5. LUỒNG DỮ LIỆU TIÊU BIỂU (END-TO-END DATA FLOWS)

### 5.1. Luồng Sinh viên Làm bài thi & Nộp bài Chống gian lận (Anti-Tampering Flow)

```mermaid
sequenceDiagram
    autonumber
    actor Student as Sinh viên (Student App)
    participant API as FastAPI Backend
    participant MinIO as MinIO Object Storage
    participant Queue as Redis / Celery Worker
    participant DB as PostgreSQL 16

    Student->>API: POST /api/v1/student/exam-sessions/start (Kèm Token)
    API->>DB: Kiểm tra Ca thi & Lấy Snapshot Đề thi (Frozen)
    DB-->>API: Trả về Danh sách Câu hỏi
    API-->>Student: Giao diện câu hỏi, thời gian đếm ngược

    loop Từng câu hỏi
        Student->>Student: Ghi âm raw audio qua MediaRecorder
        Student->>API: POST /api/v1/student/upload/init (Metadata + SHA256)
        API-->>Student: Presigned Chunk Upload URLs
        Student->>MinIO: Tải từng chunk 4MB đa luồng
        Student->>API: POST /api/v1/student/upload/complete (Ghép chunk)
    end

    Student->>API: POST /api/v1/student/exam-sessions/submit
    API->>DB: Cập nhật trạng thái session = SUBMITTED
    API->>Queue: Push Task: process_exam_submission(session_id)
    API-->>Student: Xác nhận nộp bài thành công
```

---

## 6. BẢNG ÁNH XẠ HẠ TẦNG & CỔNG MẠNG (INFRASTRUCTURE & PORT MAPPING)

| Dịch vụ Container    | Image / Công nghệ      | Cổng Host (External)              | Cổng Nội bộ     | Mục đích vận hành                              |
| :--------------------- | :----------------------- | :--------------------------------- | :----------------- | :-------------------------------------------------- |
| **`web`**      | Node 20 / Next.js 15     | `3000`                           | `3000`           | Staff Portal (Giao diện Quản trị & Giảng viên) |
| **`api`**      | Python 3.12 / FastAPI    | `8000`                           | `8000`           | Core REST API Server                                |
| **`worker`**   | Celery / PyTorch         | —                                 | —                 | Xử lý hàng đợi STT & Chấm điểm tự động   |
| **`postgres`** | PostgreSQL 16 + pgvector | `5432`                           | `5432`           | Cơ sở dữ liệu quan hệ & Vector Database        |
| **`redis`**    | Redis 7 Alpine           | `6379`                           | `6379`           | Message Broker & Caching                            |
| **`minio`**    | MinIO RELEASE            | `9000` (API), `9001` (Console) | `9000`, `9001` | S3 Object Storage (Media & PDFs)                    |

---

## 7. CẤU TRÚC THƯ MỤC NGUỒN (MONOREPO DIRECTORY MAP)

```
AI-Oral-Assessment-Platform/
├── ARCHITECTURE.md                 # Tài liệu này (Living Architecture)
├── AGENTS.md / GEMINI.md           # Quy tắc phát triển & Context Handover cho AI
├── docker-compose.yml              # Khởi tạo cụm 6 Containers chính
├── packages/
│   └── shared/                     # @oralai/shared: Domain types, Zod schemas, ChunkedUploader
├── apps/
│   ├── student-app/                # Desktop Client (Electron + Vite + React 18)
│   └── staff-portal/               # Web Portal (Next.js 15 App Router)
├── services/
│   └── api/                        # FastAPI Backend & Celery Worker
│       ├── app/                    # Mã nguồn backend (routes, models, schemas, worker)
│       └── tests/                  # Bộ Pytest kiểm thử backend
└── docs/                           # Hệ sinh thái tài liệu kỹ thuật chuẩn công nghiệp
    ├── README.md                   # Bảng mục lục điều hướng toàn diện (Map of Content)
    ├── adr/                        # Architecture Decision Records (Append-only)
    ├── api/                        # Đặc tả REST API chuẩn hóa theo Actor
    ├── specs/                      # Đặc tả thiết kế tính năng (Technical Specs/RFCs)
    ├── runbooks/                   # Hướng dẫn vận hành, kiểm thử & kịch bản demo
    ├── research/                   # Nghiên cứu khoa học, cơ sở lý thuyết, bài báo
    ├── diagrams/                   # Sơ đồ Draw.io & Activity flowcharts
    └── archive/                    # Tài liệu lịch sử, ghi chú bàn giao cũ
```
