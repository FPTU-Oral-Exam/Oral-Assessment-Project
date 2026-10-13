import time
import uuid
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .db import get_db
from .models import AcademicMatrix, AcademicQuestion
from .schemas_academy import (
    AcademicMatrixIn,
    AcademicMatrixOut,
    AcademicMatrixUpdate,
    ExamMatrixRule,
    GeneratedSampleExamOut,
    SampleExamQuestionOut,
    StockHealthItem,
    StockHealthOut,
)
from .security import academy, by_id, fail

router = APIRouter(prefix="/academy", tags=["Academy"])


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
