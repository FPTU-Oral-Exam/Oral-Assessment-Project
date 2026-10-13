import time
from fastapi import APIRouter, Depends
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from . import schemas as s
from .db import get_db
from .grading import GradingError, assessment_view, review_question
from .models import (
    Attempt,
    Audit,
    Course,
    Exam,
    ExamBatch,
    ExamSession,
    ReEvaluation,
    ReviewJob,
    ScheduleSlot,
    Section,
    Semester,
    SlotAssignment,
    Upload,
    User,
)
from .retakes import allowance, history_row, sessions_for
from .security import by_id, fail, staff, teacher
from .worker import finalize, grade_answer

router = APIRouter(prefix="/teacher", tags=["Teacher Portal"])

STAGE_LABELS = {
    "READY": "Chưa làm",
    "SUBMITTED": "Đang xếp hàng chờ Worker...",
    "TRANSCRIBING": "Đang phiên âm Whisper STT...",
    "ANALYZING": "Đang phân tích độ trôi chảy & âm học...",
    "GRADING": "AI đang chấm điểm theo Rubric...",
    "GRADED": "Đã chấm xong câu hỏi",
}

STAGE_WEIGHTS = {
    "READY": 0,
    "SUBMITTED": 10,
    "TRANSCRIBING": 35,
    "ANALYZING": 60,
    "GRADING": 85,
    "GRADED": 100,
}


def data(row, *fields):
    return {k: getattr(row, k) for k in ("id", *fields)}


def calculate_session_progress(db: Session, session: ExamSession):
    if session.status in {"COMPLETED", "APPROVED"}:
        return None
    attempts = db.scalars(
        select(Attempt).where(Attempt.session_id == session.id).order_by(Attempt.sequence)
    ).all()
    if not attempts:
        return None

    total = len(attempts)
    completed = sum(1 for a in attempts if a.assessment is not None or a.status == "GRADED")
    active_attempt = next((a for a in attempts if a.assessment is None), None)

    if active_attempt:
        current_stage = active_attempt.status or "SUBMITTED"
        current_seq = active_attempt.sequence
    else:
        current_stage = "GRADED"
        current_seq = total

    stage_label = STAGE_LABELS.get(current_stage, "Đang xử lý AI...")

    total_points = sum(
        100 if a.assessment is not None or a.status == "GRADED" else STAGE_WEIGHTS.get(a.status, 10)
        for a in attempts
    )
    percent = min(99, max(5, int(total_points / total))) if session.status == "SUBMITTED" else 0

    return {
        "total_questions": total,
        "completed_questions": completed,
        "current_sequence": current_seq,
        "current_stage": current_stage,
        "stage_label": stage_label,
        "percent": percent,
    }


def grading_targets(db, exam, attempt):
    targets = []
    for candidate in db.scalars(select(Exam).where(Exam.course_id == exam.course_id, Exam.status == "PUBLISHED")):
        try:
            review_question(exam, candidate, attempt)
        except GradingError:
            continue
        targets.append({"id": candidate.id, "name": candidate.name, "model": candidate.snapshot.get("llm_model") if candidate.snapshot else None})
    return targets


def verify_teacher_exam_access(db: Session, exam_id: str, user):
    """Ensure teacher has permission to grade/view this exam."""
    if user.role in {"SYSTEM_ADMIN", "ADMIN", "EXAMINER"}:
        return
    exam = by_id(db, Exam, exam_id)
    course = by_id(db, Course, exam.course_id)
    if course.code == "ORAL-PRACTICE":
        return
    if course.owner_id == user.id or course.teacher_id == user.id:
        return

    # Check batch assignment
    has_batch = db.scalar(
        select(ExamBatch.id).where(ExamBatch.exam_id == exam_id, ExamBatch.assigned_teacher_id == user.id).limit(1)
    )
    if has_batch:
        return

    # Check section assignment
    has_section = db.scalar(
        select(Section.id).where(Section.course_id == course.id, Section.teacher_id == user.id).limit(1)
    )
    if has_section:
        return

    fail(403, "FORBIDDEN", "Bạn không được phân công chấm hoặc phụ trách ca thi này")


