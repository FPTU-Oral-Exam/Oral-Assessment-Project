# Backend Refactoring Plan — AI Oral Assessment Platform

## Context

Backend FastAPI tại `services/api/app/` có **44 files Python** trong một directory phẳng, với 4 route files khổng lồ (lên đến **1934 dòng**). Toàn bộ business logic nằm trong routes — không có service layer, không có centralized error handling, có nhiều code duplication, và schemas/models cũng nằm chung một file.

**Điều cần giữ nguyên:**
- Tất cả 33 test files hiện tại
- Tất cả ~120 endpoints hiện tại (path, method, behavior)
- Cơ chế auth (JWT, role guards)
- Background worker (worker.py)
- PTE scoring engines (6 engines)
- AI providers (demo/gemini/local)
- Database models (35 models)

**Vấn đề chính cần giải quyết:**
1. File quá lớn → khó maintain, khó review
2. Không có service layer → business logic rải rác trong routes
3. Code duplication → `data()`, rubric validation, PTE scoring pattern, Excel import
4. Không có centralized error handling → mỗi route tự `fail()`
5. Không có structured logging
6. Schemas và models gom chung 1 file

---

## Target Structure

```
services/api/app/
├── main.py                         # Giữ nguyên (cập nhật imports)
├── config.py                       # Giữ nguyên
├── db.py                          # Giữ nguyên
│
├── core/                          # 🆕 Infrastructure layer
│   ├── __init__.py
│   ├── deps.py                    # 🆕 Tất cả FastAPI dependencies
│   ├── exceptions.py               # 🆕 Custom exceptions
│   ├── logging_.py                # 🆕 Structured logging + request_id
│   └── utils.py                   # 🆕 data(), fail(), by_id() (trích từ security.py)
│
├── schemas/                       # 🆕 Schemas theo domain
│   ├── __init__.py
│   ├── base.py                    # Base Input/Output
│   ├── auth.py                    # Login, Token
│   ├── exam.py                    # Session, Attempt, Upload, Retake
│   ├── admin.py                   # Course, Topic, LO, Item Bank
│   ├── examiner.py                # Semester, Section, Slot, Batch, Candidate
│   ├── academy.py                 # AcademicQuestion, Matrix, Rubric
│   └── common.py                  # Criterion, RubricIn, Blueprint (shared)
│
├── models/                        # 🆕 Models theo domain
│   ├── __init__.py
│   ├── base.py                    # Entity mixin, uid(), Base
│   ├── user.py                    # User, AuthSession, Audit
│   ├── course.py                  # Course, CourseEnrollment
│   ├── content.py                 # Document, Chunk, Topic, LO
│   ├── exam.py                    # Exam, Assignment, ExamSession, Attempt
│   ├── examiner.py                # Semester, Section, ScheduleSlot, ExamVariant, Batch...
│   ├── academy.py                 # AcademicQuestion, AcademicMatrix, QuestionTypeConfig
│   ├── storage.py                 # Upload, MediaCleanup
│   └── review.py                  # ReviewJob, ReEvaluation
│
├── api/                           # 🆕 Routes theo domain
│   ├── __init__.py
│   ├── admin/
│   │   ├── __init__.py            # Router aggregation
│   │   ├── users.py               # User CRUD
│   │   ├── courses.py             # Course CRUD, archive, restore
│   │   ├── outcomes.py            # Learning Outcomes
│   │   ├── topics.py              # Topics
│   │   ├── items.py               # Question Bank CRUD, import/export
│   │   ├── rubrics.py            # Rubric CRUD
│   │   ├── exams.py              # Exam CRUD, publish, copy, assign
│   │   ├── results.py             # Results, grading reviews
│   │   └── reeval.py              # Re-evaluation
│   ├── examiner/
│   │   ├── __init__.py
│   │   ├── semesters.py           # Semester CRUD
│   │   ├── courses.py             # Course management in semester
│   │   ├── sections.py            # Section CRUD
│   │   ├── enrollments.py         # Enrollment import
│   │   ├── batches.py             # Batch + auto-allocate
│   │   ├── slots.py               # Schedule slots
│   │   ├── variants.py            # ATA + variant generation
│   │   ├── candidates.py          # Candidate pool
│   │   └── results.py             # FAP export, overview
│   ├── academy/
│   │   ├── __init__.py
│   │   ├── questions.py           # Academic questions
│   │   ├── matrices.py            # Exam matrices + stock health
│   │   └── rubrics.py            # Academy rubrics
│   ├── exam/
│   │   ├── __init__.py
│   │   ├── sessions.py            # Session lifecycle
│   │   ├── attempts.py            # Attempt state machine
│   │   └── uploads.py             # Chunked upload + evidence
│   ├── speech.py                  # Speech settings
│   ├── stt.py                    # STT endpoint
│   └── demo_grading.py            # Demo grading (giữ nguyên)
│
├── services/                      # 🆕 Business logic layer
│   ├── __init__.py
│   ├── course_service.py          # Course CRUD + workspace
│   ├── exam_service.py            # Exam assembly + publish + ATA
│   ├── grading_service.py         # Grading orchestration
│   ├── speech_service.py          # Speech/STT processing
│   ├── allocation_service.py       # Slot auto-allocation
│   ├── storage_service.py         # Chunked uploads, file assembly
│   └── pte_scoring.py            # 🆕 BasePTEScorer class
│
├── scoring/                      # PTE Engines (cập nhật dùng BasePTEScorer)
│   ├── __init__.py
│   ├── read_aloud.py
│   ├── repeat_sentence.py
│   ├── describe_image.py
│   ├── retell_lecture.py
│   ├── answer_short_question.py
│   └── group_discussion.py
│
├── workers/                      # 🆕 Workers
│   ├── __init__.py
│   ├── processor.py               # tick() loop (từ worker.py)
│   ├── grading_worker.py          # Grade attempt task
│   └── document_worker.py         # Document processing
│
├── utils/                        # 🆕 Shared utilities
│   ├── __init__.py
│   ├── excel.py                  # Excel import/export base class
│   ├── rubric_validator.py        # Rubric weight validation (duplicated → consolidate)
│   └── demo_mode.py               # Demo mode checks (scattered → consolidate)
│
├── ai/                           # 🆕 AI abstraction
│   ├── __init__.py
│   ├── embedding.py
│   ├── retrieval.py
│   └── grading_prompt.py
│
└── [giữ nguyên tại chỗ]:
    ├── seed_demo.py
    ├── seed_demo_data.py
    ├── bootstrap.py
    ├── practice.py
    ├── knowledge.py
    ├── documents.py
    ├── retakes.py
    ├── course_deletion.py
    ├── fluency.py
    ├── pronunciation_wer.py
    ├── metrics.py
    ├── grading_free_response.py
    ├── grading_types.py
    ├── grading.py
    ├── runtime_settings.py
    ├── google_credentials.py
    ├── google_login.py
    ├── storage.py
    ├── audio_processing.py
    ├── reindex.py
    ├── worker.py                  # Giữ nguyên → workers/processor.py dùng thay thế
    └── static/
```

