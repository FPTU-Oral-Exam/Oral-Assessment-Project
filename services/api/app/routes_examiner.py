import io
from fastapi import APIRouter, Depends, File, Form, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from . import schemas as s
from .db import get_db
from .models import (
    Audit,
    Attempt,
    Course,
    ExamEnrollment,
    ExamSession,
    ExamVariant,
    ReEvaluation,
    ScheduleSlot,
    Section,
    Semester,
    SlotAssignment,
    User,
)
from .security import by_id, course_access, examiner, fail, public_user

router = APIRouter()


def data(row, *fields):
    """Extract id and named fields from a database row."""
    return {k: getattr(row, k) for k in ("id", *fields)}


# ─────────────────────────────────────────────────────────────────
# Semester endpoints
# ─────────────────────────────────────────────────────────────────

@router.get("/semesters")
def list_semesters(db: Session = Depends(get_db), user=Depends(examiner)):
    semesters = db.scalars(select(Semester).order_by(Semester.created_at.desc())).all()
    return [
        {
            "id": s.id,
            "name": s.name,
            "year": s.year,
            "term": s.term,
            "status": s.status,
            "start_date": s.start_date,
            "end_date": s.end_date,
            "course_count": db.scalar(
                select(func.count()).select_from(Course).where(Course.semester_id == s.id)
            ) or 0,
            "created_at": s.created_at,
        }
        for s in semesters
    ]


@router.post("/semesters", status_code=201)
def create_semester(body: s.SemesterIn, db: Session = Depends(get_db), user=Depends(examiner)):
    existing = db.scalar(
        select(Semester).where(Semester.year == body.year, Semester.term == body.term)
    )
    if existing:
        fail(409, "SEMESTER_EXISTS", "Học kỳ đã tồn tại")
    row = Semester(**body.model_dump())
    db.add(row)
    db.commit()
    return {"id": row.id, "name": row.name, "status": row.status}


@router.get("/semesters/{semester_id}")
def get_semester(semester_id: str, db: Session = Depends(get_db), user=Depends(examiner)):
    semester = by_id(db, Semester, semester_id)
    courses = db.scalars(select(Course).where(Course.semester_id == semester_id)).all()
    return {
        **data(semester, "name", "year", "term", "status", "start_date", "end_date"),
        "courses": [data(c, "code", "name", "description", "status") for c in courses],
    }


@router.post("/semesters/{semester_id}/activate")
def activate_semester(semester_id: str, db: Session = Depends(get_db), user=Depends(examiner)):
    row = by_id(db, Semester, semester_id, lock=True)
    row.status = "ACTIVE"
    db.add(Audit(user_id=user.id, event="SEMESTER_ACTIVATED", details={"semester_id": semester_id}))
    db.commit()
    return {"status": "ACTIVE"}


@router.post("/semesters/{semester_id}/complete")
def complete_semester(semester_id: str, db: Session = Depends(get_db), user=Depends(examiner)):
    row = by_id(db, Semester, semester_id, lock=True)
    row.status = "COMPLETED"
    db.add(Audit(user_id=user.id, event="SEMESTER_COMPLETED", details={"semester_id": semester_id}))
    db.commit()
    return {"status": "COMPLETED"}


# ─────────────────────────────────────────────────────────────────
# Section endpoints
# ─────────────────────────────────────────────────────────────────

@router.get("/courses/{course_id}/sections")
def list_sections(course_id: str, db: Session = Depends(get_db), user=Depends(examiner)):
    sections = db.scalars(select(Section).where(Section.course_id == course_id)).all()
    result = []
    for s in sections:
        teacher = db.get(User, s.teacher_id) if s.teacher_id else None
        student_count = db.scalar(
            select(func.count()).select_from(ExamEnrollment).where(ExamEnrollment.section_id == s.id)
        ) or 0
        result.append({
            **data(s, "name", "code", "day_of_week", "time_slot", "max_students", "status"),
            "teacher": public_user(teacher) if teacher else None,
            "student_count": student_count,
        })
    return result