# ─────────────────────────────────────────────────────────────────
# 1. Schedule / Proctoring Endpoints
# ─────────────────────────────────────────────────────────────────

@router.get("/schedule")
def teacher_schedule(db: Session = Depends(get_db), user=Depends(teacher)):
    """Return all exam slots assigned to this teacher."""
    is_super = user.role in {"SYSTEM_ADMIN", "ADMIN", "EXAMINER"}

    query = (
        select(ScheduleSlot, Exam, Course)
        .join(Exam, Exam.id == ScheduleSlot.exam_id)
        .join(Course, Course.id == Exam.course_id)
    )

    if not is_super:
        batch_slot_ids = select(ScheduleSlot.id).join(
            ExamBatch, ExamBatch.id == ScheduleSlot.batch_id
        ).where(ExamBatch.assigned_teacher_id == user.id)

        course_slot_ids = select(ScheduleSlot.id).join(
            Exam, Exam.id == ScheduleSlot.exam_id
        ).where(
            Exam.course_id.in_(
                select(Course.id).where(
                    or_(
                        Course.teacher_id == user.id,
                        Course.owner_id == user.id,
                        Course.code == "ORAL-PRACTICE",
                        Course.code == "PTE-CORE",
                        Course.code.like("PTE%"),
                    )
                )
            )
        )

        section_slot_ids = select(ScheduleSlot.id).join(
            Exam, Exam.id == ScheduleSlot.exam_id
        ).where(
            Exam.course_id.in_(
                select(Section.course_id).where(Section.teacher_id == user.id)
            )
        )

        query = query.where(
            or_(
                ScheduleSlot.id.in_(batch_slot_ids),
                ScheduleSlot.id.in_(course_slot_ids),
                ScheduleSlot.id.in_(section_slot_ids),
            )
        )

    rows = db.execute(query.order_by(ScheduleSlot.date.desc(), ScheduleSlot.start_time.asc())).all()

    results = []
    for slot, exam, course in rows:
        student_count = db.scalar(
            select(func.count()).select_from(SlotAssignment).where(SlotAssignment.slot_id == slot.id)
        ) or 0

        semester_name = "Toàn trường"
        if course.semester_id:
            sem = db.get(Semester, course.semester_id)
            if sem:
                semester_name = sem.name

        batch_name = None
        if slot.batch_id:
            b = db.get(ExamBatch, slot.batch_id)
            if b:
                batch_name = b.name

        results.append({
            "id": slot.id,
            "slot_number": slot.slot_number,
            "room": slot.room,
            "date": slot.date,
            "start_time": slot.start_time,
            "end_time": slot.end_time,
            "status": slot.status,
            "grade_locked": slot.grade_locked,
            "student_count": student_count,
            "exam_id": exam.id,
            "exam_name": exam.name,
            "course_id": course.id,
            "course_name": course.name,
            "course_code": course.code,
            "semester_name": semester_name,
            "batch_id": slot.batch_id,
            "batch_name": batch_name,
        })

    return results


