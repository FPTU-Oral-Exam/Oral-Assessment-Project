# Phase 1: Bền vững hóa Dữ liệu Học thuật (ACADEMY DB Persistence) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây dựng toàn diện phân hệ Backend API `routes_academy.py`, mở rộng Schema/Model cơ sở dữ liệu PostgreSQL, nối liền Staff Portal `academy.service.ts` và nạp kho dữ liệu câu hỏi thực tế từ `data/pte-speaking/` vào Database, chuyển đổi Ban Học thuật (`ACADEMY`) từ Mock Context sang lưu trữ bền vững 100%.

**Architecture:** FastAPI REST endpoints chuẩn mực phân quyền RBAC (`ACADEMY`, `SYSTEM_ADMIN`), SQLAlchemy ORM entities kế thừa `Entity` base (`AcademicQuestion`, `AcademicMatrix`), Pydantic v2 schemas đồng bộ 100% với TypeScript types của Staff Portal, cơ chế tính toán Stock Health Validator và sinh đề thi mẫu theo ma trận.

**Tech Stack:** FastAPI, Python 3.12, SQLAlchemy 2.0, PostgreSQL 16 / SQLite, Next.js 15, TypeScript, Pydantic v2.

**Spec:** [`docs/api/05-academy-api.md`](file:///c:/Users/admin/Documents/A_FPT/Tempory_Project/AI-Oral-Assessment-Platform/docs/api/05-academy-api.md), [`apps/staff-portal/types/academic.ts`](file:///c:/Users/admin/Documents/A_FPT/Tempory_Project/AI-Oral-Assessment-Platform/apps/staff-portal/types/academic.ts), [`docs/specifications/02-actor-academy.md`](file:///c:/Users/admin/Documents/A_FPT/Tempory_Project/AI-Oral-Assessment-Platform/docs/specifications/02-actor-academy.md)

## Global Constraints

- **Single Source of Truth:** Thời gian chuẩn bị (`prep_time`), thời gian nói (`response_time`), độ khó và barem điểm do Server và Ban Học thuật quản lý tập trung.
- **Role Code Standard:** Chỉ sử dụng 4 role chuẩn hóa: `SYSTEM_ADMIN`, `EXAMINER`, `TEACHER`, `ACADEMY` (và `STUDENT`). Tuyệt đối không dùng mã role cũ.
- **Rubric Invariant:** Tổng trọng số các tiêu chí trong một bộ Rubric bắt buộc phải bằng chính xác 100%.
- **Zero AI Co-Author:** Nghiêm cấm hoàn toàn tag `Co-Authored-By` hay tên AI trong Git commit messages.
- **Non-breaking Migration:** Giữ tính tương thích ngược cho các bảng hiện có (`question_items`, `rubrics`, `courses`).

---

## Bản đồ Tệp tin (File Map)

```
services/api/app/
├── models.py                     # [MODIFY] Thêm AcademicQuestion, AcademicMatrix, QuestionTypeConfig
├── schemas_academy.py            # [CREATE] Pydantic v2 DTOs cho Questions, Matrices, Rubrics, StockHealth
├── routes_academy.py             # [CREATE] FastAPI Router độc lập với prefix /academy
└── main.py                       # [MODIFY] Include routes_academy.router

services/api/tests/
└── test_academy_routes.py        # [CREATE] Test suite Pytest bao phủ toàn bộ 15 endpoints của ACADEMY

scripts/
└── import_pte_bank_to_db.py      # [CREATE] Script CLI import 600+ câu hỏi từ data/pte-speaking vào DB

apps/staff-portal/
├── services/academy.service.ts   # [MODIFY] Bỏ fallback mock rỗng, xử lý đúng cấu trúc dữ liệu từ API
└── context/AcademicContext.tsx   # [MODIFY] Tải dữ liệu thật từ academyService khi khởi chạy
```

---

## Nhiệm vụ 1: Mở rộng Model SQLAlchemy & Tạo Schemas Pydantic

**Files:**
- Create: `services/api/app/schemas_academy.py`
- Modify: `services/api/app/models.py:382-396`
- Test: `services/api/tests/test_academy_routes.py`

**Interfaces:**
- Consumes: `Entity`, `Base` từ `services/api/app/models.py`
- Produces: `AcademicQuestion`, `AcademicMatrix`, `QuestionTypeConfigModel` trong `models.py` và các Pydantic schemas trong `schemas_academy.py`

- [x] **Step 1: Viết test kiểm tra models và schemas**

Tạo file `services/api/tests/test_academy_routes.py` với test khởi tạo:

```python
import pytest
from app.schemas_academy import (
    AcademicQuestionIn, AcademicQuestionOut,
    AcademicMatrixIn, AcademicMatrixOut,
    RubricIn, RubricOut,
    StockHealthOut,
)

def test_schemas_validation():
    q_in = AcademicQuestionIn(
        code="RA-TEST-01",
        skill="SPEAKING",
        type="RA",
        title="Sample Question",
        prompt="Read this text aloud clearly.",
        prep_time=35,
        response_time=40,
        difficulty="MEDIUM",
        tags=["Physics", "Science"],
    )
    assert q_in.code == "RA-TEST-01"
    assert q_in.type == "RA"

def test_matrix_rules_validation():
    m_in = AcademicMatrixIn(
        code="MATRIX-01",
        name="Standard Speaking Matrix",
        description="PTE Speaking blueprint",
        rubric_id=None,
        rules=[
            {
                "type": "RA",
                "question_count": 2,
                "prep_time": 35,
                "response_time": 40,
                "target_difficulty": "MEDIUM",
                "weight_percentage": 50,
            },
            {
                "type": "RS",
                "question_count": 3,
                "prep_time": 3,
                "response_time": 15,
                "target_difficulty": "EASY",
                "weight_percentage": 50,
            },
        ],
        difficulty_ratio={"easy": 50, "medium": 50, "hard": 0},
    )
    assert len(m_in.rules) == 2
```

- [x] **Step 2: Chạy test để xác nhận test thất bại (Red phase)**

Chạy: `python -m pytest services/api/tests/test_academy_routes.py -v`
Kỳ vọng: FAIL với lỗi `ModuleNotFoundError: No module named 'app.schemas_academy'`

- [x] **Step 3: Cập nhật `models.py` và tạo `schemas_academy.py`**

Trong `services/api/app/models.py`, thêm các Model:
```python
class AcademicQuestion(Entity, Base):
    __tablename__ = "academic_questions"
    code: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    skill: Mapped[str] = mapped_column(String(30), default="SPEAKING")
    type: Mapped[str] = mapped_column(String(20), index=True)  # RA, RS, GD, DI, SI, RL
    title: Mapped[str] = mapped_column(String(250))
    prompt: Mapped[str] = mapped_column(Text)
    media_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    audio_script: Mapped[str | None] = mapped_column(Text, nullable=True)
    prep_time: Mapped[int] = mapped_column(Integer, default=30)
    response_time: Mapped[int] = mapped_column(Integer, default=40)
    difficulty: Mapped[str] = mapped_column(String(20), default="MEDIUM")  # EASY, MEDIUM, HARD
    status: Mapped[str] = mapped_column(String(20), default="APPROVED")  # DRAFT, APPROVED, IN_USE
    is_predicted: Mapped[bool] = mapped_column(Boolean, default=False)
    usage_count: Mapped[int] = mapped_column(Integer, default=0)
    tags: Mapped[list] = mapped_column(JSON(none_as_null=True), default=list)
    sample_answer: Mapped[str | None] = mapped_column(Text, nullable=True)
    key_points: Mapped[list] = mapped_column(JSON(none_as_null=True), default=list)
    author_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    deleted_at: Mapped[float | None] = mapped_column(Float, nullable=True)


class AcademicMatrix(Entity, Base):
    __tablename__ = "academic_matrices"
    code: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text, default="")
    rubric_id: Mapped[str | None] = mapped_column(ForeignKey("rubrics.id", ondelete="SET NULL"), nullable=True)
    rules: Mapped[list] = mapped_column(JSON(none_as_null=True), default=list)
    difficulty_ratio: Mapped[dict] = mapped_column(JSON(none_as_null=True), default=dict)
    deleted_at: Mapped[float | None] = mapped_column(Float, nullable=True)


class QuestionTypeConfigModel(Entity, Base):
    __tablename__ = "question_type_configs"
    type: Mapped[str] = mapped_column(String(20), unique=True, index=True)  # RA, RS, GD, DI, SI, RL
    name: Mapped[str] = mapped_column(String(100))
    description: Mapped[str] = mapped_column(Text, default="")
    default_prep_time: Mapped[int] = mapped_column(Integer, default=30)
    default_response_time: Mapped[int] = mapped_column(Integer, default=40)
    audio_instruction_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    max_score: Mapped[float] = mapped_column(Float, default=10.0)
```

Tạo file `services/api/app/schemas_academy.py` định nghĩa các schema Pydantic v2:
- `AcademicQuestionIn`, `AcademicQuestionUpdate`, `AcademicQuestionOut`
- `AcademicMatrixIn`, `AcademicMatrixUpdate`, `AcademicMatrixOut`
- `StockHealthItem`, `StockHealthOut`
- `SampleExamQuestionOut`, `SampleExamOut`
- `RubricIn`, `RubricUpdate`, `RubricOut`
- `QuestionTypeConfigIn`, `QuestionTypeConfigOut`

- [x] **Step 4: Chạy test để xác nhận test pass**

Chạy: `python -m pytest services/api/tests/test_academy_routes.py -k test_schemas_validation -v`
Kỳ vọng: PASS (1 passed)

- [x] **Step 5: Commit task 1**

```bash
git add services/api/app/models.py services/api/app/schemas_academy.py services/api/tests/test_academy_routes.py
git commit -m "feat(academy): add models and pydantic schemas for academic questions and matrices"
```

---

## Nhiệm vụ 2: Xây dựng Backend Endpoints Ngân hàng Câu hỏi (Questions API)

**Files:**
- Create: `services/api/app/routes_academy.py`
- Modify: `services/api/tests/test_academy_routes.py`

**Interfaces:**
- Consumes: `AcademicQuestion` từ `models.py`, `schemas_academy.py`, `get_db`, `current_user`
- Produces: Các endpoints:
  + `GET /api/academy/questions`
  + `GET /api/academy/questions/{id}`
  + `POST /api/academy/questions`
  + `PUT /api/academy/questions/{id}`
  + `DELETE /api/academy/questions/{id}`
  + `POST /api/academy/questions/{id}/approve`

- [ ] **Step 1: Viết test cho Questions Endpoints**

Bổ sung test trong `services/api/tests/test_academy_routes.py`:
```python
def test_create_and_list_questions(client, academy_token):
    # 1. Create Question
    payload = {
        "code": "RA-TEST-99",
        "skill": "SPEAKING",
        "type": "RA",
        "title": "Quantum Physics Passage",
        "prompt": "Quantum mechanics explores atomic behavior.",
        "prep_time": 35,
        "response_time": 40,
        "difficulty": "MEDIUM",
        "tags": ["Physics"],
    }
    resp = client.post(
        "/api/academy/questions",
        json=payload,
        headers={"Authorization": f"Bearer {academy_token}"},
    )
    assert resp.status_code == 201
    created = resp.json()
    assert created["code"] == "RA-TEST-99"
    q_id = created["id"]

    # 2. Get Details
    resp_get = client.get(
        f"/api/academy/questions/{q_id}",
        headers={"Authorization": f"Bearer {academy_token}"},
    )
    assert resp_get.status_code == 200
    assert resp_get.json()["id"] == q_id

    # 3. List with Filter
    resp_list = client.get(
        "/api/academy/questions?type=RA&difficulty=MEDIUM",
        headers={"Authorization": f"Bearer {academy_token}"},
    )
    assert resp_list.status_code == 200
    items = resp_list.json()
    assert any(item["id"] == q_id for item in items)
```

- [ ] **Step 2: Chạy test để xác nhận test fails**

Chạy: `python -m pytest services/api/tests/test_academy_routes.py -k test_create_and_list_questions -v`
Kỳ vọng: FAIL với 404 Not Found (router chưa mount)

- [ ] **Step 3: Triển khai Questions Endpoints trong `routes_academy.py`**

Tạo `services/api/app/routes_academy.py` với APIRouter:
- `router = APIRouter(prefix="/academy", tags=["Academy"])`
- Role guard: `def require_academy(user=Depends(current_user)): if user.role not in {"ACADEMY", "SYSTEM_ADMIN"}: fail(403, "FORBIDDEN", ...)`
- Endpoint `GET /questions` hỗ trợ filters (`type`, `skill`, `difficulty`, `status`, `is_predicted`, `search`).
- Endpoint `POST /questions`, `GET /questions/{id}`, `PUT /questions/{id}`, `DELETE /questions/{id}` (soft-delete đánh dấu `deleted_at`), `POST /questions/{id}/approve` (chuyển status thành `APPROVED`).

- [ ] **Step 4: Chạy test để xác nhận test passes**

Chạy: `python -m pytest services/api/tests/test_academy_routes.py -k test_create_and_list_questions -v`
Kỳ vọng: PASS

- [ ] **Step 5: Commit task 2**

```bash
git add services/api/app/routes_academy.py services/api/tests/test_academy_routes.py
git commit -m "feat(academy): implement question bank REST endpoints"
```

---

## Nhiệm vụ 3: Xây dựng Endpoints Ma trận Đề thi & Stock Health Validator

**Files:**
- Modify: `services/api/app/routes_academy.py`
- Modify: `services/api/tests/test_academy_routes.py`

**Interfaces:**
- Consumes: `AcademicMatrix`, `AcademicQuestion` từ `models.py`
- Produces:
  + `GET /api/academy/matrices`
  + `GET /api/academy/matrices/{id}`
  + `POST /api/academy/matrices`
  + `PUT /api/academy/matrices/{id}`
  + `DELETE /api/academy/matrices/{id}`
  + `GET /api/academy/matrices/{id}/stock-health`
  + `POST /api/academy/matrices/{id}/generate-sample`

- [x] **Step 1: Viết test cho Matrix & Stock Health**

Bổ sung test trong `services/api/tests/test_academy_routes.py`:
```python
def test_matrix_and_stock_health(client, academy_token):
    matrix_payload = {
        "code": "MATRIX-PTE-STD",
        "name": "PTE Standard Speaking Blueprint",
        "description": "Cấu trúc đề chuẩn",
        "rules": [
            {
                "type": "RA",
                "question_count": 2,
                "prep_time": 35,
                "response_time": 40,
                "target_difficulty": "MEDIUM",
                "weight_percentage": 50,
            },
            {
                "type": "RS",
                "question_count": 3,
                "prep_time": 3,
                "response_time": 15,
                "target_difficulty": "EASY",
                "weight_percentage": 50,
            },
        ],
        "difficulty_ratio": {"easy": 40, "medium": 40, "hard": 20},
    }
    resp = client.post(
        "/api/academy/matrices",
        json=matrix_payload,
        headers={"Authorization": f"Bearer {academy_token}"},
    )
    assert resp.status_code == 201
    m_id = resp.json()["id"]

    # Stock Health check
    health_resp = client.get(
        f"/api/academy/matrices/{m_id}/stock-health",
        headers={"Authorization": f"Bearer {academy_token}"},
    )
    assert health_resp.status_code == 200
    data = health_resp.json()
    assert "health_breakdown" in data
    assert "is_ready_for_publishing" in data
```

- [x] **Step 2: Chạy test để xác nhận test fails**

Chạy: `python -m pytest services/api/tests/test_academy_routes.py -k test_matrix_and_stock_health -v`
Kỳ vọng: FAIL

- [x] **Step 3: Triển khai Matrix & Stock Health logic trong `routes_academy.py`**

- Endpoint `GET /matrices`, `POST /matrices`, `GET /matrices/{id}`, `PUT /matrices/{id}`, `DELETE /matrices/{id}`.
- Logic `GET /matrices/{id}/stock-health`:
  * Duyệt từng rule trong `matrix.rules`.
  * Đếm số câu hỏi `AcademicQuestion` thỏa mãn `type == rule["type"]` và `status == "APPROVED"` và `deleted_at IS NULL`.
  * Tính `deficit = max(0, rule["question_count"] * 5 - available_approved_count)` (để đảm bảo hệ số hoán vị tối thiểu $\times 5$ không trùng đề).
  * Đặt trạng thái `HEALTHY` (nếu đủ $\ge 5\times$), `WARNING` (nếu đủ $2-4\times$), `CRITICAL` (nếu thiếu đề).
- Logic `POST /matrices/{id}/generate-sample`:
  * Rút trích ngẫu nhiên các câu hỏi từ kho theo quy tắc từng rule.
  * Trả về `GeneratedSampleExam` cấu trúc đề mẫu có danh sách câu hỏi tuần tự.

- [x] **Step 4: Chạy test để xác nhận test passes**

Chạy: `python -m pytest services/api/tests/test_academy_routes.py -k test_matrix_and_stock_health -v`
Kỳ vọng: PASS

- [x] **Step 5: Commit task 3**

```bash
git add services/api/app/routes_academy.py services/api/tests/test_academy_routes.py
git commit -m "feat(academy): implement blueprint matrices, stock health validator and sample generator"
```

---

## Nhiệm vụ 4: Xây dựng Endpoints Tiêu chuẩn Rubrics & Quy chuẩn Dạng bài

**Files:**
- Modify: `services/api/app/routes_academy.py`
- Modify: `services/api/app/main.py:225-235`
- Modify: `services/api/tests/test_academy_routes.py`

**Interfaces:**
- Consumes: `Rubric` từ `models.py`, `QuestionTypeConfigModel`
- Produces:
  + `GET /api/academy/rubrics`
  + `GET /api/academy/rubrics/{id}`
  + `POST /api/academy/rubrics`
  + `PUT /api/academy/rubrics/{id}`
  + `DELETE /api/academy/rubrics/{id}`
  + `GET /api/academy/question-types`
  + `PUT /api/academy/question-types/{type}`

- [ ] **Step 1: Viết test cho Rubrics & Question Types**

Bổ sung test trong `services/api/tests/test_academy_routes.py`:
```python
def test_rubrics_and_question_types(client, academy_token):
    # Rubric Invariant: Sum of weights must equal 100
    rubric_payload = {
        "name": "PTE Speaking Official Rubric",
        "description": "5 standard dimensions",
        "course_id": None,
        "criteria": [
            {"name": "Content", "max_score": 10.0, "weight": 30.0, "description": "Topic relevance"},
            {"name": "Pronunciation", "max_score": 10.0, "weight": 25.0, "description": "Phoneme clarity"},
            {"name": "Fluency", "max_score": 10.0, "weight": 25.0, "description": "Rhythm and speech rate"},
            {"name": "Vocabulary", "max_score": 10.0, "weight": 20.0, "description": "Lexical richness"},
        ],
    }
    resp = client.post(
        "/api/academy/rubrics",
        json=rubric_payload,
        headers={"Authorization": f"Bearer {academy_token}"},
    )
    assert resp.status_code == 201
    r_id = resp.json()["id"]

    # Invalid Rubric: Sum != 100 should fail with 422
    bad_payload = {**rubric_payload, "name": "Bad Rubric", "criteria": [{"name": "A", "max_score": 10, "weight": 80}]}
    resp_bad = client.post(
        "/api/academy/rubrics",
        json=bad_payload,
        headers={"Authorization": f"Bearer {academy_token}"},
    )
    assert resp_bad.status_code in (400, 422)

    # Question Types
    qt_resp = client.get("/api/academy/question-types")
    assert qt_resp.status_code == 200
    assert len(qt_resp.json()) == 6
```

- [ ] **Step 2: Chạy test để xác nhận test fails**

Chạy: `python -m pytest services/api/tests/test_academy_routes.py -k test_rubrics_and_question_types -v`
Kỳ vọng: FAIL

- [ ] **Step 3: Triển khai Rubrics & Question Types logic trong `routes_academy.py` và mount vào `main.py`**

- Kiểm tra tổng trọng số rubric:
  ```python
  total_weight = sum(c.weight for c in body.criteria)
  if abs(total_weight - 100.0) > 0.01:
      fail(400, "INVALID_RUBRIC_WEIGHT", f"Tổng trọng số các tiêu chí phải bằng 100% (hiện tại: {total_weight}%)")
  ```
- Khởi tạo 6 dạng bài mặc định (RA, RS, GD, DI, SI, RL) nếu bảng `question_type_configs` trống.
- Đăng ký router trong `services/api/app/main.py`:
  ```python
  from . import routes_academy
  ...
  app.include_router(routes_academy.router, tags=["Academy"])
  ```

- [ ] **Step 4: Chạy test để xác nhận test passes**

Chạy: `python -m pytest services/api/tests/test_academy_routes.py -v`
Kỳ vọng: PASS toàn bộ test suite (100% pass)

- [ ] **Step 5: Commit task 4**

```bash
git add services/api/app/routes_academy.py services/api/app/main.py services/api/tests/test_academy_routes.py
git commit -m "feat(academy): implement rubrics studio and question type configurations"
```

---

## Nhiệm vụ 5: Viết Script Nạp Kho Câu hỏi Thật PTE Speaking vào DB (`import_pte_bank_to_db.py`)

**Files:**
- Create: `scripts/import_pte_bank_to_db.py`
- Test: `services/api/tests/test_pte_import.py`

**Interfaces:**
- Consumes: Thư mục `data/pte-speaking/`, bảng `academic_questions`
- Produces: Nhập hơn 600 câu hỏi vào cơ sở dữ liệu với trạng thái `APPROVED`

- [ ] **Step 1: Viết test cho script import**

Tạo `services/api/tests/test_pte_import.py`:
```python
from scripts.import_pte_bank_to_db import parse_question_data

def test_parse_read_aloud_item():
    raw_item = {
        "uid": "SRA1000",
        "transcript": "For any marketing course that requires the development of marketing plans...",
        "exercise": "Read Aloud",
        "tested": 95,
        "has_media": False,
    }
    parsed = parse_question_data("Read Aloud", raw_item)
    assert parsed["code"] == "SRA1000"
    assert parsed["type"] == "RA"
    assert parsed["skill"] == "SPEAKING"
    assert parsed["prep_time"] == 35
    assert parsed["response_time"] == 40
    assert parsed["status"] == "APPROVED"
```

- [ ] **Step 2: Chạy test để xác nhận test fails**

Chạy: `python -m pytest services/api/tests/test_pte_import.py -v`
Kỳ vọng: FAIL với `ModuleNotFoundError`

- [ ] **Step 3: Viết script `scripts/import_pte_bank_to_db.py`**

- Định nghĩa ánh xạ:
  * "Read Aloud" $\rightarrow$ `RA` (prep: 35s, resp: 40s)
  * "Repeat Sentence" $\rightarrow$ `RS` (prep: 3s, resp: 15s)
  * "Summarize Group Discussion" $\rightarrow$ `GD` (prep: 10s, resp: 60s)
  * "Describe Image" $\rightarrow$ `DI` (prep: 25s, resp: 40s)
  * "Respond to a Situation" $\rightarrow$ `SI` (prep: 20s, resp: 40s)
  * "Re-tell Lecture" $\rightarrow$ `RL` (prep: 10s, resp: 40s)
- Đọc từng thư mục trong `data/pte-speaking/`, đọc file `questions.json`.
- Chèn idempotently (nếu code đã tồn tại thì bỏ qua hoặc cập nhật) vào bảng `academic_questions`.
- In báo cáo tổng kết số lượng câu hỏi đã nạp theo từng dạng bài.

- [ ] **Step 4: Chạy test và chạy thử nghiệm import**

Chạy test: `python -m pytest services/api/tests/test_pte_import.py -v` (Kỳ vọng: PASS)
Chạy script: `python scripts/import_pte_bank_to_db.py`
Kỳ vọng: Nạp thành công hơn 600 câu hỏi vào cơ sở dữ liệu.

- [ ] **Step 5: Commit task 5**

```bash
git add scripts/import_pte_bank_to_db.py services/api/tests/test_pte_import.py
git commit -m "feat(data): add CLI script to import PTE speaking bank questions to database"
```

---

## Nhiệm vụ 6: Cập nhật Cầu nối Frontend Service & Context (`academy.service.ts`, `AcademicContext.tsx`)

**Files:**
- Modify: `apps/staff-portal/services/academy.service.ts`
- Modify: `apps/staff-portal/context/AcademicContext.tsx`
- Test: `apps/staff-portal/tests/academic-service.test.ts`

**Interfaces:**
- Consumes: Backend API `/api/academy/...`
- Produces: State thật được đồng bộ giữa Staff Portal và PostgreSQL

- [ ] **Step 1: Viết test cho `academy.service.ts`**

Tạo test Vitest `apps/staff-portal/tests/academic-service.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest';
import { academyService } from '../services/academy.service';
import { apiClient } from '../lib/api-client';

describe('AcademyService', () => {
  it('calls correct URL with filter params', async () => {
    const spy = vi.spyOn(apiClient, 'get').mockResolvedValueOnce([]);
    await academyService.getQuestions({ type: 'RA', difficulty: 'MEDIUM' });
    expect(spy).toHaveBeenCalledWith('/api/academy/questions?type=RA&difficulty=MEDIUM');
  });
});
```

- [ ] **Step 2: Chạy test để xác minh**

Chạy: `npm.cmd test -w apps/staff-portal -- academic-service.test.ts`
Kỳ vọng: PASS hoặc kiểm tra tương thích.

- [ ] **Step 3: Cập nhật `academy.service.ts` & `AcademicContext.tsx`**

- Trong `academy.service.ts`:
  * Xử lý chính xác định dạng trả về từ backend (chuẩn hóa `items` và `total`).
  * Bổ sung endpoint cho quy chuẩn 6 dạng bài `getQuestionTypeConfigs()` và `updateQuestionTypeConfig()`.
- Trong `AcademicContext.tsx`:
  * Khi `AcademicProvider` mount, gọi `academyService.getQuestions()`, `academyService.getMatrices()`, `academyService.getRubrics()`.
  * Nếu backend trả về dữ liệu rỗng, fallback sang dữ liệu khởi tạo ban đầu để đảm bảo UI không bao giờ bị trắng trang.
  * Khi người dùng thêm/sửa/xóa câu hỏi trên modal, gọi trực tiếp API `academyService` và cập nhật local state.

- [ ] **Step 4: Kiểm tra build & Typecheck Frontend**

Chạy: `npm.cmd run typecheck -w apps/staff-portal`
Kỳ vọng: 0 lỗi typecheck.

- [ ] **Step 5: Commit task 6**

```bash
git add apps/staff-portal/services/academy.service.ts apps/staff-portal/context/AcademicContext.tsx apps/staff-portal/tests/academic-service.test.ts
git commit -m "feat(staff-portal): bind academic context to backend REST API and persist state"
```

---

## 4. Kiểm định Toàn diện (Self-Review & Verification Checklist)

Trước khi nghiệm thu Giai đoạn 1:
1. **Pytest Coverage:** Chạy toàn bộ test suite `python -m pytest services/api/tests/test_academy_routes.py` $\rightarrow$ 100% Passed.
2. **Database Verification:** Truy vấn bảng `academic_questions` để xác nhận số câu hỏi thực tế trong DB:
   ```sql
   SELECT type, count(*) FROM academic_questions WHERE deleted_at IS NULL GROUP BY type;
   ```
   Kỳ vọng: Đầy đủ 6 dạng bài (RA, RS, GD, DI, SI, RL) với tổng số lượng $> 500$ câu.
3. **Frontend Verification:** Mở trình duyệt truy cập `http://localhost:3000/item-bank` bằng tài khoản `academy`, xác nhận:
   - Danh sách câu hỏi hiển thị câu hỏi thật từ cơ sở dữ liệu.
   - Thử thêm 1 câu hỏi mới $\rightarrow$ F5 tải lại trang $\rightarrow$ Dữ liệu vẫn còn nguyên (chứng minh lưu trữ DB thành công).
   - Mở `/exam-matrix` $\rightarrow$ Thẻ *Stock Health Indicator* hiển thị trạng thái `HEALTHY` màu xanh lá cây do kho đề đã được nạp đầy đủ.