---

## Phases

### Phase 0: Foundation (2-3 ngày)

**Mục tiêu:** Tạo package structure mới, không phá vỡ gì.

**0.1 — Tạo thư mục + `__init__.py`**
- Tạo tất cả thư mục mới: `core/`, `schemas/`, `models/`, `api/`, `services/`, `scoring/`, `workers/`, `utils/`, `ai/`
- Tạo `__init__.py` cho mỗi package

**0.2 — `core/deps.py`** — Trích all dependencies
```python
# Từ security.py, db.py hiện có → đưa vào deps.py
DbSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(current_user)]
StaffUser = Annotated[User, Depends(staff)]
AcademyUser = Annotated[User, Depends(academy)]
AdminUser = Annotated[User, Depends(admin)]
ExaminerUser = Annotated[User, Depends(examiner)]
EditorUser = Annotated[User, Depends(editor)]
StudentUser = Annotated[User, Depends(student)]
```

**0.3 — `core/exceptions.py`** — Custom exceptions
```python
class AppException(HTTPException):
    def __init__(self, code, message, status=400, details=None)

class NotFoundError(AppException):
    def __init__(self, resource, key)

class ConflictError(AppException):
    def __init__(self, code, message)

class ForbiddenError(AppException):
    def __init__(self, message)

class ValidationError(AppException):
    def __init__(self, message)
```

**0.4 — `core/utils.py`** — Trích `data()`, `fail()`, `by_id()` từ `security.py`

**0.5 — `core/logging_.py`** — Structured logging + RequestID middleware

**0.6 — Cập nhật `app/__init__.py`** — Re-export tất cả public APIs để backward compatibility

**Verification:**
```bash
pytest tests/ -v --tb=short
python -c "from app.core.deps import CurrentUser, DbSession"
python -c "from app.core.exceptions import NotFoundError"
```