@router.get("/proctor/{slot_id}")
def proctor_room_detail(slot_id: str, db: Session = Depends(get_db), user=Depends(teacher)):
    """Get exam room proctoring details and student roster for the slot."""
    slot = by_id(db, ScheduleSlot, slot_id)
    exam = by_id(db, Exam, slot.exam_id)
    course = by_id(db, Course, exam.course_id)

    verify_teacher_exam_access(db, exam.id, user)

    # Fetch all assigned students
    assignments = db.execute(
        select(SlotAssignment, User)
        .join(User, User.id == SlotAssignment.student_id)
        .where(SlotAssignment.slot_id == slot_id)
    ).all()

    candidates = []
    for _, student in assignments:
        session = db.scalar(
            select(ExamSession).where(
                ExamSession.exam_id == slot.exam_id,
                ExamSession.student_id == student.id,
                ExamSession.deleted_at.is_(None),
            ).order_by(ExamSession.created_at.desc())
        )

        candidates.append({
            "student_id": student.id,
            "name": student.name,
            "username": student.username,
            "email": student.email,
            "status": session.status if session else "NOT_STARTED",
            "session_id": session.id if session else None,
            "started_at": session.started_at if session else None,
            "completed_at": session.completed_at if session else None,
            "final_score": session.final_score if session else None,
        })

    return {
        "slot": {
            "id": slot.id,
            "slot_number": slot.slot_number,
            "room": slot.room,
            "date": slot.date,
            "start_time": slot.start_time,
            "end_time": slot.end_time,
            "status": slot.status,
            "grade_locked": slot.grade_locked,
            "student_count": len(candidates),
        },
        "exam": {
            "id": exam.id,
            "name": exam.name,
            "course_id": course.id,
            "course_name": course.name,
            "course_code": course.code,
        },
        "candidates": candidates,
    }


# ─────────────────────────────────────────────────────────────────
# 2. Grading & Results Endpoints
# ─────────────────────────────────────────────────────────────────

@router.get("/results")
def list_results(
    course_id: str | None = None,
    exam_id: str | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
    user=Depends(teacher),
):
    """Return exam submissions for teacher review."""
    query = (
        select(ExamSession, Exam, User)
        .join(Exam, Exam.id == ExamSession.exam_id)
        .join(User, User.id == ExamSession.student_id)
        .where(ExamSession.deleted_at.is_(None))
    )

    if user.role == "TEACHER":
        query = query.join(Course, Course.id == Exam.course_id).where(
            or_(
                Course.owner_id == user.id,
                Course.teacher_id == user.id,
                Exam.id.in_(
                    select(ExamBatch.exam_id).where(ExamBatch.assigned_teacher_id == user.id)
                ),
                Course.id.in_(
                    select(Section.course_id).where(Section.teacher_id == user.id)
                ),
                Course.code == "ORAL-PRACTICE",
                Course.code == "PTE-CORE",
                Course.code.like("PTE%"),
            )
        )

    if course_id:
        query = query.where(Exam.course_id == course_id)
    if exam_id:
        query = query.where(Exam.id == exam_id)
    if status:
        query = query.where(ExamSession.status == status)

    session_rows = []
    for session, exam, student in db.execute(query.order_by(ExamSession.created_at.desc())):
        row = (
            history_row(session)
            | {
                "exam_name": exam.name,
                "student_name": student.name,
                "student_id": student.id,
                "exam_id": exam.id,
                **allowance(db, exam, student.id),
            }
        )
        if session.status == "SUBMITTED":
            row["progress"] = calculate_session_progress(db, session)
        session_rows.append(row)

    return session_rows