@router.post("/courses/{course_id}/sections", status_code=201)
def create_section(course_id: str, body: s.SectionIn, db: Session = Depends(get_db), user=Depends(examiner)):
    course_access(db, course_id, user)
    # Validate teacher exists before creating section
    teacher = by_id(db, User, body.teacher_id)
    if teacher.role not in {"TEACHER", "EXAMINER"}:
        fail(422, "NOT_TEACHER", "Giao cho giang vien hoac examiner")
    row = Section(course_id=course_id, **body.model_dump())
    db.add(row)
    db.commit()
    return data(row, "name", "code", "day_of_week", "time_slot", "max_students", "status")


# ─────────────────────────────────────────────────────────────────
# Enrollment import endpoint
# ─────────────────────────────────────────────────────────────────

@router.post("/enrollments/import")
async def import_enrollments(
    course_id: str = Form(),
    file: UploadFile = File(),
    db: Session = Depends(get_db),
    user=Depends(examiner),
):
    """Import students from Excel. Creates sections automatically."""
    import openpyxl

    course_access(db, course_id, user)
    content = await file.read()
    wb = openpyxl.load_workbook(io.BytesIO(content))
    ws = wb.active

    created_sections = 0
    created_enrollments = 0
    skipped = 0
    errors = []

    for row_idx, row in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
        mssv, ho_ten, ma_lop = row[0], row[1], row[2]
        if not mssv:
            continue

        # Find or create section
        section = db.scalar(
            select(Section).where(Section.course_id == course_id, Section.code == str(ma_lop or "").strip())
        )
        if not section:
            section = Section(
                course_id=course_id,
                code=str(ma_lop or "").strip() or f"SECTION-{row_idx}",
                name=str(ma_lop or f"Lop {row_idx}").strip(),
                status="ACTIVE",
            )
            db.add(section)
            db.flush()
            created_sections += 1

        # Find student
        student = db.scalar(select(User).where(User.username == str(mssv).strip()))
        if not student:
            errors.append(f"Hang {row_idx}: MSSV {mssv} khong ton tai")
            continue

        # Check enrollment
        existing = db.scalar(
            select(ExamEnrollment).where(
                ExamEnrollment.section_id == section.id,
                ExamEnrollment.student_id == student.id,
            )
        )
        if existing:
            skipped += 1
            continue

        db.add(ExamEnrollment(section_id=section.id, student_id=student.id))
        created_enrollments += 1

    db.add(Audit(
        user_id=user.id,
        event="ENROLLMENTS_IMPORTED",
        details={"course_id": course_id, "created_enrollments": created_enrollments, "created_sections": created_sections},
    ))
    db.commit()
    return {
        "created_enrollments": created_enrollments,
        "created_sections": created_sections,
        "skipped": skipped,
        "errors": errors,
    }


# ─────────────────────────────────────────────────────────────────
# ScheduleSlot endpoints
# ─────────────────────────────────────────────────────────────────

@router.get("/exams/{exam_id}/slots")
def list_slots(exam_id: str, db: Session = Depends(get_db), user=Depends(examiner)):
    slots = db.scalars(
        select(ScheduleSlot)
        .where(ScheduleSlot.exam_id == exam_id)
        .order_by(ScheduleSlot.slot_number)
    ).all()
    return [
        {
            **data(s, "slot_number", "date", "start_time", "end_time", "room", "status", "grade_locked"),
            "student_count": db.scalar(
                select(func.count()).select_from(SlotAssignment).where(SlotAssignment.slot_id == s.id)
            ) or 0,
            "exam_variant": data(db.get(ExamVariant, s.exam_variant_id), "name", "status")
            if s.exam_variant_id
            else None,
        }
        for s in slots
    ]