---

### Phase 1: Schemas + Models (3-4 ngày)

**Mục tiêu:** Tổ chức schemas và models thành packages.

**1.1 — Split `schemas.py` → `schemas/`**
| New File | Content |
|----------|---------|
| `schemas/base.py` | Base `Input`, ConfigDict defaults |
| `schemas/auth.py` | Login, UserIn |
| `schemas/exam.py` | SessionIn, TranscriptIn, SubmitAudioIn, UploadIn, AttemptPolicyIn, RetakeIn |
| `schemas/admin.py` | CourseIn, LOIn, TopicIn, QuestionBankItemIn, QuestionBankItemImportIn |
| `schemas/examiner.py` | SemesterIn, SectionIn, SlotIn, BatchCreateIn, CandidateImport... |
| `schemas/academy.py` | AcademicQuestionIn, AcademicMatrixIn, AcademicMatrixUpdate... |
| `schemas/common.py` | Criterion, RubricIn, Blueprint, SpeechPolicy, RoleIn |

- Consolidate: `SemesterIn` từ `schemas_examiner.py` + `schemas.py` → 1 định nghĩa trong `schemas/examiner.py`
- Consolidate: `RubricIn` validator → giữ trong schema, xóa duplicate ở routes
- Consolidate: `CourseIn` duplicate → chỉ giữ 1 version trong `schemas/admin.py`
- Tạo `schemas/__init__.py` re-export tất cả

**1.2 — Split `models.py` → `models/`**
| New File | Models |
|----------|--------|
| `models/base.py` | Entity mixin, uid(), Base |
| `models/user.py` | User, AuthSession, Audit |
| `models/course.py` | Course, CourseEnrollment |
| `models/content.py` | Document, Chunk, Topic, LearningOutcome, BookSection |
| `models/exam.py` | Exam, Assignment, ExamSession, Attempt, Upload, MediaCleanup, ReviewJob |
| `models/examiner.py` | Semester, Section, ScheduleSlot, ExamVariant, ExamBatch, CourseCandidate, ExamEnrollment, SlotAssignment, QuestionItem |
| `models/academy.py` | AcademicQuestion, AcademicMatrix, QuestionTypeConfigModel |
| `models/review.py` | ReEvaluation |

- Tạo `models/__init__.py` re-export tất cả 35 models
- Tất cả model giữ nguyên cấu trúc, chỉ di chuyển file

**1.3 — Cập nhật imports trong routes**
- Tất cả `from . import schemas as s` → `from app.schemas import ...`
- Tất cả `from .models import ...` → `from app.models import ...`
- `main.py` import routes → cập nhật path

**Verification:**
```bash
pytest tests/ -v --tb=short
python -c "from app.models import User, Exam, AcademicQuestion"
python -c "from app.schemas import Login, CourseIn, RubricIn"
```

---

### Phase 2: Service Layer (5-7 ngày)

**Mục tiêu:** Trích business logic từ routes vào services.

**2.1 — ExamService** (`services/exam_service.py`)
Trích từ `routes_admin.py:publish()` (200 dòng) + `routes_examiner.py:_assemble_slot_variant()` + `generate_variants_for_exam()`:
```python
class ExamService:
    def __init__(self, db: Session): ...

    def publish(self, exam_id: str, user_id: str) -> dict:
        """Lắp ráp đề từ Item Bank, freeze snapshot."""
        ...

    def assemble_variant(self, exam, slot, available_items, user_id) -> ExamVariant:
        """ATA: chọn câu hỏi theo blueprint, cân bằng usage_count."""
        ...

    def generate_variants_for_exam(self, exam_id: str, user_id: str) -> list[ExamVariant]:
        ...
```

**2.2 — CourseService** (`services/course_service.py`)
Trích từ `routes_admin.py`:
```python
class CourseService:
    def create(self, data, owner_id): ...
    def update(self, course_id, data): ...
    def archive(self, course_id): ...
    def restore(self, course_id): ...
    def delete(self, course_id, confirm_code): ...
    def get_workspace(self, course_id): ...
```

**2.3 — GradingService** (`services/grading_service.py`)
Trích từ `worker.py:grade_answer()` + `finalize()` + `grading.py`:
```python
class GradingService:
    def grade_attempt(self, exam, session, attempt, transcript, confidence, segments) -> dict: ...
    def finalize_session(self, session): ...
    def check_config(self, exam): ...
```