@router.get("/results/{session_id}")
def get_result_detail(session_id: str, db: Session = Depends(get_db), user=Depends(teacher)):
    """Get complete session grading detail."""
    session = by_id(db, ExamSession, session_id)
    if session.deleted_at is not None:
        fail(404, "NOT_FOUND", "Lần thi đã bị xóa")

    exam = by_id(db, Exam, session.exam_id)
    verify_teacher_exam_access(db, exam.id, user)

    student = by_id(db, User, session.student_id)
    attempts = db.scalars(
        select(Attempt).where(Attempt.session_id == session_id).order_by(Attempt.sequence)
    ).all()
    session_progress = calculate_session_progress(db, session) if session.status == "SUBMITTED" else None

    return history_row(session) | {
        "progress": session_progress,
        "exam_id": exam.id,
        "student_id": session.student_id,
        **allowance(db, exam, session.student_id),
        "history": [history_row(row) for row in sessions_for(db, exam.id, session.student_id)],
        "exam_name": exam.name,
        "snapshot": exam.snapshot,
        "student_name": student.name,
        "attempts": [
            data(a, "sequence", "question", "transcript", "stt_confidence", "assessment", "status")
            | {
                "stage": a.status,
                "stage_label": STAGE_LABELS.get(a.status, a.status),
                "assessment": assessment_view(a.assessment, exam),
                "grading_targets": grading_targets(db, exam, a),
                "evidence": [
                    data(e, "id", "kind", "status", "sha256", "size")
                    for e in db.scalars(
                        select(Upload).where(Upload.attempt_id == a.id, Upload.status == "COMPLETED")
                    )
                ],
                "reviews": [
                    data(
                        j,
                        "status",
                        "reason",
                        "policy",
                        "original",
                        "result",
                        "error",
                        "created_at",
                        "completed_at",
                        "requested_by",
                    )
                    for j in db.scalars(
                        select(ReviewJob)
                        .where(ReviewJob.attempt_id == a.id)
                        .order_by(ReviewJob.created_at.desc())
                    )
                ],
            }
            for a in attempts
        ],
    }


@router.post("/attempts/{attempt_id}/override")
def override_score(
    attempt_id: str,
    body: s.ScoreOverrideIn,
    db: Session = Depends(get_db),
    user=Depends(teacher),
):
    """Adjust score with mandatory reason."""
    attempt = by_id(db, Attempt, attempt_id, lock=True)
    session = by_id(db, ExamSession, attempt.session_id, lock=True)
    if session.deleted_at is not None:
        fail(404, "NOT_FOUND", "Lần thi đã bị xóa")

    exam = by_id(db, Exam, session.exam_id)
    verify_teacher_exam_access(db, exam.id, user)

    assessment = dict(attempt.assessment or {})
    prev_score = assessment.get("score")
    assessment["score"] = round(body.score, 2)
    assessment["manual_override"] = True
    assessment["override_reason"] = body.reason
    assessment["override_by"] = user.name
    assessment["overridden_at"] = time.time()

    if body.criteria and "criteria" in assessment:
        override_map = {c.name: c for c in body.criteria}
        updated_criteria = []
        for crit in assessment.get("criteria", []):
            crit_copy = dict(crit)
            if crit_copy.get("name") in override_map:
                item = override_map[crit_copy["name"]]
                crit_copy["score"] = item.score
                if item.feedback:
                    crit_copy["feedback"] = item.feedback
            updated_criteria.append(crit_copy)
        assessment["criteria"] = updated_criteria

    attempt.assessment = assessment
    attempt.status = "GRADED"
    db.flush()

    # Recalculate session final score
    attempts = db.scalars(select(Attempt).where(Attempt.session_id == session.id)).all()
    scores = [a.assessment.get("score") for a in attempts if a.assessment]
    if scores and all(sc is not None for sc in scores):
        session.final_score = round(sum(scores) / len(scores), 2)

    db.add(
        Audit(
            user_id=user.id,
            event="ATTEMPT_SCORE_OVERRIDDEN",
            details={
                "attempt_id": attempt_id,
                "session_id": session.id,
                "prev_score": prev_score,
                "score": body.score,
                "reason": body.reason,
            },
        )
    )
    db.commit()

    return data(attempt, "sequence", "question", "transcript", "stt_confidence", "assessment", "status") | {
        "assessment": assessment_view(attempt.assessment, exam)
    }