@router.post("/exams/{exam_id}/slots", status_code=201)
def create_slots(exam_id: str, body: s.CreateSlotsIn, db: Session = Depends(get_db), user=Depends(examiner)):
    """Create multiple slots and auto-assign enrolled students evenly."""
    from .models import Exam

    exam = by_id(db, Exam, exam_id)

    # Get all enrolled students across all sections of this course
    sections = db.scalars(select(Section).where(Section.course_id == exam.course_id)).all()
    section_ids = [s.id for s in sections]

    students = db.scalars(
        select(User.id)
        .join(ExamEnrollment, ExamEnrollment.student_id == User.id)
        .where(
            ExamEnrollment.section_id.in_(section_ids),
            User.role == "STUDENT",
            User.status == "ACTIVE",
        )
        .order_by(User.username)
    ).all()

    total_students = len(students)
    num_slots = len(body.slots)

    if num_slots == 0:
        fail(422, "NO_SLOTS", "Can tao it nhat 1 ca thi")

    # Calculate students per slot (round-robin distribution)
    base_per_slot = total_students // num_slots
    remainder = total_students % num_slots

    student_assignments = {}
    idx = 0
    for i, _ in enumerate(body.slots):
        count = base_per_slot + (1 if i < remainder else 0)
        student_assignments[i] = students[idx: idx + count]
        idx += count

    # Create slots with auto-assignment
    created_slots = []
    for i, slot_in in enumerate(body.slots):
        row = ScheduleSlot(exam_id=exam_id, **slot_in.model_dump())
        db.add(row)
        db.flush()

        # Assign students to this slot
        for student_id in student_assignments[i]:
            db.add(SlotAssignment(slot_id=row.id, student_id=student_id))

        created_slots.append({
            "id": row.id,
            "slot_number": row.slot_number,
            "student_count": len(student_assignments[i]),
        })

    db.add(Audit(
        user_id=user.id,
        event="SLOTS_CREATED",
        details={"exam_id": exam_id, "count": len(created_slots), "students_assigned": total_students},
    ))
    db.commit()
    return {"created": len(created_slots), "slots": created_slots}


@router.post("/slots/{slot_id}/lock")
def lock_slot(slot_id: str, db: Session = Depends(get_db), user=Depends(examiner)):
    row = by_id(db, ScheduleSlot, slot_id, lock=True)
    row.grade_locked = True
    db.add(Audit(user_id=user.id, event="SLOT_LOCKED", details={"slot_id": slot_id}))
    db.commit()
    return {"grade_locked": True}


@router.post("/slots/{slot_id}/unlock")
def unlock_slot(slot_id: str, db: Session = Depends(get_db), user=Depends(examiner)):
    row = by_id(db, ScheduleSlot, slot_id, lock=True)
    row.grade_locked = False
    db.add(Audit(user_id=user.id, event="SLOT_UNLOCKED", details={"slot_id": slot_id}))
    db.commit()
    return {"grade_locked": False}


# ─────────────────────────────────────────────────────────────────
# Teacher assignment endpoint
# ─────────────────────────────────────────────────────────────────

@router.post("/slots/{slot_id}/assign-teacher")
def assign_teacher_to_slot(
    slot_id: str,
    teacher_id: str = Form(),
    description: str = Form(default=""),
    db: Session = Depends(get_db),
    user=Depends(examiner),
):
    """Assign a teacher to create exam variant for this slot."""
    row = by_id(db, ScheduleSlot, slot_id, lock=True)
    teacher = by_id(db, User, teacher_id)

    if teacher.role not in {"TEACHER", "EXAMINER"}:
        fail(422, "NOT_TEACHER", "Chi giao cho giang vien")

    db.add(Audit(
        user_id=user.id,
        event="SLOT_TEACHER_ASSIGNED",
        details={"slot_id": slot_id, "teacher_id": teacher_id, "description": description},
    ))
    db.commit()

    return {"status": "ASSIGNED", "teacher": public_user(teacher)}


# ─────────────────────────────────────────────────────────────────
# Results and FAP Export endpoints
# ─────────────────────────────────────────────────────────────────

