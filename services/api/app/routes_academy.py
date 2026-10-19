import time
import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, or_, select, update
from sqlalchemy.orm import Session

from .db import get_db
from .models import AcademicMatrix, AcademicQuestion, QuestionTypeConfigModel, Rubric
from .schemas_academy import (
    AcademicMatrixIn,
    AcademicMatrixOut,
    AcademicMatrixUpdate,
    AcademicQuestionIn,
    AcademicQuestionOut,
    AcademicQuestionsStatsOut,
    AcademicQuestionUpdate,
    ExamMatrixRule,
    GeneratedSampleExamOut,
    QuestionTypeConfigIn,
    QuestionTypeConfigOut,
    QuestionTypeCreateIn,
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
    limit: int = Query(default=2000, ge=1, le=5000),
    offset: int = Query(default=0, ge=0),
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


@router.get("/questions/stats", response_model=AcademicQuestionsStatsOut)
def get_questions_stats(
    db: Session = Depends(get_db),
    user=Depends(academy),
):
    base_filter = AcademicQuestion.deleted_at.is_(None)
    total = db.scalar(select(func.count(AcademicQuestion.id)).where(base_filter)) or 0

    type_counts = dict(
        db.execute(
            select(AcademicQuestion.type, func.count(AcademicQuestion.id))
            .where(base_filter)
            .group_by(AcademicQuestion.type)
        ).all()
    )

    diff_counts = dict(
        db.execute(
            select(AcademicQuestion.difficulty, func.count(AcademicQuestion.id))
            .where(base_filter)
            .group_by(AcademicQuestion.difficulty)
        ).all()
    )

    status_counts = dict(
        db.execute(
            select(AcademicQuestion.status, func.count(AcademicQuestion.id))
            .where(base_filter)
            .group_by(AcademicQuestion.status)
        ).all()
    )

    return AcademicQuestionsStatsOut(
        total=total,
        by_type=type_counts,
        by_difficulty=diff_counts,
        by_status=status_counts,
    )


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

# Default 7 question types
_QUESTION_TYPE_DEFAULTS = [
    {
        "type": "RA",
        "name": "Read Aloud",
        "vietnamese_name": "Đọc to văn bản học thuật",
        "description": "Thí sinh quan sát đoạn văn bản trên màn hình và đọc to rõ ràng, chuẩn phát âm và nhịp điệu.",
        "default_prep_time": 35,
        "default_response_time": 40,
        "max_score": 10.0,
        "is_active": True,
        "requires_image": False,
        "requires_audio_prompt": False,
        "requires_audio_script": False,
        "requires_key_points": False,
        "recommended_question_count": 2,
    },
    {
        "type": "RS",
        "name": "Repeat Sentence",
        "vietnamese_name": "Lặp lại câu nguyên bản",
        "description": "Lắng nghe một câu ngắn học thuật và lặp lại chính xác từng từ với ngữ điệu tự nhiên.",
        "default_prep_time": 3,
        "default_response_time": 15,
        "max_score": 10.0,
        "is_active": True,
        "requires_image": False,
        "requires_audio_prompt": True,
        "requires_audio_script": False,
        "requires_key_points": False,
        "recommended_question_count": 3,
    },
    {
        "type": "GD",
        "name": "Summarize Group Discussion",
        "vietnamese_name": "Tóm tắt thảo luận nhóm",
        "description": "Lắng nghe đoạn thảo luận nhóm học thuật và phát biểu tóm tắt các luận điểm trọng yếu.",
        "default_prep_time": 10,
        "default_response_time": 60,
        "max_score": 10.0,
        "is_active": True,
        "requires_image": False,
        "requires_audio_prompt": True,
        "requires_audio_script": False,
        "requires_key_points": True,
        "recommended_question_count": 1,
    },
    {
        "type": "DI",
        "name": "Describe Image",
        "vietnamese_name": "Miêu tả hình ảnh / biểu đồ",
        "description": "Quan sát biểu đồ, sơ đồ hoặc hình ảnh học thuật và trình bày phân tích các xu hướng chính.",
        "default_prep_time": 25,
        "default_response_time": 40,
        "max_score": 10.0,
        "is_active": True,
        "requires_image": True,
        "requires_audio_prompt": False,
        "requires_audio_script": False,
        "requires_key_points": True,
        "recommended_question_count": 3,
    },
    {
        "type": "SI",
        "name": "Respond to a Situation",
        "vietnamese_name": "Ứng đáp tình huống học thuật",
        "description": "Đọc tình huống giả định giao tiếp đại học và đưa ra phản hồi giải quyết thấu đáo, lịch thiệp.",
        "default_prep_time": 20,
        "default_response_time": 40,
        "max_score": 10.0,
        "is_active": True,
        "requires_image": False,
        "requires_audio_prompt": False,
        "requires_audio_script": False,
        "requires_key_points": True,
        "recommended_question_count": 2,
    },
    {
        "type": "RL",
        "name": "Re-tell Lecture",
        "vietnamese_name": "Thuyết trình lại bài giảng",
        "description": "Lắng nghe bài giảng học thuật ngắn (60-90s) và thuyết trình tóm tắt lại nội dung cốt lõi.",
        "default_prep_time": 10,
        "default_response_time": 40,
        "max_score": 10.0,
        "is_active": True,
        "requires_image": False,
        "requires_audio_prompt": True,
        "requires_audio_script": False,
        "requires_key_points": True,
        "recommended_question_count": 2,
    },
    {
        "type": "ASQ",
        "name": "Answer Short Question",
        "vietnamese_name": "Trả lời câu hỏi ngắn",
        "description": "Lắng nghe câu hỏi vấn đáp ngắn và trả lời bằng một hoặc vài từ súc tích, chính xác.",
        "default_prep_time": 3,
        "default_response_time": 10,
        "max_score": 10.0,
        "is_active": True,
        "requires_image": False,
        "requires_audio_prompt": True,
        "requires_audio_script": False,
        "requires_key_points": False,
        "recommended_question_count": 4,
    },
]


def _serialize_question_type(row: QuestionTypeConfigModel, question_count: int = 0) -> QuestionTypeConfigOut:
    return QuestionTypeConfigOut(
        type=row.type,
        name=row.name,
        vietnamese_name=row.vietnamese_name or row.name,
        description=row.description or "",
        default_prep_time=row.default_prep_time,
        default_response_time=row.default_response_time,
        audio_instruction_url=row.audio_instruction_url,
        max_score=row.max_score,
        is_active=row.is_active,
        requires_image=row.requires_image,
        requires_audio_prompt=row.requires_audio_prompt,
        requires_audio_script=row.requires_audio_script,
        requires_key_points=row.requires_key_points,
        recommended_question_count=row.recommended_question_count,
        question_count=question_count,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _ensure_default_question_types(db: Session) -> None:
    """Khởi tạo 7 dạng bài mặc định nếu bảng question_type_configs trống."""
    existing_count = db.query(QuestionTypeConfigModel).count()
    if existing_count == 0:
        now = time.time()
        for defaults in _QUESTION_TYPE_DEFAULTS:
            db.add(QuestionTypeConfigModel(**defaults, created_at=now, updated_at=now))
        db.commit()


@router.get("/question-types", response_model=List[QuestionTypeConfigOut])
def list_question_types(db: Session = Depends(get_db), user=Depends(academy)):
    _ensure_default_question_types(db)
    stmt = select(QuestionTypeConfigModel).order_by(QuestionTypeConfigModel.type)
    rows = db.scalars(stmt).all()

    # Query số lượng câu hỏi hiện có trong Item Bank theo từng type
    counts_stmt = (
        select(AcademicQuestion.type, func.count(AcademicQuestion.id))
        .where(AcademicQuestion.deleted_at.is_(None))
        .group_by(AcademicQuestion.type)
    )
    counts_map = dict(db.execute(counts_stmt).all())

    return [_serialize_question_type(r, question_count=counts_map.get(r.type, 0)) for r in rows]


@router.post("/question-types", response_model=QuestionTypeConfigOut, status_code=201)
def create_question_type(body: QuestionTypeCreateIn, db: Session = Depends(get_db), user=Depends(academy)):
    normalized_type = body.type.strip().upper()
    existing = db.scalar(select(QuestionTypeConfigModel).where(QuestionTypeConfigModel.type == normalized_type))
    if existing:
        fail(409, "CONFLICT", f"Question type '{normalized_type}' already exists")

    now = time.time()
    row = QuestionTypeConfigModel(
        type=normalized_type,
        name=body.name.strip(),
        vietnamese_name=(body.vietnamese_name or body.name).strip(),
        description=body.description or "",
        default_prep_time=body.default_prep_time,
        default_response_time=body.default_response_time,
        audio_instruction_url=body.audio_instruction_url,
        max_score=body.max_score,
        is_active=body.is_active,
        requires_image=body.requires_image,
        requires_audio_prompt=body.requires_audio_prompt,
        requires_audio_script=body.requires_audio_script,
        requires_key_points=body.requires_key_points,
        recommended_question_count=body.recommended_question_count,
        created_at=now,
        updated_at=now,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _serialize_question_type(row, question_count=0)


@router.get("/question-types/{qtype}", response_model=QuestionTypeConfigOut)
def get_question_type(qtype: str, db: Session = Depends(get_db), user=Depends(academy)):
    row = db.scalar(select(QuestionTypeConfigModel).where(QuestionTypeConfigModel.type == qtype.upper()))
    if not row:
        fail(404, "NOT_FOUND", f"Question type '{qtype}' not found")

    count = (
        db.scalar(
            select(func.count(AcademicQuestion.id)).where(
                AcademicQuestion.type == qtype.upper(), AcademicQuestion.deleted_at.is_(None)
            )
        )
        or 0
    )
    return _serialize_question_type(row, question_count=count)


@router.put("/question-types/{qtype}", response_model=QuestionTypeConfigOut)
def update_question_type(
    qtype: str,
    body: QuestionTypeConfigIn,
    sync_existing_questions: bool = Query(default=False),
    db: Session = Depends(get_db),
    user=Depends(academy),
):
    row = db.scalar(select(QuestionTypeConfigModel).where(QuestionTypeConfigModel.type == qtype.upper()))
    if not row:
        fail(404, "NOT_FOUND", f"Question type '{qtype}' not found")

    now = time.time()
    # Cho phép sửa thời lượng thi, trạng thái mở và số câu khuyến nghị
    row.default_prep_time = body.default_prep_time
    row.default_response_time = body.default_response_time
    row.is_active = body.is_active
    row.recommended_question_count = body.recommended_question_count

    if body.name:
        row.name = body.name.strip()
    if body.vietnamese_name:
        row.vietnamese_name = body.vietnamese_name.strip()
    if body.description:
        row.description = body.description
    if body.audio_instruction_url is not None:
        row.audio_instruction_url = body.audio_instruction_url
    if body.max_score:
        row.max_score = body.max_score
    row.updated_at = now

    # Đồng bộ sang các câu hỏi cũ trong Item Bank nếu người dùng xác nhận
    if sync_existing_questions:
        db.execute(
            update(AcademicQuestion)
            .where(AcademicQuestion.type == qtype.upper(), AcademicQuestion.deleted_at.is_(None))
            .values(
                prep_time=body.default_prep_time,
                response_time=body.default_response_time,
                updated_at=now,
            )
        )

    db.commit()
    db.refresh(row)

    count = (
        db.scalar(
            select(func.count(AcademicQuestion.id)).where(
                AcademicQuestion.type == qtype.upper(), AcademicQuestion.deleted_at.is_(None)
            )
        )
        or 0
    )
    return _serialize_question_type(row, question_count=count)