@router.post("/attempts/{attempt_id}/regrade")
def regrade_transcript(
    attempt_id: str,
    body: s.RegradeTranscriptIn,
    db: Session = Depends(get_db),
    user=Depends(teacher),
):
    """Correct transcript and trigger AI regrading."""
    attempt = by_id(db, Attempt, attempt_id, lock=True)
    session = by_id(db, ExamSession, attempt.session_id, lock=True)
    if session.deleted_at is not None:
        fail(404, "NOT_FOUND", "Lần thi đã bị xóa")

    exam = by_id(db, Exam, session.exam_id)
    verify_teacher_exam_access(db, exam.id, user)

    prev_transcript = attempt.transcript
    attempt.transcript = body.corrected_transcript

    if not attempt.finished_at:
        attempt.finished_at = time.time()

    try:
        assessment = grade_answer(
            db,
            exam,
            session,
            attempt,
            body.corrected_transcript,
            attempt.stt_confidence or 1.0,
        )
    except Exception as exc:
        fail(500, "REGRADE_FAILED", f"Lỗi chấm lại: {exc}")

    assessment["transcript_edited"] = True
    assessment["original_transcript"] = prev_transcript
    assessment["edit_reason"] = body.reason
    assessment["edited_by"] = user.name
    assessment["edited_at"] = time.time()

    attempt.assessment = assessment
    attempt.status = "GRADED"
    db.flush()

    finalize(db, session)

    db.add(
        Audit(
            user_id=user.id,
            event="TRANSCRIPT_REGRADED",
            details={
                "attempt_id": attempt_id,
                "session_id": session.id,
                "reason": body.reason,
                "score": assessment.get("score"),
            },
        )
    )
    db.commit()

    return data(attempt, "sequence", "question", "transcript", "stt_confidence", "assessment", "status") | {
        "assessment": assessment_view(attempt.assessment, exam)
    }


@router.post("/results/{session_id}/approve")
def approve_result(
    session_id: str,
    db: Session = Depends(get_db),
    user=Depends(teacher),
):
    """Finalize and approve session score."""
    session = by_id(db, ExamSession, session_id, lock=True)
    if session.deleted_at is not None:
        fail(404, "NOT_FOUND", "Lần thi đã bị xóa")

    exam = by_id(db, Exam, session.exam_id)
    verify_teacher_exam_access(db, exam.id, user)

    attempts = db.scalars(select(Attempt).where(Attempt.session_id == session_id)).all()
    if not attempts:
        fail(409, "NO_ATTEMPTS", "Chưa có câu trả lời nào để duyệt")

    for a in attempts:
        if not a.assessment or a.assessment.get("score") is None:
            fail(409, "INCOMPLETE_GRADING", f"Câu {a.sequence} chưa hoàn tất chấm điểm")

    scores = [a.assessment.get("score") for a in attempts]
    session.final_score = round(sum(scores) / len(scores), 2)
    session.status = "COMPLETED"

    db.add(
        Audit(
            user_id=user.id,
            event="EXAM_SESSION_APPROVED",
            details={"session_id": session_id, "student_id": session.student_id, "final_score": session.final_score},
        )
    )
    db.commit()

    return {
        "id": session.id,
        "status": session.status,
        "final_score": session.final_score,
    }


# ─────────────────────────────────────────────────────────────────
# 3. Re-evaluations (Blind Marking) Endpoints
# ─────────────────────────────────────────────────────────────────

@router.get("/re-evaluations")
def list_re_evaluations(db: Session = Depends(get_db), user=Depends(teacher)):
    """List 2nd grading requests assigned to or requested by this teacher."""
    query = select(ReEvaluation).order_by(ReEvaluation.created_at.desc())
    if user.role == "TEACHER":
        query = query.where((ReEvaluation.teacher_id_1 == user.id) | (ReEvaluation.teacher_id_2 == user.id))

    rows = db.scalars(query).all()
    results = []
    for r in rows:
        att = db.get(Attempt, r.attempt_id)
        sess = db.get(ExamSession, att.session_id) if att else None
        student = db.get(User, sess.student_id) if sess else None
        t1 = db.get(User, r.teacher_id_1)
        t2 = db.get(User, r.teacher_id_2)

        is_blind = r.blind_marking and user.id == r.teacher_id_2 and r.status != "COMPLETED"

        results.append({
            "id": r.id,
            "attempt_id": r.attempt_id,
            "session_id": sess.id if sess else None,
            "student_name": student.name if student else "N/A",
            "teacher_1_name": t1.name if t1 else "Giảng viên 1",
            "teacher_2_name": t2.name if t2 else "Giảng viên 2",
            "reason": r.reason,
            "reason_detail": r.reason_detail,
            "status": r.status,
            "score_1": None if is_blind else r.score_1,
            "score_2": r.score_2,
            "final_score": r.final_score,
            "blind_marking": r.blind_marking,
            "created_at": r.created_at,
            "completed_at": r.completed_at,
        })

    return results