**2.4 — AllocationService** (`services/allocation_service.py`)
Trích từ `routes_examiner.py:create_batch_and_allocate()` + `create_slots()`:
```python
class AllocationService:
    def create_batch_and_allocate(self, exam_id, data, user_id) -> ExamBatch: ...
    def auto_allocate_candidates(self, batch_id): ...
```

**2.5 — StorageService** (`services/storage_service.py`)
Trích từ `routes_exam.py:init_upload()`, `chunk()`, `complete()`:
```python
class StorageService:
    def init_upload(self, attempt_id, kind, total_chunks, expected_size): ...
    def write_chunk(self, upload_id, index, data, sha256): ...
    def complete_upload(self, upload_id): ...
```

**2.6 — PTE Scoring Base Class** (`services/pte_scoring.py`)
Trích duplication từ 6 PTE engines:
```python
class BasePTEScorer:
    def clean_word(self, word): ...
    def align_tokens(self, ref, hyp) -> Dict: ...  # SequenceMatcher, đang duplicate trong 6 file
    def score_fluency(self, speech_rate, pauses) -> Dict: ...
    def score_pronunciation(self, acoustic_score) -> Dict: ...
```

Cập nhật `scoring/read_aloud.py`, `scoring/repeat_sentence.py`, v.v. — chỉ giữ logic specific, kế thừa `BasePTEScorer`.

**2.7 — Cập nhật routes dùng services**
```python
# api/admin/courses.py
@router.post("/courses")
def create_course(body: CourseIn, db=Depends(get_db), user=Depends(editor)):
    service = CourseService(db)
    return service.create(body.model_dump(), user.id)
```

**Verification:**
```bash
pytest tests/ -v --tb=short
python -c "from app.services.exam_service import ExamService"
python -c "from app.services.pte_scoring import BasePTEScorer"
```

---

### Phase 3: Route Reorganization (5-7 ngày)

**Mục tiêu:** Chia 4 route files khổng lồ thành modules nhỏ.

**3.1 — Split `routes_examiner.py` (1934 dòng)**

| File mới | Dòng | Content |
|----------|------|---------|
| `api/examiner/__init__.py` | 50 | Router aggregation |
| `api/examiner/semesters.py` | 250 | Semester CRUD |
| `api/examiner/courses.py` | 300 | Course in semester |
| `api/examiner/sections.py` | 200 | Section CRUD |
| `api/examiner/enrollments.py` | 250 | Enrollment import |
| `api/examiner/batches.py` | 400 | Batch + auto-allocate |
| `api/examiner/slots.py` | 400 | Schedule slots |
| `api/examiner/variants.py` | 200 | ATA variants |
| `api/examiner/candidates.py` | 350 | Candidate pool |
| `api/examiner/results.py` | 400 | FAP export, overview |

**3.2 — Split `routes_admin.py` (1866 dòng)**

| File mới | Dòng | Content |
|----------|------|---------|
| `api/admin/__init__.py` | 50 | Router aggregation |
| `api/admin/users.py` | 200 | User management |
| `api/admin/courses.py` | 350 | Course CRUD |
| `api/admin/outcomes.py` | 150 | Learning Outcomes |
| `api/admin/topics.py` | 250 | Topics |
| `api/admin/items.py` | 400 | Item Bank CRUD, import/export |
| `api/admin/rubrics.py` | 200 | Rubric CRUD |
| `api/admin/exams.py` | 400 | Exam CRUD, publish, copy |
| `api/admin/results.py` | 400 | Results, grading reviews |
| `api/admin/reeval.py` | 200 | Re-evaluation |

**3.3 — Split `routes_academy.py` (659 dòng)**

| File mới | Dòng | Content |
|----------|------|---------|
| `api/academy/__init__.py` | 30 | Router aggregation |
| `api/academy/questions.py` | 300 | Academic questions |
| `api/academy/matrices.py` | 250 | Matrices + stock health |
| `api/academy/rubrics.py` | 150 | Academy rubrics |

**3.4 — Split `routes_exam.py` (636 dòng)**

| File mới | Dòng | Content |
|----------|------|---------|
| `api/exam/__init__.py` | 50 | Router aggregation |
| `api/exam/sessions.py` | 300 | Session lifecycle |
| `api/exam/attempts.py` | 200 | Attempt state machine |
| `api/exam/uploads.py` | 200 | Chunked upload + evidence |

**3.5 — Update `main.py`**
```python
from app.api.admin import router as admin_router
from app.api.examiner import router as examiner_router
from app.api.academy import router as academy_router
from app.api.exam import router as exam_router
# ... giữ nguyên các router khác
```

