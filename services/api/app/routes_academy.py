import time
import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from .db import get_db
from .models import AcademicMatrix, AcademicQuestion, QuestionTypeConfigModel, Rubric
from .schemas_academy import (
    AcademicMatrixIn,
    AcademicMatrixOut,
    AcademicMatrixUpdate,
    AcademicQuestionIn,
    AcademicQuestionOut,
    AcademicQuestionUpdate,
    ExamMatrixRule,
    GeneratedSampleExamOut,
    QuestionTypeConfigIn,
    QuestionTypeConfigOut,
    RubricCriterion,
    RubricIn,
    RubricOut,
    RubricUpdate,
    SampleExamQuestionOut,
    StockHealthItem,
    StockHealthOut,
)
from .security import academy, by_id, fail

router = APIRouter(prefix="/academy", tags=["Academy"])


# ============================================================================
# 0. NGÂN HÀNG CÂU HỎI (QUESTION BANK) — TASK 2
# ============================================================================

def _to_question_out(q: AcademicQuestion) -> AcademicQuestionOut:
    return AcademicQuestionOut(
        id=q.id,
        code=q.code,
        skill=q.skill,
        type=q.type,
        title=q.title,
        prompt=q.prompt,
        media_url=q.media_url,
        audio_script=q.audio_script,
        prep_time=q.prep_time,
        response_time=q.response_time,
        difficulty=q.difficulty,
        status=q.status,
        is_predicted=bool(q.is_predicted),
        usage_count=q.usage_count or 0,
        tags=q.tags or [],
        sample_answer=q.sample_answer,
        key_points=q.key_points or [],
        created_at=q.created_at,
        updated_at=getattr(q, "updated_at", q.created_at) or q.created_at,
    )


@router.get("/questions", response_model=List[AcademicQuestionOut])
def list_questions(
    type: Optional[str] = None,
    skill: Optional[str] = None,
    difficulty: Optional[str] = None,
    status: Optional[str] = None,
    is_predicted: Optional[bool] = None,
    search: Optional[str] = None,
    limit: int = 500,
    offset: int = 0,
    db: Session = Depends(get_db),
    user=Depends(academy),
):
    stmt = select(AcademicQuestion).where(AcademicQuestion.deleted_at.is_(None))
    if type:
        stmt = stmt.where(AcademicQuestion.type == type.upper())
    if skill:
        stmt = stmt.where(AcademicQuestion.skill == skill.upper())
    if difficulty:
        stmt = stmt.where(AcademicQuestion.difficulty == difficulty.upper())
    if status:
        stmt = stmt.where(AcademicQuestion.status == status.upper())
    if is_predicted is not None:
        stmt = stmt.where(AcademicQuestion.is_predicted == is_predicted)
    if search:
        search_pattern = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                AcademicQuestion.code.ilike(search_pattern),
                AcademicQuestion.title.ilike(search_pattern),
                AcademicQuestion.prompt.ilike(search_pattern),
            )
        )
    stmt = stmt.order_by(AcademicQuestion.created_at.desc()).offset(offset).limit(limit)
    rows = db.scalars(stmt).all()
    return [_to_question_out(q) for q in rows]