@router.post("/re-evaluations/{re_eval_id}/submit")
def submit_re_evaluation(
    re_eval_id: str,
    body: s.ReEvaluationSubmitIn,
    db: Session = Depends(get_db),
    user=Depends(teacher),
):
    """Submit 2nd grading score for blind marking."""
    row = by_id(db, ReEvaluation, re_eval_id, lock=True)
    if user.role == "TEACHER" and row.teacher_id_2 != user.id:
        fail(403, "FORBIDDEN", "Bạn không phải giảng viên được phân công chấm thẩm định này")

    row.score_2 = round(body.score_2, 2)
    if row.score_1 is not None:
        row.final_score = round((row.score_1 + row.score_2) / 2, 2)
    else:
        row.final_score = row.score_2

    row.status = "COMPLETED"
    row.completed_at = time.time()

    att = db.get(Attempt, row.attempt_id)
    if att:
        assessment = dict(att.assessment or {})
        assessment["score"] = row.final_score
        assessment["re_evaluated"] = True
        assessment["re_eval_id"] = row.id
        att.assessment = assessment
        sess = db.get(ExamSession, att.session_id)
        if sess:
            attempts = db.scalars(select(Attempt).where(Attempt.session_id == sess.id)).all()
            scores = [a.assessment.get("score") for a in attempts if a.assessment]
            if scores and all(sc is not None for sc in scores):
                sess.final_score = round(sum(scores) / len(scores), 2)

    db.add(
        Audit(
            user_id=user.id,
            event="REEVALUATION_SUBMITTED",
            details={
                "re_eval_id": re_eval_id,
                "attempt_id": row.attempt_id,
                "score_2": row.score_2,
                "final_score": row.final_score,
            },
        )
    )
    db.commit()

    return {
        "id": row.id,
        "status": row.status,
        "score_2": row.score_2,
        "final_score": row.final_score,
    }


@router.post("/attempts/{attempt_id}/request-re-eval")
def request_re_evaluation(
    attempt_id: str,
    body: s.ReEvaluationIn,
    db: Session = Depends(get_db),
    user=Depends(teacher),
):
    """Request independent 2nd evaluation for a disputed attempt."""
    attempt = by_id(db, Attempt, attempt_id)
    session = by_id(db, ExamSession, attempt.session_id)
    exam = by_id(db, Exam, session.exam_id)
    verify_teacher_exam_access(db, exam.id, user)

    by_id(db, User, body.teacher_id_2)

    original_score = attempt.assessment.get("score") if attempt.assessment else None

    row = ReEvaluation(
        attempt_id=attempt_id,
        teacher_id_1=user.id,
        teacher_id_2=body.teacher_id_2,
        reason=body.reason,
        reason_detail=body.reason_detail,
        blind_marking=body.blind_marking,
        score_1=original_score,
        status="PENDING",
    )
    db.add(row)
    db.add(
        Audit(
            user_id=user.id,
            event="REEVALUATION_REQUESTED",
            details={
                "attempt_id": attempt_id,
                "teacher_id_1": user.id,
                "teacher_id_2": body.teacher_id_2,
                "reason": body.reason,
            },
        )
    )
    db.commit()

    return {"id": row.id, "status": row.status}