**Verification:**
```bash
pytest tests/ -v --tb=short
python -c "from app.api.admin import router as admin_router; print(len(admin_router.routes))"
```

---

### Phase 4: Consolidation (3-4 ngày)

**Mục tiêu:** Dọn dẹp duplication còn lại.

**4.1 — `utils/excel.py`** — Excel base class
- Consolidate: openpyxl pattern từ `routes_examiner.py:import_enrollments()`, `import_candidates()`, `routes_admin.py:import_question_items_excel()`, `export_question_items_template()`
- Tạo `ExcelImporter` base class với `read_rows()`, `create_template()`

**4.2 — `utils/rubric_validator.py`**
- Consolidate: rubric weight validation từ `routes_academy.py` + `schemas.py`
- Một hàm duy nhất `validate_rubric_weights(criteria)`

**4.3 — `utils/demo_mode.py`**
- Consolidate: `settings().ai_provider == "demo"` checks từ `ai.py`, `worker.py`, `grading.py`, `routes_exam.py`
- `is_demo_mode()`, `require_production()`, `DemoModeMessage`

**4.4 — Update `core/exceptions.py` exception handler in `main.py`**
```python
from app.core.exceptions import AppException

@app.exception_handler(AppException)
async def app_exception_handler(request, exc: AppException):
    return JSONResponse(exc.status_code, {"error": exc.to_dict()})
```

**Verification:**
```bash
pytest tests/ -v --tb=short
python -c "from app.utils.excel import ExcelImporter"
python -c "from app.utils.demo_mode import is_demo_mode"
```

---

### Phase 5: Final Integration (2-3 ngày)

**Mục tiêu:** Dọn legacy files, verify cuối cùng.

**5.1 — Update `models/__init__.py`** — Re-export tất cả models để `from app.models import User` vẫn hoạt động

**5.2 — Update `schemas/__init__.py`** — Re-export tất cả schemas

**5.3 — Verify imports cuối cùng**
```bash
# Tất cả existing imports vẫn hoạt động
python -c "from app import routes_admin, routes_examiner, routes_academy"
python -c "from app import schemas as s, schemas_academy, schemas_examiner"
python -c "from app import models"

# Imports mới cũng hoạt động
python -c "from app.api.admin.courses import router"
python -c "from app.services.exam_service import ExamService"
python -c "from app.models import User, Exam, AcademicQuestion"
```

**5.4 — Full test suite**
```bash
pytest tests/ -v --tb=short --cov=app --cov-report=term-missing
```

**5.5 — Update CLAUDE.md + README.md**

---

## Tóm tắt Timeline

| Phase | Thời gian | Deliverable |
|-------|-----------|-------------|
| Phase 0 | 2-3 ngày | Package structure, core deps, exceptions, logging |
| Phase 1 | 3-4 ngày | Schemas/ và Models/ packages |
| Phase 2 | 5-7 ngày | Services layer (ExamService, CourseService...) |
| Phase 3 | 5-7 ngày | Split routes thành api/admin/, api/examiner/, v.v. |
| Phase 4 | 3-4 ngày | Consolidate utilities, centralized errors |
| Phase 5 | 2-3 ngày | Dọn legacy, final verification |
| **Tổng** | **20-28 ngày** | Fully refactored codebase |

---

## Risk Mitigation

| Rủi ro | Phòng ngừa |
|---------|-------------|
| Breaking existing tests | Chạy `pytest` sau mỗi phase; giữ legacy shims đến Phase 5 |
| Circular imports | Lazy imports trong services; deps.py dùng `Annotated[Type, Depends()]` |
| Route path changes | Giữ nguyên tất cả endpoint paths; chỉ di chuyển code |
| Database model changes | Giữ nguyên cấu trúc model, chỉ di chuyển file |

---

## Những gì GIỮ NGUYÊN (không thay đổi)

- Tất cả ~120 endpoint paths và methods
- Tất cả 35 database models (cấu trúc y hệt, chỉ move file)
- Tất cả Pydantic schemas (cấu trúc y hệt, chỉ move file)
- Background worker tick() logic
- 6 PTE scoring engines (chỉ refactor để dùng base class)
- Auth flow (JWT, Argon2, role guards)
- AI/STT providers
- 33 test files hiện tại
- Storage abstraction (local/S3)

---

## Execution Order

**Bắt đầu từ Phase 0 → Phase 5, tuần tự.**
Mỗi phase verify xong mới sang phase tiếp theo.