@router.get("/slots/{slot_id}/results")
def slot_results(slot_id: str, db: Session = Depends(get_db), user=Depends(examiner)):
    """Get all results for a slot with student info."""
    slot = by_id(db, ScheduleSlot, slot_id)

    rows = db.execute(
        select(SlotAssignment, User)
        .join(User, User.id == SlotAssignment.student_id)
        .where(SlotAssignment.slot_id == slot_id)
    ).all()

    results = []
    for assignment, student in rows:
        # Find the exam session for this student in this exam
        session = db.scalar(
            select(ExamSession).where(
                ExamSession.exam_id == slot.exam_id,
                ExamSession.student_id == student.id,
                ExamSession.deleted_at.is_(None),
            )
        )

        results.append({
            "student_id": student.id,
            "username": student.username,
            "name": student.name,
            "score_ai": session.final_score if session else None,
            "score_final": session.final_score if session else None,
            "status": session.status if session else "NOT_STARTED",
        })

    return results


@router.get("/slots/{slot_id}/export")
def export_fap(slot_id: str, db: Session = Depends(get_db), user=Depends(examiner)):
    """Export results in FAP format as Excel."""
    from openpyxl import Workbook

    slot = by_id(db, ScheduleSlot, slot_id)
    from .models import Exam
    exam = by_id(db, Exam, slot.exam_id)
    course = by_id(db, Course, exam.course_id)
    semester = db.scalar(select(Semester).where(Semester.id == course.semester_id)) if course.semester_id else None

    wb = Workbook()
    ws = wb.active
    ws.title = "Bang diem"

    # FAP headers
    headers = ["MSSV", "Ho ten", "Lop", "Mon", "Ky", "Ca thi", "Diem", "Diem PK"]
    ws.append(headers)

    rows = db.execute(
        select(SlotAssignment, User)
        .join(User, User.id == SlotAssignment.student_id)
        .where(SlotAssignment.slot_id == slot_id)
    ).all()

    for assignment, student in rows:
        session = db.scalar(
            select(ExamSession).where(
                ExamSession.exam_id == slot.exam_id,
                ExamSession.student_id == student.id,
                ExamSession.deleted_at.is_(None),
            )
        )

        # Find section for this student (first active enrollment)
        section = db.scalar(
            select(Section)
            .join(ExamEnrollment, ExamEnrollment.section_id == Section.id)
            .where(ExamEnrollment.student_id == student.id, ExamEnrollment.status == "ACTIVE")
        )

        ws.append([
            student.username,
            student.name,
            section.code if section else "",
            course.name,
            semester.name if semester else "",
            f"Ca {slot.slot_number}",
            session.final_score if session else "",
            "",  # score_pk
        ])

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)

    return StreamingResponse(
        io.BytesIO(output.getvalue()),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename=FAP_{course.code}_Ca{slot.slot_number}.xlsx"
        },
    )


# ─────────────────────────────────────────────────────────────────
# ReEvaluation endpoint
# ─────────────────────────────────────────────────────────────────

@router.post("/attempts/{attempt_id}/request-re-eval")
def request_re_evaluation(
    attempt_id: str,
    body: s.ReEvaluationIn,
    db: Session = Depends(get_db),
    user=Depends(examiner),
):
    """Create a re-evaluation request with optional blind marking."""
    attempt = by_id(db, Attempt, attempt_id)
    # Validate session exists (session info used for audit traceability)
    _session = by_id(db, ExamSession, attempt.session_id)

    row = ReEvaluation(
        attempt_id=attempt_id,
        teacher_id_1=user.id,  # Original examiner (requester)
        teacher_id_2=body.teacher_id_2,
        reason=body.reason,
        reason_detail=body.reason_detail,
        blind_marking=body.blind_marking,
    )
    db.add(row)
    db.add(Audit(
        user_id=user.id,
        event="REEVALUATION_REQUESTED",
        details={"attempt_id": attempt_id, "teacher_id_2": body.teacher_id_2, "reason": body.reason},
    ))
    db.commit()

    return {"id": row.id, "status": row.status}