@router.post("/questions", status_code=201, response_model=AcademicQuestionOut)
def create_question(body: AcademicQuestionIn, db: Session = Depends(get_db), user=Depends(academy)):
    existing = db.scalar(
        select(AcademicQuestion.id).where(
            AcademicQuestion.code == body.code,
            AcademicQuestion.deleted_at.is_(None),
        )
    )
    if existing:
        fail(409, "CODE_EXISTS", f"Mã câu hỏi '{body.code}' đã tồn tại")

    now = time.time()
    row = AcademicQuestion(
        code=body.code,
        skill=body.skill.upper(),
        type=body.type.upper(),
        title=body.title,
        prompt=body.prompt,
        media_url=body.media_url,
        audio_script=body.audio_script,
        prep_time=body.prep_time,
        response_time=body.response_time,
        difficulty=body.difficulty.upper(),
        status=body.status.upper(),
        is_predicted=body.is_predicted,
        tags=body.tags or [],
        sample_answer=body.sample_answer,
        key_points=body.key_points or [],
        author_id=user.id if user else None,
        updated_at=now,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _to_question_out(row)


@router.get("/questions/{key}", response_model=AcademicQuestionOut)
def get_question(key: str, db: Session = Depends(get_db), user=Depends(academy)):
    row = by_id(db, AcademicQuestion, key)
    if row.deleted_at is not None:
        fail(404, "NOT_FOUND", "Câu hỏi đã bị xóa")
    return _to_question_out(row)


@router.put("/questions/{key}", response_model=AcademicQuestionOut)
def update_question(key: str, body: AcademicQuestionUpdate, db: Session = Depends(get_db), user=Depends(academy)):
    row = by_id(db, AcademicQuestion, key)
    if row.deleted_at is not None:
        fail(404, "NOT_FOUND", "Câu hỏi đã bị xóa")

    payload = body.model_dump(exclude_unset=True)
    if "code" in payload and payload["code"] != row.code:
        conflict = db.scalar(
            select(AcademicQuestion.id).where(
                AcademicQuestion.code == payload["code"],
                AcademicQuestion.id != row.id,
                AcademicQuestion.deleted_at.is_(None),
            )
        )
        if conflict:
            fail(409, "CODE_EXISTS", f"Mã câu hỏi '{payload['code']}' đã tồn tại")
        row.code = payload["code"]

    for field, val in payload.items():
        if field == "code":
            continue
        if field in ("skill", "type", "difficulty", "status") and isinstance(val, str):
            val = val.upper()
        setattr(row, field, val)

    row.updated_at = time.time()
    db.commit()
    db.refresh(row)
    return _to_question_out(row)


@router.delete("/questions/{key}")
def delete_question(key: str, db: Session = Depends(get_db), user=Depends(academy)):
    row = by_id(db, AcademicQuestion, key)
    if row.deleted_at is not None:
        fail(404, "NOT_FOUND", "Câu hỏi đã bị xóa")
    row.deleted_at = time.time()
    db.commit()
    return {"ok": True}


@router.post("/questions/{key}/approve", response_model=AcademicQuestionOut)
def approve_question(key: str, db: Session = Depends(get_db), user=Depends(academy)):
    row = by_id(db, AcademicQuestion, key)
    if row.deleted_at is not None:
        fail(404, "NOT_FOUND", "Câu hỏi đã bị xóa")
    row.status = "APPROVED"
    row.updated_at = time.time()
    db.commit()
    db.refresh(row)
    return _to_question_out(row)


# ============================================================================
# 1. MA TRẬN ĐỀ THI (EXAM BLUEPRINT MATRIX & STOCK HEALTH) — TASK 3
# ============================================================================


@router.get("/matrices", response_model=List[AcademicMatrixOut])
def list_matrices(db: Session = Depends(get_db), user=Depends(academy)):
    stmt = (
        select(AcademicMatrix)
        .where(AcademicMatrix.deleted_at.is_(None))
        .order_by(AcademicMatrix.created_at.desc())
    )
    rows = db.scalars(stmt).all()
    return [
        AcademicMatrixOut(
            id=r.id,
            code=r.code,
            name=r.name,
            description=r.description or "",
            rubric_id=r.rubric_id,
            rules=[ExamMatrixRule(**rule) if isinstance(rule, dict) else rule for rule in (r.rules or [])],
            difficulty_ratio=r.difficulty_ratio or {},
            created_at=r.created_at,
            updated_at=r.updated_at,
        )
        for r in rows
    ]


@router.post("/matrices", status_code=201, response_model=AcademicMatrixOut)
def create_matrix(body: AcademicMatrixIn, db: Session = Depends(get_db), user=Depends(academy)):
    existing = db.scalar(
        select(AcademicMatrix.id).where(
            AcademicMatrix.code == body.code,
            AcademicMatrix.deleted_at.is_(None),
        )
    )
    if existing:
        fail(409, "CODE_EXISTS", f"Mã ma trận '{body.code}' đã tồn tại")

    rules_data = [r.model_dump() if hasattr(r, "model_dump") else r for r in body.rules]
    row = AcademicMatrix(
        code=body.code,
        name=body.name,
        description=body.description or "",
        rubric_id=body.rubric_id,
        rules=rules_data,
        difficulty_ratio=body.difficulty_ratio,
        updated_at=time.time(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return AcademicMatrixOut(
        id=row.id,
        code=row.code,
        name=row.name,
        description=row.description or "",
        rubric_id=row.rubric_id,
        rules=[ExamMatrixRule(**rule) for rule in (row.rules or [])],
        difficulty_ratio=row.difficulty_ratio or {},
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


@router.get("/matrices/{key}", response_model=AcademicMatrixOut)
def get_matrix(key: str, db: Session = Depends(get_db), user=Depends(academy)):
    row = by_id(db, AcademicMatrix, key)
    if row.deleted_at is not None:
        fail(404, "NOT_FOUND", "Ma trận đề thi đã bị xóa")
    return AcademicMatrixOut(
        id=row.id,
        code=row.code,
        name=row.name,
        description=row.description or "",
        rubric_id=row.rubric_id,
        rules=[ExamMatrixRule(**rule) for rule in (row.rules or [])],
        difficulty_ratio=row.difficulty_ratio or {},
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


@router.put("/matrices/{key}", response_model=AcademicMatrixOut)
def update_matrix(key: str, body: AcademicMatrixUpdate, db: Session = Depends(get_db), user=Depends(academy)):
    row = by_id(db, AcademicMatrix, key)
    if row.deleted_at is not None:
        fail(404, "NOT_FOUND", "Ma trận đề thi đã bị xóa")

    payload = body.model_dump(exclude_unset=True)
    if "code" in payload and payload["code"] != row.code:
        conflict = db.scalar(
            select(AcademicMatrix.id).where(
                AcademicMatrix.code == payload["code"],
                AcademicMatrix.id != row.id,
                AcademicMatrix.deleted_at.is_(None),
            )
        )
        if conflict:
            fail(409, "CODE_EXISTS", f"Mã ma trận '{payload['code']}' đã tồn tại")
        row.code = payload["code"]

    if "name" in payload:
        row.name = payload["name"]
    if "description" in payload:
        row.description = payload["description"]
    if "rubric_id" in payload:
        row.rubric_id = payload["rubric_id"]
    if "rules" in payload and payload["rules"] is not None:
        row.rules = [r.model_dump() if hasattr(r, "model_dump") else r for r in payload["rules"]]
    if "difficulty_ratio" in payload and payload["difficulty_ratio"] is not None:
        row.difficulty_ratio = payload["difficulty_ratio"]

    row.updated_at = time.time()
    db.commit()
    db.refresh(row)
    return AcademicMatrixOut(
        id=row.id,
        code=row.code,
        name=row.name,
        description=row.description or "",
        rubric_id=row.rubric_id,
        rules=[ExamMatrixRule(**rule) for rule in (row.rules or [])],
        difficulty_ratio=row.difficulty_ratio or {},
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


@router.delete("/matrices/{key}")
def delete_matrix(key: str, db: Session = Depends(get_db), user=Depends(academy)):
    row = by_id(db, AcademicMatrix, key)
    if row.deleted_at is not None:
        fail(404, "NOT_FOUND", "Ma trận đề thi đã bị xóa")
    row.deleted_at = time.time()
    db.commit()
    return {"ok": True}


@router.get("/matrices/{key}/stock-health", response_model=StockHealthOut)
def matrix_stock_health(key: str, db: Session = Depends(get_db), user=Depends(academy)):
    matrix = by_id(db, AcademicMatrix, key)
    if matrix.deleted_at is not None:
        fail(404, "NOT_FOUND", "Ma trận đề thi đã bị xóa")

    health_breakdown = []
    is_ready = True

    for rule in (matrix.rules or []):
        q_type = rule.get("type") if isinstance(rule, dict) else rule.type
        req_count = rule.get("question_count", 1) if isinstance(rule, dict) else rule.question_count

        # Đếm số câu hỏi đã APPROVED trong DB
        stmt = (
            select(func.count(AcademicQuestion.id))
            .where(
                AcademicQuestion.type == q_type,
                AcademicQuestion.status == "APPROVED",
                AcademicQuestion.deleted_at.is_(None),
            )
        )
        avail_count = db.scalar(stmt) or 0

        # Đánh giá tồn kho:
        # Nếu avail >= req * 5: HEALTHY (đủ độ phủ hoán vị chống nhìn bài)
        # Nếu avail >= req * 2: WARNING (vừa đủ)
        # Ngược lại: CRITICAL (thiếu câu hỏi)
        if avail_count >= req_count * 5:
            status = "HEALTHY"
            deficit = 0
        elif avail_count >= req_count * 2:
            status = "WARNING"
            deficit = max(0, req_count * 5 - avail_count)
        else:
            status = "CRITICAL"
            deficit = max(0, req_count * 2 - avail_count)
            is_ready = False

        health_breakdown.append(
            StockHealthItem(
                type=q_type,
                required_count=req_count,
                available_approved_count=avail_count,
                status=status,
                deficit=deficit,
            )
        )

    return StockHealthOut(
        matrix_id=matrix.id,
        is_ready_for_publishing=is_ready,
        health_breakdown=health_breakdown,
    )


@router.post("/matrices/{key}/generate-sample", response_model=GeneratedSampleExamOut)
def matrix_generate_sample(key: str, db: Session = Depends(get_db), user=Depends(academy)):
    matrix = by_id(db, AcademicMatrix, key)
    if matrix.deleted_at is not None:
        fail(404, "NOT_FOUND", "Ma trận đề thi đã bị xóa")

    questions_out = []
    seq = 1
    total_duration = 0

    for rule in (matrix.rules or []):
        q_type = rule.get("type") if isinstance(rule, dict) else rule.type
        req_count = rule.get("question_count", 1) if isinstance(rule, dict) else rule.question_count

        # Rút trích các câu hỏi đã duyệt
        stmt = (
            select(AcademicQuestion)
            .where(
                AcademicQuestion.type == q_type,
                AcademicQuestion.status == "APPROVED",
                AcademicQuestion.deleted_at.is_(None),
            )
            .order_by(func.random())
            .limit(req_count)
        )
        matched_questions = list(db.scalars(stmt))

        for q in matched_questions:
            questions_out.append(
                SampleExamQuestionOut(
                    sequence=seq,
                    type=q.type,
                    code=q.code,
                    title=q.title,
                    prompt=q.prompt,
                    media_url=q.media_url,
                    prep_time=q.prep_time,
                    response_time=q.response_time,
                    difficulty=q.difficulty,
                )
            )
            total_duration += (q.prep_time + q.response_time)
            seq += 1

    return GeneratedSampleExamOut(
        exam_sample_id=str(uuid.uuid4()),
        matrix_id=matrix.id,
        matrix_name=matrix.name,
        total_questions=len(questions_out),
        total_duration_seconds=total_duration,
        questions=questions_out,
    )


# ============================================================================
# 2. TIÊU CHUẨN RUBRICS (RUBRICS STUDIO) — TASK 4
# ============================================================================

@router.get("/rubrics", response_model=List[RubricOut])
def list_rubrics(db: Session = Depends(get_db), user=Depends(academy)):
    stmt = select(Rubric).order_by(Rubric.created_at.desc())
    rows = db.scalars(stmt).all()
    return [
        RubricOut(
            id=r.id,
            name=r.name,
            description=getattr(r, "description", "") or "",
            course_id=r.course_id,
            criteria=[RubricCriterion(**c) if isinstance(c, dict) else c for c in (r.criteria or [])],
            version=r.version,
            created_at=r.created_at,
            updated_at=r.updated_at,
        )
        for r in rows
    ]


@router.post("/rubrics", status_code=201, response_model=RubricOut)
def create_rubric(body: RubricIn, db: Session = Depends(get_db), user=Depends(academy)):
    # === Rubric Invariant: Sum of weights must equal 100% ===
    total_weight = sum(c.weight for c in body.criteria)
    if abs(total_weight - 100.0) > 0.01:
        fail(
            400,
            "INVALID_RUBRIC_WEIGHT",
            f"Tổng trọng số các tiêu chí phải bằng 100% (hiện tại: {total_weight}%)",
        )

    criteria_data = [c.model_dump() for c in body.criteria]
    row = Rubric(
        name=body.name,
        description=body.description or "",
        course_id=body.course_id,
        criteria=criteria_data,
        version=1,
        updated_at=time.time(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return RubricOut(
        id=row.id,
        name=row.name,
        description=getattr(row, "description", "") or "",
        course_id=row.course_id,
        criteria=[RubricCriterion(**c) for c in (row.criteria or [])],
        version=row.version,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


@router.get("/rubrics/{key}", response_model=RubricOut)
def get_rubric(key: str, db: Session = Depends(get_db), user=Depends(academy)):
    row = by_id(db, Rubric, key)
    return RubricOut(
        id=row.id,
        name=row.name,
        description=getattr(row, "description", "") or "",
        course_id=row.course_id,
        criteria=[RubricCriterion(**c) if isinstance(c, dict) else c for c in (row.criteria or [])],
        version=row.version,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


@router.put("/rubrics/{key}", response_model=RubricOut)
def update_rubric(key: str, body: RubricUpdate, db: Session = Depends(get_db), user=Depends(academy)):
    row = by_id(db, Rubric, key)

    # === Rubric Invariant: Check on criteria update ===
    if body.criteria is not None:
        total_weight = sum(c.weight for c in body.criteria)
        if abs(total_weight - 100.0) > 0.01:
            fail(
                400,
                "INVALID_RUBRIC_WEIGHT",
                f"Tổng trọng số các tiêu chí phải bằng 100% (hiện tại: {total_weight}%)",
            )
        row.criteria = [c.model_dump() for c in body.criteria]
        row.version = (row.version or 1) + 1

    if body.name is not None:
        row.name = body.name
    if body.description is not None:
        row.description = body.description
    if body.course_id is not None:
        row.course_id = body.course_id

    row.updated_at = time.time()
    db.commit()
    db.refresh(row)
    return RubricOut(
        id=row.id,
        name=row.name,
        description=getattr(row, "description", "") or "",
        course_id=row.course_id,
        criteria=[RubricCriterion(**c) if isinstance(c, dict) else c for c in (row.criteria or [])],
        version=row.version,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


@router.delete("/rubrics/{key}")
def delete_rubric(key: str, db: Session = Depends(get_db), user=Depends(academy)):
    row = by_id(db, Rubric, key)
    db.delete(row)
    db.commit()
    return {"ok": True}


# ============================================================================
# 3. QUY CHUẨN DẠNG BÀI (QUESTION TYPE CONFIGS) — TASK 4
# ============================================================================

# Default 6 question types
_QUESTION_TYPE_DEFAULTS = [
    {"type": "RA", "name": "Read Aloud", "description": "Read the passage aloud with correct pronunciation and intonation.", "default_prep_time": 35, "default_response_time": 40, "max_score": 10.0},
    {"type": "RS", "name": "Repeat Sentence", "description": "Repeat the sentence exactly as heard.", "default_prep_time": 3, "default_response_time": 15, "max_score": 10.0},
    {"type": "GD", "name": "Summarize Group Discussion", "description": "Summarize the group discussion within 60 seconds.", "default_prep_time": 10, "default_response_time": 60, "max_score": 10.0},
    {"type": "DI", "name": "Describe Image", "description": "Describe the image in detail within 40 seconds.", "default_prep_time": 25, "default_response_time": 40, "max_score": 10.0},
    {"type": "SI", "name": "Respond to a Situation", "description": "Respond appropriately to the given situation.", "default_prep_time": 20, "default_response_time": 40, "max_score": 10.0},
    {"type": "RL", "name": "Re-tell Lecture", "description": "Re-tell the lecture content within 40 seconds.", "default_prep_time": 10, "default_response_time": 40, "max_score": 10.0},
]


def _ensure_default_question_types(db: Session) -> None:
    """Khởi tạo 6 dạng bài mặc định nếu bảng question_type_configs trống."""
    existing_count = db.query(QuestionTypeConfigModel).count()
    if existing_count == 0:
        for defaults in _QUESTION_TYPE_DEFAULTS:
            db.add(QuestionTypeConfigModel(**defaults, updated_at=time.time()))
        db.commit()


@router.get("/question-types", response_model=List[QuestionTypeConfigOut])
def list_question_types(db: Session = Depends(get_db), user=Depends(academy)):
    _ensure_default_question_types(db)
    stmt = select(QuestionTypeConfigModel).order_by(QuestionTypeConfigModel.type)
    rows = db.scalars(stmt).all()
    return [
        QuestionTypeConfigOut(
            type=r.type,
            name=r.name,
            description=r.description or "",
            default_prep_time=r.default_prep_time,
            default_response_time=r.default_response_time,
            audio_instruction_url=r.audio_instruction_url,
            max_score=r.max_score,
            created_at=r.created_at,
            updated_at=r.updated_at,
        )
        for r in rows
    ]


@router.get("/question-types/{qtype}", response_model=QuestionTypeConfigOut)
def get_question_type(qtype: str, db: Session = Depends(get_db), user=Depends(academy)):
    row = db.scalar(select(QuestionTypeConfigModel).where(QuestionTypeConfigModel.type == qtype.upper()))
    if not row:
        fail(404, "NOT_FOUND", f"Question type '{qtype}' not found")
    return QuestionTypeConfigOut(
        type=row.type,
        name=row.name,
        description=row.description or "",
        default_prep_time=row.default_prep_time,
        default_response_time=row.default_response_time,
        audio_instruction_url=row.audio_instruction_url,
        max_score=row.max_score,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


@router.put("/question-types/{qtype}", response_model=QuestionTypeConfigOut)
def update_question_type(qtype: str, body: QuestionTypeConfigIn, db: Session = Depends(get_db), user=Depends(academy)):
    row = db.scalar(select(QuestionTypeConfigModel).where(QuestionTypeConfigModel.type == qtype.upper()))
    if not row:
        fail(404, "NOT_FOUND", f"Question type '{qtype}' not found")

    row.name = body.name
    row.description = body.description
    row.default_prep_time = body.default_prep_time
    row.default_response_time = body.default_response_time
    row.audio_instruction_url = body.audio_instruction_url
    row.max_score = body.max_score
    row.updated_at = time.time()

    db.commit()
    db.refresh(row)
    return QuestionTypeConfigOut(
        type=row.type,
        name=row.name,
        description=row.description or "",
        default_prep_time=row.default_prep_time,
        default_response_time=row.default_response_time,
        audio_instruction_url=row.audio_instruction_url,
        max_score=row.max_score,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )
