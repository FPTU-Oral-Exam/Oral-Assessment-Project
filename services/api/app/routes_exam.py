import hashlib
import math
import os
import tempfile
import time
from pathlib import Path

from fastapi import APIRouter, Depends, Header, Request
from fastapi.responses import StreamingResponse
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from . import schemas as s
from . import storage
from .config import settings
from .db import get_db
from .grading import GradingError, check_config
from .models import (
    Assignment, Attempt, Audit, Course, CourseCandidate, CourseEnrollment,
    Exam, ExamBatch, ExamEnrollment, ExamSession, ExamVariant, ScheduleSlot,
    Section, SlotAssignment, Upload, User
)
from .practice import COURSE_ID
from .retakes import ACTIVE, allowance, history_row, sessions_for
from .security import by_id, course_access, current_user, fail, student
from .worker import finalize

router = APIRouter()


def owned_session(db, key, user, lock=False):
    session = by_id(db, ExamSession, key, lock)
    if session.deleted_at is not None:
        fail(404, "NOT_FOUND", "Lần thi đã bị xóa")
    if session.student_id != user.id:
        fail(403, "FORBIDDEN", "Phiên thi không thuộc sinh viên")
    return session


def owned_attempt(db, key, user, lock=False):
    attempt = by_id(db, Attempt, key, lock)
    session = owned_session(db, attempt.session_id, user)
    return attempt, session


def active(db, session):
    if session.status != "IN_PROGRESS":
        fail(409, "EXAM_SESSION_NOT_ACTIVE", "Phiên thi không hoạt động")
    exam = by_id(db, Exam, session.exam_id)
    if not bool(exam.snapshot.get("practice")) and time.time() > session.started_at + exam.time_limit:
        fail(409, "EXAM_EXPIRED", "Đã hết giờ. Bạn có thể nộp bài để giảng viên xem lại.")


def public_session(db, session):
    exam = by_id(db, Exam, session.exam_id)
    attempts = db.scalars(
        select(Attempt).where(Attempt.session_id == session.id).order_by(Attempt.sequence)
    ).all()
    first = next((a for a in attempts if a.status in {"READY", "STARTED"}), None)
    if exam.snapshot.get("practice"):
        grading_message = "Bài luyện tập không tính điểm."
    elif exam.snapshot.get("ai_provider") == "demo" and not any(
        (a.assessment or {}).get("grading_exam_id") for a in attempts
    ):
        grading_message = "Đề thi ở chế độ demo: AI không chấm điểm. Liên hệ giảng viên để được giao đề có bật chấm điểm AI."
    elif session.status == "SUBMITTED":
        grading_message = "Đã nộp bài, đang chờ máy chủ chấm điểm. Nếu chờ lâu, hãy liên hệ giảng viên kiểm tra dịch vụ chấm điểm."
    elif session.status == "REVIEW_REQUIRED":
        grading_message = (
            "Chấm tự động thất bại; cần giảng viên kiểm tra và chấm lại."
            if any((a.assessment or {}).get("error") for a in attempts)
            else "Bài cần giảng viên xem lại trước khi công bố điểm chính thức."
        )
    else:
        grading_message = None
    return {
        "id": session.id,
        "attempt_number": session.attempt_number,
        "exam_name": exam.name,
        "practice": bool(exam.snapshot.get("practice")),
        "status": session.status,
        "started_at": session.started_at,
        "time_limit": exam.time_limit,
        "server_time": time.time(),
        "final_score": session.final_score if session.status == "COMPLETED" else None,
        "grading_message": grading_message,
        "question_count": len(attempts),
        "answered_count": sum(a.status in {"SUBMITTED", "GRADED"} for a in attempts),
        "current_attempt": (
            {
                "id": first.id,
                "sequence": first.sequence,
                "text": first.question["text"],
                "type": first.question.get("type", "OPEN_RESPONSE"),
                "instruction": first.question.get("instruction"),
                "prompt_audio": first.question.get("prompt_audio"),
                "prompt_image": first.question.get("prompt_image"),
                "prep_time": first.question.get("prep_time", 0),
                "speak_time": first.question.get("speak_time", 40),
                "silence_timeout": first.question.get("silence_timeout", 3),
                "model_audio": first.question.get("model_audio"),
                "status": first.status,
            }
            if first and session.status == "IN_PROGRESS"
            else None
        ),
    }


@router.get("/exams/available")
def available(db: Session = Depends(get_db), user=Depends(current_user)):
    exams = db.scalars(
        select(Exam)
        .where(
            Exam.status == "PUBLISHED",
            or_(
                Exam.course_id == COURSE_ID,
                Exam.course_id.in_(
                    select(CourseEnrollment.course_id).where(CourseEnrollment.student_id == user.id)
                ),
                Exam.id.in_(select(Assignment.exam_id).where(Assignment.student_id == user.id)),
                Exam.id.in_(
                    select(ScheduleSlot.exam_id)
                    .join(SlotAssignment, SlotAssignment.slot_id == ScheduleSlot.id)
                    .where(SlotAssignment.student_id == user.id)
                ),
                Exam.course_id.in_(
                    select(CourseCandidate.course_id)
                    .where(CourseCandidate.student_id == user.id, CourseCandidate.eligibility_status == "ELIGIBLE")
                ),
            ),
        )
        .order_by(Exam.created_at)
    ).all()
    result = []
    for exam in exams:
        sessions = sessions_for(db, exam.id, user.id)
        session = next((s for s in sessions if s.status in ACTIVE), sessions[0] if sessions else None)
        snap = exam.snapshot or {}
        questions = snap.get("questions") or []
        course_obj = db.get(Course, exam.course_id)
        course_code = course_obj.code if course_obj else ""

        # Map Level information
        LEVEL_MAP = {
            "ENT001": {"level": "Level 1", "cefr": "A1", "title": "Level 1: Tiếng Anh Dự bị 1 (A1)", "format": "Part 1: Phỏng vấn (5 câu) + Part 2: Miêu tả tranh"},
            "ENT104": {"level": "Level 2", "cefr": "A2", "title": "Level 2: Tiếng Anh Cơ sở 2 (A2)", "format": "Part 1: Phỏng vấn (5 câu) + Part 2: Miêu tả tranh"},
            "ENT203": {"level": "Level 3", "cefr": "B1", "title": "Level 3: Tiếng Anh Giao tiếp 3 (B1)", "format": "Part 1: Đóng vai với Local AI (Role-play) + Part 2: Thảo luận sâu"},
            "ENT303": {"level": "Level 4", "cefr": "B1+", "title": "Level 4: Tiếng Anh Học thuật 4 (B1+)", "format": "Part 1: Đóng vai với Local AI (Role-play) + Part 2: Thảo luận sâu"},
            "ENT403": {"level": "Level 5", "cefr": "B2", "title": "Level 5: Tiếng Anh Nâng cao 5 (B2)", "format": "Part 1: Thuyết trình độc thoại (Long Run) + Part 2: Phản biện"},
            "ENT503": {"level": "Level 6", "cefr": "B2+", "title": "Level 6: Tiếng Anh Biện luận 6 (B2+)", "format": "Part 1: Thuyết trình độc thoại (Long Run) + Part 2: Phản biện chuyên sâu"},
        }
        lvl = LEVEL_MAP.get(course_code, {
            "level": "Speaking",
            "cefr": "Standard",
            "title": course_obj.name if course_obj else exam.name,
            "format": "ENTs Speaking Assessment"
        })

        # Find assigned ScheduleSlot for this student & exam
        slot_assign = db.scalar(
            select(SlotAssignment)
            .join(ScheduleSlot, ScheduleSlot.id == SlotAssignment.slot_id)
            .where(ScheduleSlot.exam_id == exam.id, SlotAssignment.student_id == user.id)
        )
        slot_info = None
        if slot_assign:
            slot_obj = db.get(ScheduleSlot, slot_assign.slot_id)
            if slot_obj:
                teacher_obj = db.get(User, slot_obj.teacher_id) if slot_obj.teacher_id else None
                batch_obj = db.get(ExamBatch, slot_obj.batch_id) if slot_obj.batch_id else None
                slot_info = {
                    "slot_id": slot_obj.id,
                    "slot_number": slot_obj.slot_number,
                    "batch_name": batch_obj.name if batch_obj else f"Ca {slot_obj.slot_number}",
                    "room": slot_obj.room,
                    "date": slot_obj.date,
                    "start_time": slot_obj.start_time,
                    "end_time": slot_obj.end_time,
                    "teacher_name": teacher_obj.name if teacher_obj else "Cán bộ coi thi",
                    "status": slot_obj.status,
                }

        # Resolve student class section
        sec_code = db.scalar(
            select(Section.code)
            .join(ExamEnrollment, ExamEnrollment.section_id == Section.id)
            .where(ExamEnrollment.student_id == user.id, Section.course_id == exam.course_id)
        )

        result.append(
            {
                "id": exam.id,
                "name": exam.name,
                "course_id": exam.course_id,
                "course_name": course_obj.name if course_obj else "",
                "course_code": course_code,
                "level_number": lvl["level"],
                "cefr_level": lvl["cefr"],
                "level_title": lvl["title"],
                "format_summary": lvl["format"],
                "class_code": sec_code or "Lớp chung",
                "slot_info": slot_info,
                "practice": bool(snap.get("practice")),
                "time_limit": exam.time_limit,
                "question_count": len(questions) if questions else (exam.question_count or 2),
                "session_id": session.id if session else None,
                "status": session.status if session else "ASSIGNED",
                **allowance(db, exam, user.id, sessions),
                "history": [history_row(s) for s in sessions],
            }
        )
    return result


@router.post("/exam-sessions")
def create_session(body: s.SessionIn, db: Session = Depends(get_db), user=Depends(current_user)):
    exam = by_id(db, Exam, body.exam_id, lock=True)
    allowed = (
        exam.course_id == COURSE_ID
        or db.scalar(
            select(CourseEnrollment.id).where(
                CourseEnrollment.course_id == exam.course_id, CourseEnrollment.student_id == user.id
            )
        )
        or db.scalar(
            select(Assignment.id).where(Assignment.exam_id == exam.id, Assignment.student_id == user.id)
        )
        or db.scalar(
            select(SlotAssignment.id)
            .join(ScheduleSlot, ScheduleSlot.id == SlotAssignment.slot_id)
            .where(ScheduleSlot.exam_id == exam.id, SlotAssignment.student_id == user.id)
        )
        or db.scalar(
            select(CourseCandidate.id).where(
                CourseCandidate.course_id == exam.course_id,
                CourseCandidate.student_id == user.id,
                CourseCandidate.eligibility_status == "ELIGIBLE",
            )
        )
    )
    if exam.status != "PUBLISHED" or not allowed:
        fail(403, "NOT_ASSIGNED", "Bạn chưa được giao bài thi này")
    sessions = sessions_for(db, exam.id, user.id)
    existing = next((s for s in sessions if s.status in ACTIVE), None)
    if existing:
        return public_session(db, existing)
    if sessions and not body.new_attempt:
        return public_session(db, sessions[0])
    try:
        check_config(exam)
    except GradingError as exc:
        fail(409, exc.code, str(exc))
    if not allowance(db, exam, user.id, sessions)["can_start_new"]:
        fail(409, "ATTEMPT_LIMIT", "Đã hết lượt làm bài. Liên hệ admin để được cấp thêm lượt.")
    last_number = db.scalar(select(func.max(ExamSession.attempt_number)).where(
        ExamSession.exam_id == exam.id, ExamSession.student_id == user.id,
    )) or 0
    session = ExamSession(exam_id=exam.id, student_id=user.id, attempt_number=last_number + 1)
    db.add(session)
    db.flush()

    # Determine questions for this attempt:
    # 1. Check if student is assigned to a schedule slot with an assigned exam variant (ATA)
    questions_to_use = None
    assignment_slot = db.scalar(
        select(ScheduleSlot)
        .join(SlotAssignment, SlotAssignment.slot_id == ScheduleSlot.id)
        .where(
            ScheduleSlot.exam_id == exam.id,
            SlotAssignment.student_id == user.id,
            ScheduleSlot.exam_variant_id.isnot(None),
        )
    )
    if assignment_slot and assignment_slot.exam_variant_id:
        variant = db.get(ExamVariant, assignment_slot.exam_variant_id)
        if variant and variant.questions:
            questions_to_use = variant.questions

    # 2. Fallback to exam snapshot questions
    if not questions_to_use:
        questions_to_use = (exam.snapshot or {}).get("questions", [])

    if not questions_to_use:
        fail(409, "NO_EXAM_QUESTIONS", "Đề thi chưa được phân bổ câu hỏi hoặc mã đề cho ca thi này. Vui lòng liên hệ Khảo thí.")

    for index, question in enumerate(questions_to_use):
        db.add(Attempt(session_id=session.id, sequence=index + 1, question=question))
    db.commit()
    return public_session(db, session)


@router.get("/exam-sessions/{key}")
def get_session(key: str, db: Session = Depends(get_db), user=Depends(current_user)):
    return public_session(db, owned_session(db, key, user))


@router.post("/exam-sessions/{key}/start")
def start_session(key: str, db: Session = Depends(get_db), user=Depends(current_user)):
    session = owned_session(db, key, user, lock=True)
    if session.status == "DEVICE_CHECK":
        try:
            check_config(by_id(db, Exam, session.exam_id))
        except GradingError as exc:
            fail(409, exc.code, str(exc))
        session.status, session.started_at = "IN_PROGRESS", time.time()
        db.add(Audit(user_id=user.id, event="START_EXAM", details={"session_id": key}))
        db.commit()
    elif session.status != "IN_PROGRESS":
        fail(409, "INVALID_STATE", "Không thể bắt đầu lại bài đã nộp")
    return public_session(db, session)


@router.post("/question-attempts/{key}/start")
def start_attempt(key: str, db: Session = Depends(get_db), user=Depends(current_user)):
    attempt, session = owned_attempt(db, key, user, lock=True)
    active(db, session)
    earlier = db.scalar(
        select(Attempt).where(
            Attempt.session_id == session.id,
            Attempt.sequence < attempt.sequence,
            Attempt.status.in_(["READY", "STARTED"]),
        )
    )
    if earlier:
        fail(409, "QUESTION_ORDER", "Hãy trả lời câu trước")
    if attempt.status == "READY":
        attempt.status, attempt.started_at = "STARTED", time.time()
        db.add(Audit(user_id=user.id, event="START_QUESTION", details={"attempt_id": key}))
        db.commit()
    elif attempt.status != "STARTED":
        fail(409, "INVALID_STATE", "Câu trả lời đã được nộp")
    return {"status": attempt.status}


@router.post("/question-attempts/{key}/submit")
def submit(
    key: str,
    body: s.TranscriptIn,
    idempotency_key: str = Header(min_length=8, max_length=100),
    db: Session = Depends(get_db),
    user=Depends(current_user),
):
    attempt, session = owned_attempt(db, key, user, lock=True)
    if attempt.submit_key:
        if (
            attempt.submit_key == idempotency_key
            and attempt.transcript == body.transcript
            and attempt.stt_confidence == body.stt_confidence
        ):
            return {"status": attempt.status}
        fail(409, "ALREADY_SUBMITTED", "Câu trả lời đã được nộp")
    # A started answer may arrive after the deadline; preserve it for review, never lose its transcript.
    if session.status != "IN_PROGRESS" or attempt.status != "STARTED":
        fail(409, "INVALID_STATE", "Câu trả lời chưa bắt đầu hoặc bài đã nộp")
    attempt.transcript, attempt.stt_confidence = body.transcript, body.stt_confidence
    attempt.submit_key, attempt.finished_at, attempt.status = idempotency_key, time.time(), "SUBMITTED"
    db.add(Audit(user_id=user.id, event="TRANSCRIPT_SUBMITTED", details={"attempt_id": key}))
    db.commit()
    return {"status": attempt.status}


@router.post("/question-attempts/{key}/submit-audio")
def submit_audio(
    key: str,
    body: s.SubmitAudioIn,
    idempotency_key: str = Header(min_length=8, max_length=100),
    db: Session = Depends(get_db),
    user=Depends(current_user),
):
    """Submit audio upload ID for server-side STT processing."""
    attempt, session = owned_attempt(db, key, user, lock=True)

    if attempt.submit_key:
        if attempt.submit_key == idempotency_key:
            return {"status": attempt.status, "transcript": attempt.transcript}
        fail(409, "ALREADY_SUBMITTED", "Câu trả lời đã được nộp")

    if session.status != "IN_PROGRESS" or attempt.status != "STARTED":
        fail(409, "INVALID_STATE", "Câu trả lời chưa bắt đầu hoặc bài đã nộp")

    # Verify upload exists and is complete
    upload = db.scalar(
        select(Upload).where(
            Upload.attempt_id == attempt.id,
            Upload.kind == body.kind,
            Upload.status == "COMPLETED"
        )
    )
    if not upload:
        fail(409, "UPLOAD_NOT_READY", "Audio chưa được tải lên hoặc chưa hoàn tất")

    # Store placeholder - server will update after STT
    attempt.transcript = "AWAITING_STT"
    attempt.stt_confidence = None
    attempt.submit_key = idempotency_key
    attempt.finished_at = time.time()
    attempt.status = "SUBMITTED"

    db.add(Audit(user_id=user.id, event="AUDIO_SUBMITTED", details={
        "attempt_id": key,
        "upload_id": upload.id
    }))
    db.commit()

    return {"status": attempt.status, "transcript": "AWAITING_STT"}


@router.post("/exam-sessions/{key}/finish")
def finish(key: str, db: Session = Depends(get_db), user=Depends(current_user)):
    session = owned_session(db, key, user, lock=True)
    if session.status in {"SUBMITTED", "COMPLETED", "REVIEW_REQUIRED"}:
        return public_session(db, session)
    if session.status != "IN_PROGRESS":
        fail(409, "INVALID_STATE", "Bài thi chưa bắt đầu")
    attempts = db.scalars(select(Attempt).where(Attempt.session_id == key)).all()
    exam = by_id(db, Exam, session.exam_id)
    expired = time.time() > session.started_at + exam.time_limit
    if any(a.status in {"READY", "STARTED"} for a in attempts) and not expired:
        fail(409, "INCOMPLETE", "Cần trả lời đủ câu trước khi nộp bài")
    if expired:
        for a in attempts:
            if a.status in {"READY", "STARTED"}:
                a.status = "GRADED"
                a.assessment = {
                    "score": None,
                    "review_required": True,
                    "confidence": None,
                    "status": "NOT_GRADED",
                    "reasoning_summary": "Hết giờ, chưa có câu trả lời.",
                }
    # Evidence is required for each submitted voice answer.
    for a in attempts:
        if a.transcript:
            kinds = set(
                db.scalars(select(Upload.kind).where(Upload.attempt_id == a.id, Upload.status == "COMPLETED"))
            )
            if not {"AUDIO"} <= kinds:
                fail(409, "EVIDENCE_PENDING", "Chờ tải đủ audio trước khi nộp bài")
    session.status, session.completed_at = "SUBMITTED", time.time()
    db.flush()
    finalize(db, session)
    db.add(Audit(user_id=user.id, event="FINISH_EXAM", details={"session_id": key}))
    db.commit()
    return public_session(db, session)


@router.post("/uploads/init")
def init_upload(body: s.UploadIn, db: Session = Depends(get_db), user=Depends(current_user)):
    attempt, session = owned_attempt(db, body.attempt_id, user)
    if session.status != "IN_PROGRESS":
        fail(409, "INVALID_STATE", "Chỉ upload khi câu trả lời đã bắt đầu và bài chưa nộp")
    if attempt.status == "READY":
        attempt.status, attempt.started_at = "STARTED", time.time()
        db.commit()
    elif attempt.status not in {"STARTED", "SUBMITTED"}:
        fail(409, "INVALID_STATE", "Câu trả lời đã hoàn thành hoặc không ở trạng thái sẵn sàng")
    if not body.mime_type.startswith(body.kind.lower() + "/"):
        fail(422, "MIME_MISMATCH", "Loại file không khớp evidence")
    if body.size > settings().max_media_mb * 1024 * 1024:
        fail(413, "MEDIA_TOO_LARGE", "Media quá lớn")
    existing = db.scalar(
        select(Upload).where(
            Upload.attempt_id == attempt.id,
            Upload.kind == body.kind,
            Upload.sha256 == body.sha256,
            Upload.size == body.size,
        )
    )
    if existing:
        return {"id": existing.id, "chunk_size": settings().media_chunk_bytes, "status": existing.status}
    row = Upload(**body.model_dump(), total_chunks=math.ceil(body.size / settings().media_chunk_bytes))
    db.add(row)
    db.flush()
    db.add(Audit(user_id=user.id, event="UPLOAD_STARTED", details={"upload_id": row.id}))
    db.commit()
    return {"id": row.id, "chunk_size": settings().media_chunk_bytes, "status": row.status}


def upload_folder(key):
    # key is always a UUID loaded from the database, never a client file path.
    folder = Path(settings().data_dir) / "uploads" / key
    folder.mkdir(parents=True, exist_ok=True)
    return folder


@router.put("/uploads/{key}/chunks/{index}")
async def chunk(
    key: str,
    index: int,
    request: Request,
    x_chunk_sha256: str = Header(),
    db: Session = Depends(get_db),
    user=Depends(current_user),
):
    row = by_id(db, Upload, key, lock=True)
    owned_attempt(db, row.attempt_id, user)
    if row.status == "COMPLETED":
        fail(409, "COMPLETED", "Upload đã hoàn tất")
    if not 0 <= index < row.total_chunks:
        fail(422, "CHUNK_INDEX", "Chunk index không hợp lệ")
    expected = min(settings().media_chunk_bytes, row.size - index * settings().media_chunk_bytes)
    content = bytearray()
    async for part in request.stream():
        content.extend(part)
        if len(content) > expected:
            fail(413, "CHUNK_SIZE", "Chunk quá lớn")
    if len(content) != expected or hashlib.sha256(content).hexdigest() != x_chunk_sha256:
        fail(422, "CHECKSUM_MISMATCH", "Kích thước hoặc checksum chunk không khớp")
    folder = upload_folder(row.id)
    with tempfile.NamedTemporaryFile(dir=folder, delete=False) as temp:
        temp.write(content)
        tmp = temp.name
    os.replace(tmp, folder / str(index))
    db.commit()
    return {"ok": True, "index": index}


@router.get("/uploads/{key}/status")
def upload_status(key: str, db: Session = Depends(get_db), user=Depends(current_user)):
    row = by_id(db, Upload, key)
    owned_attempt(db, row.attempt_id, user)
    return {
        "status": row.status,
        "received_chunks": sorted(int(p.name) for p in upload_folder(row.id).iterdir() if p.name.isdigit()),
        "total_chunks": row.total_chunks,
    }


@router.post("/uploads/{key}/complete")
def complete(key: str, db: Session = Depends(get_db), user=Depends(current_user)):
    row = by_id(db, Upload, key, lock=True)
    owned_attempt(db, row.attempt_id, user)
    if row.status == "COMPLETED":
        return {"status": row.status}
    folder = upload_folder(row.id)
    if any(not (folder / str(i)).is_file() for i in range(row.total_chunks)):
        fail(409, "MISSING_CHUNKS", "Thiếu chunk")
    content = b"".join((folder / str(i)).read_bytes() for i in range(row.total_chunks))
    if len(content) != row.size or hashlib.sha256(content).hexdigest() != row.sha256:
        fail(422, "CHECKSUM_MISMATCH", "Checksum toàn file không khớp")
    if not (content.startswith(b"\x1aE\xdf\xa3") or content.startswith(b"OggS") or content[4:8] == b"ftyp"):
        ebml_pos = content[:65536].find(b"\x1aE\xdf\xa3")
        if ebml_pos > 0:
            content = content[ebml_pos:]
        else:
            fail(422, "INVALID_MEDIA", "Container media không hợp lệ")
    row.storage_key = f"evidence/{row.id}"
    storage.put(row.storage_key, content, row.mime_type)
    row.status = "COMPLETED"
    db.add(Audit(user_id=user.id, event="UPLOAD_COMPLETED", details={"upload_id": row.id}))
    db.commit()
    for part in folder.iterdir():
        part.unlink(missing_ok=True)
    return {"status": row.status}


@router.get("/evidence/{key}/content")
def evidence(key: str, request: Request, db: Session = Depends(get_db), user=Depends(current_user)):
    row = by_id(db, Upload, key)
    attempt = by_id(db, Attempt, row.attempt_id)
    session = by_id(db, ExamSession, attempt.session_id)
    if session.deleted_at is not None:
        fail(404, "NOT_FOUND", "Lần thi đã bị xóa")
    if session.student_id != user.id:
        if user.role == "STUDENT":
            fail(403, "FORBIDDEN", "Minh chứng không thuộc tài khoản")
        course_access(db, by_id(db, Exam, session.exam_id).course_id, user)
    if row.status != "COMPLETED":
        fail(409, "NOT_READY", "Evidence chưa sẵn sàng")
    start, end, status = 0, row.size - 1, 200
    raw = request.headers.get("range")
    if raw:
        try:
            unit, interval = raw.split("=", 1)
            left, right = interval.split("-", 1)
            if unit != "bytes" or "," in interval:
                raise ValueError()
            if left:
                start = int(left)
                end = min(int(right), end) if right else end
            else:
                start = max(0, row.size - int(right))
            if start < 0 or start > end or start >= row.size:
                raise ValueError()
            status = 206
        except ValueError:
            fail(416, "INVALID_RANGE", "Range không hợp lệ")

    def stream():
        body = storage.open_stream(row.storage_key)
        try:
            remaining_skip = start
            while remaining_skip:
                part = body.read(min(65536, remaining_skip))
                if not part:
                    return
                remaining_skip -= len(part)
            remaining = end - start + 1
            while remaining:
                part = body.read(min(65536, remaining))
                if not part:
                    return
                remaining -= len(part)
                yield part
        finally:
            body.close()

    headers = {
        "Accept-Ranges": "bytes",
        "Content-Length": str(end - start + 1),
        "Cache-Control": "private, no-store",
    }
    if status == 206:
        headers["Content-Range"] = f"bytes {start}-{end}/{row.size}"
    return StreamingResponse(stream(), status_code=status, media_type=row.mime_type, headers=headers)


@router.get("/student/results")
def student_results(db: Session = Depends(get_db), user=Depends(student)):
    """Get all results for current student"""
    sessions = db.scalars(
        select(ExamSession)
        .where(
            ExamSession.student_id == user.id,
            ExamSession.status.in_(["COMPLETED", "REVIEW_REQUIRED"]),
            ExamSession.deleted_at.is_(None),
        )
        .order_by(ExamSession.completed_at.desc())
    ).all()

    result = []
    for session in sessions:
        exam = db.get(Exam, session.exam_id)
        result.append({
            "session_id": session.id,
            "exam_id": session.exam_id,
            "exam_name": exam.name,
            "status": session.status,
            "score": session.final_score,
            "completed_at": session.completed_at,
        })
    return result


@router.get("/student/results/{session_id}")
def student_result_detail(
    session_id: str,
    db: Session = Depends(get_db),
    user=Depends(student)
):
    """Get specific result details for current student"""
    session = owned_session(db, session_id, user)

    if session.status not in ["COMPLETED", "REVIEW_REQUIRED"]:
        fail(403, "NOT_FINISHED", "Kết quả chưa có sẵn")

    exam = by_id(db, Exam, session.exam_id)
    attempts = db.scalars(
        select(Attempt)
        .where(Attempt.session_id == session_id)
        .order_by(Attempt.sequence)
    ).all()

    grading_message = None
    if exam.snapshot.get("practice"):
        grading_message = "Bài luyện tập không tính điểm."
    elif session.status == "REVIEW_REQUIRED":
        grading_message = "Bài cần giảng viên xem lại trước khi công bố điểm chính thức."

    return {
        "session_id": session.id,
        "exam_name": exam.name,
        "status": session.status,
        "score": session.final_score,
        "completed_at": session.completed_at,
        "grading_message": grading_message,
        "attempts": [
            {
                "sequence": a.sequence,
                "question": a.question,
                "transcript": a.transcript,
                "stt_confidence": a.stt_confidence,
                "status": a.status,
                "question_score": a.assessment.get("score") if a.assessment else None,
                "assessment": a.assessment,
                "audio_url": f"/api/evidence/{u.id}/content" if (u := db.scalar(
                    select(Upload).where(Upload.attempt_id == a.id, Upload.status == "COMPLETED")
                )) else None,
            }
            for a in attempts
        ],
    }


@router.post("/roleplay/chat")
def roleplay_chat(payload: s.RoleplayChatIn, db: Session = Depends(get_db), user=Depends(student)):
    """Interactive multi-turn Role-play chat with Local AI (Ollama)."""
    session = owned_session(db, payload.session_id, user)
    scenario = (payload.scenario_code or "").upper()

    if "ENT303" in scenario or "ETIQUETTE" in scenario:
        persona_name = "Sarah (Workplace Advisor)"
        system_prompt = (
            "You are Sarah, an international workplace culture advisor at a multinational company in Vietnam. "
            "A student exchange intern is having a B1+ role-play conversation with you to learn about business etiquette. "
            "Context knowledge: "
            "1. Greetings: A polite handshake, warm smile, and direct eye contact are standard. "
            "2. Topics: Never ask colleagues about personal salary, marital status, or age. Keep small talk to hobbies, weather, or work projects. "
            "3. Meeting etiquette: Arrive 5 minutes before scheduled start, silence smartphones, take notes actively. "
            "4. Business dining: Wait until the host or senior manager invites everyone before taking food. "
            "CRITICAL INSTRUCTIONS: "
            "- Answer the student's question clearly in 1 or 2 natural sentences. "
            "- Use accessible CEFR B1/B1+ level English. "
            "- After answering, guide the student to ask the next question about taboos, meetings, or dining. "
            "- Never produce a long monologue."
        )
        initial_greeting = "Hello! Nice to meet you. I'm Sarah, your workplace advisor. What would you like to ask about our office culture and business etiquette?"
        tasks = [
            {"id": "greeting", "label": "1. Chào hỏi & phong cách giao tiếp nơi công sở"},
            {"id": "taboos", "label": "2. Các chủ đề tế nhị nên tránh (Taboo topics)"},
            {"id": "meetings", "label": "3. Quy tắc tham gia cuộc họp & ghi chú"},
            {"id": "dining", "label": "4. Văn hóa bàn ăn & giao lưu đối tác"},
        ]
    else:
        persona_name = "Alex (Travel Coordinator)"
        system_prompt = (
            "You are Alex, a friendly student travel coordinator for the university's weekend trip to Da Nang. "
            "A student is asking you questions to prepare for the trip. "
            "Context knowledge: "
            "1. Date & Departure: Saturday, 24th October, departing at 6:00 AM sharp from the University Main Gate. "
            "2. Cost: 250,000 VND per student (covers round-trip bus, tour guide, and lunch). "
            "3. Places to visit: Marble Mountains (Ngũ Hành Sơn) in the morning and My Khe Beach in the afternoon. "
            "4. Items to bring: Valid Student ID card, umbrella or raincoat, comfortable walking sneakers, and water. "
            "CRITICAL INSTRUCTIONS: "
            "- Answer the student's question clearly and accurately in 1 or 2 natural sentences. "
            "- Use accessible CEFR B1 level English. "
            "- After answering, encourage them to ask the next question about cost, places, or preparation. "
            "- Never produce a long monologue."
        )
        initial_greeting = "Good morning! Welcome to the Da Nang School Trip Info Desk. How can I help you with your trip today?"
        tasks = [
            {"id": "time", "label": "1. Ngày đi & giờ xe xuất phát"},
            {"id": "price", "label": "2. Giá vé & các chi phí bao gồm"},
            {"id": "places", "label": "3. Các địa điểm tham quan chính"},
            {"id": "items", "label": "4. Đồ dùng cá nhân cần chuẩn bị & kết thúc"},
        ]

    # Turn 0 greeting
    if not payload.user_message.strip() and payload.turn_index == 0:
        return {
            "persona": persona_name,
            "reply": initial_greeting,
            "turn_index": 0,
            "is_final_turn": False,
            "tasks": tasks,
            "completed_task_ids": [],
        }

    # Call Ollama
    cfg = settings()
    messages = [{"role": "system", "content": system_prompt}]
    for h in payload.history:
        role = h.get("role", "user")
        if role in ["user", "assistant"]:
            messages.append({"role": role, "content": h.get("content", "")})
    messages.append({"role": "user", "content": payload.user_message.strip()})

    reply = ""
    try:
        import httpx
        res = httpx.post(
            cfg.local_llm_url.rstrip("/") + "/api/chat",
            json={"model": "qwen2.5:7b", "messages": messages, "stream": False},
            timeout=30.0,
        )
        if res.status_code == 200:
            data = res.json()
            reply = data.get("message", {}).get("content", "").strip()
    except Exception:
        pass

    if not reply:
        if payload.turn_index == 0:
            reply = "The bus departs at 6:00 AM this Saturday from the main gate. What else would you like to know?"
        elif payload.turn_index == 1:
            reply = "The ticket is 250,000 VND per student, which includes travel, lunch, and entrance tickets. Are you interested in the destinations?"
        elif payload.turn_index == 2:
            reply = "We will visit Marble Mountains in the morning and My Khe Beach in the afternoon. Please bring your student ID and comfortable shoes!"
        else:
            reply = "You're all set! Thank you for registering, and see you this Saturday morning!"

    full_text = (payload.user_message + " " + " ".join(h.get("content", "") for h in payload.history)).lower()
    completed_task_ids = []
    if any(k in full_text for k in ["time", "when", "depart", "leave", "date", "saturday", "greeting", "hello", "hi"]):
        completed_task_ids.append(tasks[0]["id"])
    if any(k in full_text for k in ["price", "cost", "how much", "ticket", "fee", "vnd", "taboo", "salary"]):
        completed_task_ids.append(tasks[1]["id"])
    if any(k in full_text for k in ["place", "where", "visit", "destination", "mountain", "beach", "meeting", "notes"]):
        completed_task_ids.append(tasks[2]["id"])
    if any(k in full_text for k in ["bring", "prepare", "need", "shoe", "id", "umbrella", "dining", "food", "thank"]):
        completed_task_ids.append(tasks[3]["id"])

    new_turn = payload.turn_index + 1
    return {
        "persona": persona_name,
        "reply": reply,
        "turn_index": new_turn,
        "is_final_turn": new_turn >= 3,
        "tasks": tasks,
        "completed_task_ids": completed_task_ids,
    }

