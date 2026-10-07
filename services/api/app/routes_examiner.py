import io
import random
from fastapi import APIRouter, Depends, File, Form, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from . import schemas as s
from .db import get_db
from datetime import datetime
from uuid import uuid4
from . import schemas_examiner as ex
from .models import (
    Audit,
    Attempt,
    Course,
    CourseCandidate,
    Exam,
    ExamBatch,
    ExamEnrollment,
    ExamSession,
    ExamVariant,
    MasterCourse,
    QuestionItem,
    ReEvaluation,
    Rubric,
    ScheduleSlot,
    Section,
    Semester,
    SlotAssignment,
    Topic,
    Upload,
    User,
)
from .security import by_id, course_access, examiner, fail, public_user, hasher

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
                select(func.count()).select_from(Section).where(Section.semester_id == s.id)
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

    # 1. Courses directly associated with this semester
    direct_courses = db.scalars(select(Course).where(Course.semester_id == semester_id)).all()
    # 2. Courses linked via sections
    sections = db.scalars(select(Section).where(Section.semester_id == semester_id)).all()
    section_course_ids = set(s.course_id for s in sections)

    course_map = {c.id: c for c in direct_courses}
    for cid in section_course_ids:
        if cid not in course_map:
            c = db.get(Course, cid)
            if c:
                course_map[cid] = c

    course_list = []
    total_candidates = 0
    total_batches = 0

    for c in course_map.values():
        cand_count = db.scalar(
            select(func.count()).select_from(CourseCandidate).where(CourseCandidate.course_id == c.id)
        ) or 0
        batch_count = db.scalar(
            select(func.count()).select_from(ExamBatch).join(Exam, Exam.id == ExamBatch.exam_id).where(Exam.course_id == c.id)
        ) or 0
        total_candidates += cand_count
        total_batches += batch_count
        course_list.append({
            "id": c.id,
            "code": c.code,
            "name": c.name,
            "description": c.description,
            "credits": c.credits if c.credits is not None else 3,
            "department_code": c.department_code or "",
            "status": c.status,
            "candidate_count": cand_count,
            "batch_count": batch_count,
        })

    return {
        **data(semester, "name", "year", "term", "status", "start_date", "end_date"),
        "course_count": len(course_list),
        "total_candidates": total_candidates,
        "total_batches": total_batches,
        "courses": course_list,
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
# Course endpoints
# ─────────────────────────────────────────────────────────────────

@router.get("/semesters/{semester_id}/courses")
def list_semester_courses(semester_id: str, db: Session = Depends(get_db), user=Depends(examiner)):
    """List all courses in a semester via sections."""
    sections = db.scalars(
        select(Section).where(Section.semester_id == semester_id)
    ).all()
    course_ids = set(s.course_id for s in sections)
    courses = []
    for cid in course_ids:
        course = db.get(Course, cid)
        if course:
            teacher = db.get(User, course.teacher_id) if course.teacher_id else None
            courses.append({
                **data(course, "name", "code", "description", "status"),
                "semester_id": semester_id,
                "teacher": public_user(teacher) if teacher else None,
            })
    return courses


@router.post("/semesters/{semester_id}/courses", status_code=201)
def create_course_in_semester(
    semester_id: str,
    body: ex.CourseAddIn,
    db: Session = Depends(get_db),
    user=Depends(examiner),
):
    """Create a new course in semester from master course or manual entry."""
    by_id(db, Semester, semester_id)

    if body.master_course_id:
        master = by_id(db, MasterCourse, body.master_course_id)
        code = master.code
        name = master.name
        description = master.description or ""
        credits = master.credits
        department_code = master.department_code
    else:
        if not body.code or not body.name:
            fail(400, "MISSING_FIELDS", "Mã môn học và tên môn học là bắt buộc")
        code = body.code.strip().upper()
        name = body.name.strip()
        description = (body.description or "").strip()
        credits = body.credits or 3
        department_code = (body.department_code or "").strip()

    course = Course(
        semester_id=semester_id,
        name=name,
        code=code,
        description=description,
        credits=credits,
        department_code=department_code,
        teacher_id=body.teacher_id,
        owner_id=user.id,
        status="DRAFT",
    )
    db.add(course)
    db.flush()

    # Create default section (use examiner as teacher if no teacher specified)
    section_teacher_id = body.teacher_id or user.id
    section = Section(
        course_id=course.id,
        semester_id=semester_id,
        name=f"{code} - Default",
        code=code,
        teacher_id=section_teacher_id,
        status="DRAFT",
    )
    db.add(section)

    db.add(Audit(user_id=user.id, event="COURSE_CREATED", details={
        "course_id": course.id,
        "semester_id": semester_id,
    }))
    db.commit()

    return {
        **data(course, "name", "code", "description", "status"),
        "credits": course.credits,
        "department_code": course.department_code,
        "semester_id": semester_id,
    }


@router.get("/courses")
def list_all_courses(db: Session = Depends(get_db), user=Depends(examiner)):
    """List all active courses with section count and teacher."""
    courses = db.scalars(
        select(Course).order_by(Course.created_at.desc())
    ).all()
    return [
        {
            **data(c, "name", "code", "description", "status"),
            "semester_id": c.semester_id,
            "teacher": public_user(db.get(User, c.teacher_id)) if c.teacher_id else None,
            "section_count": db.scalar(
                select(func.count()).select_from(Section).where(Section.course_id == c.id)
            ) or 0,
        }
        for c in courses
    ]


@router.get("/courses/{course_id}")
def get_course(course_id: str, db: Session = Depends(get_db), user=Depends(examiner)):
    """Get course detail with sections count and candidate pool statistics."""
    course = by_id(db, Course, course_id)
    teacher = db.get(User, course.teacher_id) if course.teacher_id else None
    sections = db.scalars(select(Section).where(Section.course_id == course_id)).all()

    total = db.scalar(select(func.count()).select_from(CourseCandidate).where(CourseCandidate.course_id == course_id)) or 0
    eligible = db.scalar(select(func.count()).select_from(CourseCandidate).where(CourseCandidate.course_id == course_id, CourseCandidate.eligibility_status == 'ELIGIBLE')) or 0
    disqualified = db.scalar(select(func.count()).select_from(CourseCandidate).where(CourseCandidate.course_id == course_id, CourseCandidate.eligibility_status == 'DISQUALIFIED')) or 0
    assigned = db.scalar(select(func.count()).select_from(CourseCandidate).where(CourseCandidate.course_id == course_id, CourseCandidate.allocation_status == 'ASSIGNED')) or 0
    unassigned = db.scalar(select(func.count()).select_from(CourseCandidate).where(CourseCandidate.course_id == course_id, CourseCandidate.eligibility_status == 'ELIGIBLE', CourseCandidate.allocation_status == 'UNASSIGNED')) or 0

    return {
        **data(course, "name", "code", "description", "status"),
        "credits": course.credits,
        "department_code": course.department_code,
        "semester_id": course.semester_id,
        "teacher": public_user(teacher) if teacher else None,
        "section_count": len(sections),
        "stats": {
            "total": total,
            "eligible": eligible,
            "disqualified": disqualified,
            "assigned": assigned,
            "unassigned": unassigned,
        },
    }


@router.put("/courses/{course_id}")
def update_course(
    course_id: str,
    body: s.CourseUpdateIn,
    db: Session = Depends(get_db),
    user=Depends(examiner),
):
    """Update course details."""
    course = by_id(db, Course, course_id, lock=True)
    updates = body.model_dump(exclude_unset=True)
    for key in ["name", "code", "description", "credits", "teacher_id"]:
        if key in updates:
            setattr(course, key, updates[key])

    db.add(Audit(user_id=user.id, event="COURSE_UPDATED", details={
        "course_id": course_id,
    }))
    db.commit()
    return data(course, "name", "code", "description", "status")


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
    if body.teacher_id:
        teacher = by_id(db, User, body.teacher_id)
        if teacher.role not in {"TEACHER", "EXAMINER"}:
            fail(422, "NOT_TEACHER", "Giao cho giang vien hoac examiner")
    row = Section(course_id=course_id, **body.model_dump())
    db.add(row)
    db.commit()
    teacher = db.get(User, row.teacher_id) if row.teacher_id else None
    return {
        **data(row, "id", "name", "code", "day_of_week", "time_slot", "max_students", "status"),
        "teacher": public_user(teacher) if teacher else None,
    }


@router.patch("/sections/{section_id}")
def update_section(section_id: str, body: s.SectionUpdateIn, db: Session = Depends(get_db), user=Depends(examiner)):
    section = by_id(db, Section, section_id, lock=True)
    course_access(db, section.course_id, user)
    if body.teacher_id is not None:
        if body.teacher_id != "":
            teacher = by_id(db, User, body.teacher_id)
            if teacher.role not in {"TEACHER", "EXAMINER"}:
                fail(422, "NOT_TEACHER", "Giao cho giang vien hoac examiner")
            section.teacher_id = body.teacher_id
        else:
            section.teacher_id = None
    if body.name is not None:
        section.name = body.name
    if body.code is not None:
        section.code = body.code
    if body.day_of_week is not None:
        section.day_of_week = body.day_of_week
    if body.time_slot is not None:
        section.time_slot = body.time_slot
    if body.max_students is not None:
        section.max_students = body.max_students
    db.commit()
    teacher = db.get(User, section.teacher_id) if section.teacher_id else None
    return {
        **data(section, "id", "name", "code", "day_of_week", "time_slot", "max_students", "status"),
        "teacher": public_user(teacher) if teacher else None,
    }


# ─────────────────────────────────────────────────────────────────
# Exam endpoints
# ─────────────────────────────────────────────────────────────────

@router.get("/exams")
def list_all_exams(db: Session = Depends(get_db), user=Depends(examiner)):
    """List all exams across courses with course_id and slot_count."""
    exams = db.scalars(
        select(Exam).where(Exam.deleted_at.is_(None)).order_by(Exam.created_at.desc())
    ).all()
    return [
        {
            **data(e, "name", "description", "status", "time_limit", "question_count"),
            "course_id": e.course_id,
            "slot_count": db.scalar(
                select(func.count()).select_from(ScheduleSlot).where(ScheduleSlot.exam_id == e.id)
            ) or 0,
        }
        for e in exams
    ]


@router.get("/courses/{course_id}/exams")
def list_course_exams(course_id: str, db: Session = Depends(get_db), user=Depends(examiner)):
    """List all exams for a course."""
    from .models import Exam
    exams = db.scalars(
        select(Exam).where(Exam.course_id == course_id).order_by(Exam.created_at.desc())
    ).all()
    return [
        {**data(e, "name", "description", "status", "time_limit", "question_count")}
        for e in exams
    ]


@router.post("/courses/{course_id}/exams", status_code=201)
def create_exam(
    course_id: str,
    body: s.ExaminerExamIn,
    db: Session = Depends(get_db),
    user=Depends(examiner),
):
    """Create a new exam for a course (1 exam per course per spec)."""
    from .models import Exam

    course_access(db, course_id, user)

    # Check if exam with the same name already exists in this course
    existing_same_name = db.scalar(
        select(Exam).where(
            Exam.course_id == course_id,
            Exam.name == body.name.strip(),
            Exam.deleted_at.is_(None)
        )
    )
    if existing_same_name:
        fail(409, "EXAM_NAME_EXISTS", f"Kỳ thi '{body.name.strip()}' đã tồn tại trong môn học này")

    exam = Exam(
        course_id=course_id,
        name=body.name,
        description=body.description,
        time_limit=body.time_limit,
        question_count=body.question_count,
        status="DRAFT",
        rubric_id=body.rubric_id,
    )
    db.add(exam)
    db.add(Audit(user_id=user.id, event="EXAM_CREATED", details={
        "exam_id": exam.id,
        "course_id": course_id,
    }))
    db.commit()

    return {**data(exam, "name", "description", "status", "time_limit", "question_count")}


@router.get("/exams/{exam_id}")
def get_exam(exam_id: str, db: Session = Depends(get_db), user=Depends(examiner)):
    """Get exam detail with slot count."""
    from .models import Exam
    exam = by_id(db, Exam, exam_id)
    slots = db.scalars(
        select(ScheduleSlot).where(ScheduleSlot.exam_id == exam_id)
    ).all()
    return {
        **data(exam, "name", "description", "status", "time_limit", "question_count"),
        "slot_count": len(slots),
    }


@router.put("/exams/{exam_id}")
def update_exam(
    exam_id: str,
    body: s.ExaminerExamIn,
    db: Session = Depends(get_db),
    user=Depends(examiner),
):
    """Update exam details."""
    from .models import Exam
    exam = by_id(db, Exam, exam_id, lock=True)

    for key in ["name", "description", "time_limit", "question_count", "rubric_id"]:
        val = getattr(body, key, None)
        if val is not None or key == "description":
            setattr(exam, key, val if val is not None else getattr(exam, key))

    db.add(Audit(user_id=user.id, event="EXAM_UPDATED", details={
        "exam_id": exam_id,
    }))
    db.commit()
    return data(exam, "name", "description", "status", "time_limit", "question_count")


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
# Enrollment Management endpoints
# ─────────────────────────────────────────────────────────────────

@router.get("/sections/{section_id}/enrollments")
def list_section_enrollments(
    section_id: str,
    db: Session = Depends(get_db),
    user=Depends(examiner),
):
    """List all enrollments in a section."""
    section = by_id(db, Section, section_id)
    enrollments = db.execute(
        select(ExamEnrollment, User)
        .join(User, User.id == ExamEnrollment.student_id)
        .where(ExamEnrollment.section_id == section_id)
        .order_by(User.username)
    ).all()

    return [
        {
            "id": enrollment.id,
            "student_id": student.id,
            "username": student.username,
            "name": student.name,
            "status": enrollment.status,
            "enrolled_at": enrollment.enrolled_at,
        }
        for enrollment, student in enrollments
    ]


@router.delete("/enrollments/{enrollment_id}")
def delete_enrollment(
    enrollment_id: str,
    db: Session = Depends(get_db),
    user=Depends(examiner),
):
    """Delete an enrollment."""
    enrollment = by_id(db, ExamEnrollment, enrollment_id)
    section = db.get(Section, enrollment.section_id)

    if section:
        course_access(db, section.course_id, user)

    db.delete(enrollment)
    db.add(Audit(user_id=user.id, event="ENROLLMENT_DELETED", details={
        "enrollment_id": enrollment_id,
    }))
    db.commit()
    return {"deleted": True}


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


# ─────────────────────────────────────────────────────────────────
# Slot Detail endpoint
# ─────────────────────────────────────────────────────────────────

@router.get("/slots/{slot_id}")
def get_slot(slot_id: str, db: Session = Depends(get_db), user=Depends(examiner)):
    """Get slot details including exam_id."""
    slot = by_id(db, ScheduleSlot, slot_id)

    student_count = db.scalar(
        select(func.count()).select_from(SlotAssignment).where(SlotAssignment.slot_id == slot_id)
    ) or 0

    return {
        "id": slot.id,
        "exam_id": slot.exam_id,
        "slot_number": slot.slot_number,
        "date": slot.date,
        "start_time": slot.start_time,
        "end_time": slot.end_time,
        "room": slot.room,
        "max_students": slot.max_students,
        "status": slot.status,
        "grade_locked": slot.grade_locked,
        "student_count": student_count,
    }


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

    row.status = "READY"
    db.add(Audit(
        user_id=user.id,
        event="SLOT_TEACHER_ASSIGNED",
        details={"slot_id": slot_id, "teacher_id": teacher_id, "description": description},
    ))
    db.commit()

    return {"status": "ASSIGNED", "slot_status": row.status, "teacher": public_user(teacher)}


# ─────────────────────────────────────────────────────────────────
# Automated Test Assembly (ATA) & Variant Generation
# ─────────────────────────────────────────────────────────────────

def _assemble_slot_variant(
    db: Session,
    exam: Exam,
    slot: ScheduleSlot,
    available_items: list[QuestionItem],
    user_id: str,
) -> ExamVariant:
    """
    Assemble an exam variant for a shift/slot from vetted QuestionItem bank
    strictly adhering to the Academy Master Blueprint.
    Balances item usage count to achieve parallel forms with minimal overlap.
    """
    blueprint = exam.blueprint or []
    target_count = exam.question_count or 3
    selected_items: list[QuestionItem] = []

    if blueprint:
        for rule in blueprint:
            topic_id = rule.get("topic_id")
            difficulty = rule.get("difficulty")
            count = int(rule.get("count", 1))

            candidates = [
                it for it in available_items
                if (not topic_id or it.topic_id == topic_id)
                and (not difficulty or it.difficulty == difficulty)
                and it not in selected_items
            ]
            if len(candidates) < count and topic_id:
                # Relax difficulty within same topic
                candidates = [
                    it for it in available_items
                    if it.topic_id == topic_id and it not in selected_items
                ]
            if len(candidates) < count:
                # Relax to any available items of the course
                candidates = [it for it in available_items if it not in selected_items]

            if candidates:
                # Prioritize items with lowest usage_count; randomize among ties
                candidates.sort(key=lambda x: (x.usage_count or 0, random.random()))
                picked = candidates[:count]
                selected_items.extend(picked)
                for it in picked:
                    it.usage_count = (it.usage_count or 0) + 1
    else:
        candidates = [it for it in available_items if it not in selected_items]
        candidates.sort(key=lambda x: (x.usage_count or 0, random.random()))
        picked = candidates[:target_count]
        selected_items.extend(picked)
        for it in picked:
            it.usage_count = (it.usage_count or 0) + 1

    if not selected_items and available_items:
        selected_items = list(available_items[:target_count])

    questions = [
        {
            "sequence": idx + 1,
            "item_id": item.id,
            "text": item.prompt,
            "prompt": item.prompt,
            "expected_points": item.expected_points or [],
            "key_terms": item.key_terms or [],
            "english_terms": [{"term": t, "meaning": ""} for t in (item.key_terms or [])],
            "topic_id": item.topic_id,
            "learning_outcome_id": item.learning_outcome_id,
            "difficulty": item.difficulty,
        }
        for idx, item in enumerate(selected_items)
    ]

    variant_name = f"Mã đề {100 + slot.slot_number} (Ca {slot.slot_number} - {slot.room or 'Phòng'})"
    variant = db.get(ExamVariant, slot.exam_variant_id) if slot.exam_variant_id else None
    if not variant:
        variant = ExamVariant(
            id=f"var_{uuid4().hex[:8]}",
            exam_id=exam.id,
            name=variant_name,
            questions=questions,
            created_by=user_id,
            status="ASSIGNED",
        )
        db.add(variant)
        db.flush()
        slot.exam_variant_id = variant.id
    else:
        variant.name = variant_name
        variant.questions = questions
        variant.status = "ASSIGNED"

    if slot.status in ("PENDING", "SCHEDULED"):
        slot.status = "READY"

    return variant


@router.post("/exams/{exam_id}/generate-variants")
def generate_variants_for_exam(
    exam_id: str,
    db: Session = Depends(get_db),
    user=Depends(examiner),
):
    """
    Automated Test Assembly (ATA):
    Generate parallel exam variants for all shifts/slots of an exam from the vetted QuestionItem bank,
    strictly adhering to the Academy Master Blueprint.
    """
    exam = by_id(db, Exam, exam_id)
    slots = db.scalars(
        select(ScheduleSlot).where(ScheduleSlot.exam_id == exam_id).order_by(ScheduleSlot.slot_number)
    ).all()
    if not slots:
        fail(400, "NO_SLOTS", "Chưa có ca thi nào cho kỳ thi này. Vui lòng tạo ca thi trước khi sinh mã đề.")

    available_items = db.scalars(
        select(QuestionItem).where(
            QuestionItem.course_id == exam.course_id,
            QuestionItem.status == "APPROVED",
            QuestionItem.deleted_at.is_(None),
        )
    ).all()
    if not available_items:
        fail(
            400,
            "NO_ITEMS",
            "Ngân hàng câu hỏi của môn chưa có câu hỏi nào được duyệt (APPROVED). Ban Học thuật (ACADEMY) cần nạp và duyệt câu hỏi trước.",
        )

    rubric = db.get(Rubric, exam.rubric_id) if exam.rubric_id else None
    if not rubric:
        rubric = db.scalar(
            select(Rubric).where(Rubric.course_id == exam.course_id).order_by(Rubric.created_at.desc())
        )

    generated = []
    last_questions = []
    for slot in slots:
        var = _assemble_slot_variant(db, exam, slot, available_items, user.id)
        last_questions = var.questions or []
        generated.append({
            "slot_id": slot.id,
            "slot_number": slot.slot_number,
            "room": slot.room,
            "variant_id": var.id,
            "variant_name": var.name,
            "questions_count": len(var.questions or []),
            "status": slot.status,
        })

    # Prepare exam snapshot and mark exam PUBLISHED
    if not exam.snapshot:
        exam.snapshot = {
            "assembly_mode": "ITEM_BANK_BLUEPRINT",
            "blueprint": exam.blueprint or [],
            "criteria": rubric.criteria if rubric else [],
            "questions": last_questions,
        }
    else:
        snap = dict(exam.snapshot)
        snap["assembly_mode"] = "ITEM_BANK_BLUEPRINT"
        if rubric and not snap.get("criteria"):
            snap["criteria"] = rubric.criteria
        if not snap.get("questions"):
            snap["questions"] = last_questions
        exam.snapshot = snap

    if exam.status == "DRAFT":
        exam.status = "PUBLISHED"

    db.add(Audit(
        user_id=user.id,
        event="EXAM_VARIANTS_GENERATED",
        details={"exam_id": exam.id, "slots_count": len(slots)},
    ))
    db.commit()

    return {
        "success": True,
        "exam_id": exam.id,
        "variants_count": len(generated),
        "slots": generated,
    }


@router.post("/slots/{slot_id}/generate-variant")
def generate_variant_for_slot(
    slot_id: str,
    db: Session = Depends(get_db),
    user=Depends(examiner),
):
    """Generate or regenerate exam variant for a single shift/slot via ATA."""
    slot = by_id(db, ScheduleSlot, slot_id, lock=True)
    exam = by_id(db, Exam, slot.exam_id)

    available_items = db.scalars(
        select(QuestionItem).where(
            QuestionItem.course_id == exam.course_id,
            QuestionItem.status == "APPROVED",
            QuestionItem.deleted_at.is_(None),
        )
    ).all()
    if not available_items:
        fail(400, "NO_ITEMS", "Ngân hàng câu hỏi của môn chưa có câu hỏi nào được duyệt (APPROVED).")

    variant = _assemble_slot_variant(db, exam, slot, available_items, user.id)

    db.add(Audit(
        user_id=user.id,
        event="SLOT_VARIANT_GENERATED",
        details={"slot_id": slot.id, "variant_id": variant.id},
    ))
    db.commit()

    return {
        "success": True,
        "slot_id": slot.id,
        "variant_id": variant.id,
        "variant_name": variant.name,
        "questions_count": len(variant.questions or []),
        "slot_status": slot.status,
    }


@router.post("/exams/{exam_id}/publish")
def publish_examiner_exam(
    exam_id: str,
    db: Session = Depends(get_db),
    user=Depends(examiner),
):
    """Publish exam so eligible students can enter."""
    exam = by_id(db, Exam, exam_id, lock=True)
    exam.status = "PUBLISHED"
    db.add(Audit(user_id=user.id, event="EXAM_PUBLISHED", details={"exam_id": exam.id}))
    db.commit()
    return {"status": "PUBLISHED", "id": exam.id}


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

        # Check if there's a review score (from ReEvaluation)
        score_review = None
        if session:
            # Find latest re-evaluation with a final score
            review = db.scalar(
                select(ReEvaluation)
                .join(Attempt, Attempt.id == ReEvaluation.attempt_id)
                .where(Attempt.session_id == session.id, ReEvaluation.status == "COMPLETED")
                .order_by(ReEvaluation.created_at.desc())
            )
            if review and review.final_score is not None:
                score_review = review.final_score

        results.append({
            "student_id": student.id,
            "username": student.username,
            "name": student.name,
            "score_ai": session.final_score if session else None,
            "score_final": session.final_score if session else None,
            "score_review": score_review,
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


# ─────────────────────────────────────────────────────────────────
# Student Attempts endpoint
# ─────────────────────────────────────────────────────────────────

@router.get("/students/{student_id}/attempts")
def get_student_attempts(
    student_id: str,
    exam_id: str = None,
    db: Session = Depends(get_db),
    user=Depends(examiner),
):
    """Get all attempts for a student, optionally filtered by exam."""
    by_id(db, User, student_id)  # Validate student exists

    query = (
        select(Attempt, ExamSession)
        .join(ExamSession, ExamSession.id == Attempt.session_id)
        .where(ExamSession.student_id == student_id)
    )

    if exam_id:
        query = query.where(ExamSession.exam_id == exam_id)

    rows = db.execute(query.order_by(Attempt.sequence)).all()

    result = []
    for attempt, _ in rows:
        audio_upload = db.scalar(
            select(Upload).where(
                Upload.attempt_id == attempt.id,
                Upload.status == "COMPLETED",
                Upload.kind == "AUDIO",
            )
        )
        audio_url = f"/api/evidence/{audio_upload.id}/content" if audio_upload else None

        result.append({
            "id": attempt.id,
            "sequence": attempt.sequence,
            "question": attempt.question,
            "transcript": attempt.transcript,
            "stt_confidence": attempt.stt_confidence,
            "grading_message": attempt.assessment.get("grading_message") if attempt.assessment else None,
            "score": attempt.assessment.get("score") if attempt.assessment else None,
            "status": attempt.status,
            "audio_url": audio_url,
        })

    return result


# ═══════════════════════════════════════════════════════════════════
# NEW: Candidate Pool & Auto-Allocation Endpoints (Task 3)
# ═══════════════════════════════════════════════════════════════════

# ─────────────────────────────────────────────────────────────────
# Master Courses endpoints
# ─────────────────────────────────────────────────────────────────

@router.get("/master-courses")
def list_master_courses(db: Session = Depends(get_db), user=Depends(examiner)):
    """List all master courses (university-wide course catalog)."""
    courses = db.scalars(select(MasterCourse).order_by(MasterCourse.code)).all()
    if not courses:
        defaults = [
            ("MAS291", "Xác suất & Thống kê", "MATH", 3, "Xác suất ứng dụng và kiểm định thống kê"),
            ("PRN211", "Lập trình ứng dụng .NET", "SE", 3, "Lập trình C#, kiến trúc phần mềm và ORM Entity Framework"),
            ("SWE201c", "Nhập môn Kỹ thuật phần mềm", "SE", 3, "Quy trình phát triển phần mềm, phân tích yêu cầu và Agile"),
            ("CSD201", "Cấu trúc dữ liệu & Giải thuật", "CS", 3, "Cấu trúc dữ liệu động, thuật toán đồ thị và tìm kiếm"),
            ("CSI104", "Nhập môn Khoa học máy tính", "CS", 3, "Kiến trúc máy tính và nguyên lý tính toán"),
            ("IOT102", "Internet vạn vật căn bản", "IOT", 3, "Nguyên lý IoT, cảm biến kết nối và nhúng vi xử lý"),
        ]
        now = datetime.now().timestamp()
        for code, name, dept, credits_val, desc in defaults:
            mc = MasterCourse(
                id=f"mc_{code.lower()}",
                code=code,
                name=name,
                department_code=dept,
                credits=credits_val,
                description=desc,
                created_at=now,
            )
            db.add(mc)
        db.commit()
        courses = db.scalars(select(MasterCourse).order_by(MasterCourse.code)).all()

    return [
        {
            "id": c.id,
            "code": c.code,
            "name": c.name,
            "department_code": c.department_code,
            "credits": c.credits,
            "description": c.description,
        }
        for c in courses
    ]


# ─────────────────────────────────────────────────────────────────
# Course Candidates (Candidate Pool) endpoints
# ─────────────────────────────────────────────────────────────────

@router.post("/courses/{course_id}/candidates/import", status_code=200)
async def import_candidates(
    course_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user=Depends(examiner),
):
    """Import candidates from Excel file. Auto-creates STUDENT accounts."""
    import openpyxl

    by_id(db, Course, course_id)

    if not file.filename.endswith('.xlsx'):
        fail(400, "INVALID_FILE", "Chỉ hỗ trợ file .xlsx")

    contents = await file.read()
    wb = openpyxl.load_workbook(io.BytesIO(contents))
    ws = wb.active

    headers = [cell.value for cell in ws[1]]
    required = ['MSSV', 'Họ và tên', 'Trạng thái đủ điều kiện']
    for col in required:
        if col not in headers:
            fail(400, "MISSING_COLUMNS", f"Thiếu cột bắt buộc: {col}")

    mssv_idx = headers.index('MSSV')
    name_idx = headers.index('Họ và tên')
    status_idx = headers.index('Trạng thái đủ điều kiện')

    imported = 0
    skipped = 0
    errors = []
    now = datetime.now().timestamp()

    for row_num, row in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
        if not row[0]:
            continue

        roll_number = str(row[mssv_idx]).strip()
        full_name = str(row[name_idx]).strip()
        status_raw = str(row[status_idx]).strip().upper()

        eligibility = 'ELIGIBLE' if 'ĐỦ' in status_raw or 'ELIGIBLE' in status_raw else 'DISQUALIFIED'

        # Auto-create student user if not exists
        existing_user = db.scalar(
            select(User).where(User.username == roll_number)
        )
        if not existing_user:
            existing_user = User(
                username=roll_number,
                email=f"{roll_number}@student.edu.vn",
                name=full_name,
                password_hash=hasher.hash(roll_number),
                role="STUDENT",
                status="ACTIVE",
            )
            db.add(existing_user)
            db.flush()

        # Check if candidate already exists
        existing = db.scalar(
            select(CourseCandidate).where(
                CourseCandidate.course_id == course_id,
                CourseCandidate.roll_number == roll_number
            )
        )
        if existing:
            skipped += 1
            continue

        candidate = CourseCandidate(
            course_id=course_id,
            student_id=existing_user.id,
            roll_number=roll_number,
            full_name=full_name,
            eligibility_status=eligibility,
            allocation_status='UNASSIGNED',
            created_at=now,
            updated_at=now,
        )
        db.add(candidate)
        imported += 1

    db.commit()

    return {
        "total_rows": imported + skipped,
        "imported": imported,
        "skipped": skipped,
        "errors": errors
    }


@router.get("/courses/{course_id}/candidates")
def list_candidates(
    course_id: str,
    eligibility_status: str = None,
    allocation_status: str = None,
    search: str = None,
    db: Session = Depends(get_db),
    user=Depends(examiner),
):
    """List candidates with optional filters."""
    query = select(CourseCandidate).where(CourseCandidate.course_id == course_id)

    if eligibility_status:
        query = query.where(CourseCandidate.eligibility_status == eligibility_status)
    if allocation_status:
        query = query.where(CourseCandidate.allocation_status == allocation_status)
    if search:
        query = query.where(
            CourseCandidate.roll_number.ilike(f"%{search}%") |
            CourseCandidate.full_name.ilike(f"%{search}%")
        )

    candidates = db.scalars(query.order_by(CourseCandidate.roll_number)).all()

    result = []
    for c in candidates:
        slot_info = {"slot_room": None, "batch_name": None}
        if c.assigned_slot_id:
            slot = db.get(ScheduleSlot, c.assigned_slot_id)
            if slot:
                slot_info["slot_room"] = slot.room
                if slot.batch_id:
                    batch = db.get(ExamBatch, slot.batch_id)
                    if batch:
                        slot_info["batch_name"] = batch.name

        result.append({
            "id": c.id,
            "roll_number": c.roll_number,
            "full_name": c.full_name,
            "eligibility_status": c.eligibility_status,
            "allocation_status": c.allocation_status,
            **slot_info
        })

    return result


# ─────────────────────────────────────────────────────────────────
# Course Detail with Stats
# ─────────────────────────────────────────────────────────────────

@router.get("/courses/{course_id}/detail")
def get_course_detail(
    course_id: str,
    db: Session = Depends(get_db),
    user=Depends(examiner),
):
    """Get course detail with candidate pool statistics."""
    course = by_id(db, Course, course_id)

    total = db.scalar(
        select(func.count()).select_from(CourseCandidate).where(CourseCandidate.course_id == course_id)
    ) or 0
    eligible = db.scalar(
        select(func.count()).select_from(CourseCandidate).where(
            CourseCandidate.course_id == course_id,
            CourseCandidate.eligibility_status == 'ELIGIBLE'
        )
    ) or 0
    disqualified = db.scalar(
        select(func.count()).select_from(CourseCandidate).where(
            CourseCandidate.course_id == course_id,
            CourseCandidate.eligibility_status == 'DISQUALIFIED'
        )
    ) or 0
    assigned = db.scalar(
        select(func.count()).select_from(CourseCandidate).where(
            CourseCandidate.course_id == course_id,
            CourseCandidate.allocation_status == 'ASSIGNED'
        )
    ) or 0
    unassigned = db.scalar(
        select(func.count()).select_from(CourseCandidate).where(
            CourseCandidate.course_id == course_id,
            CourseCandidate.eligibility_status == 'ELIGIBLE',
            CourseCandidate.allocation_status == 'UNASSIGNED'
        )
    ) or 0

    return {
        "id": course.id,
        "name": course.name,
        "code": course.code,
        "description": course.description,
        "credits": course.credits,
        "department_code": course.department_code,
        "status": course.status,
        "stats": {
            "total": total,
            "eligible": eligible,
            "disqualified": disqualified,
            "assigned": assigned,
            "unassigned": unassigned
        }
    }


# ─────────────────────────────────────────────────────────────────
# Exam Batches (Auto-Allocation) endpoints
# ─────────────────────────────────────────────────────────────────

@router.post("/exams/{exam_id}/batches", status_code=201)
def create_batch_and_allocate(
    exam_id: str,
    body: ex.BatchCreateIn,
    db: Session = Depends(get_db),
    user=Depends(examiner),
):
    """Create exam batch and auto-allocate ELIGIBLE candidates to rooms."""
    exam = by_id(db, Exam, exam_id)
    if not exam:
        fail(404, "EXAM_NOT_FOUND", "Kỳ thi không tồn tại")

    teacher = db.get(User, body.assigned_teacher_id)
    if not teacher or teacher.role != 'TEACHER':
        fail(400, "INVALID_TEACHER", "Giảng viên phụ trách không hợp lệ")

    rooms = [r.strip() for r in body.rooms if r.strip()]
    if not rooms:
        fail(400, "NO_ROOMS", "Danh sách phòng thi không được để trống")

    num_rooms = len(rooms)
    max_per_room = body.max_students_per_room
    total_capacity = num_rooms * max_per_room

    # Get ELIGIBLE + UNASSIGNED candidates with row lock
    candidates = db.scalars(
        select(CourseCandidate)
        .where(
            CourseCandidate.course_id == exam.course_id,
            CourseCandidate.eligibility_status == "ELIGIBLE",
            CourseCandidate.allocation_status == "UNASSIGNED"
        )
        .order_by(CourseCandidate.roll_number.asc())
        .with_for_update()
    ).all()

    if not candidates:
        fail(400, "NO_CANDIDATES", "Không còn thí sinh đủ điều kiện nào chờ phân bổ")

    candidates_to_assign = list(candidates[:total_capacity])
    total_to_assign = len(candidates_to_assign)

    # Create ExamBatch
    now = datetime.now().timestamp()
    batch = ExamBatch(
        id=f"btc_{uuid4().hex[:8]}",
        exam_id=exam.id,
        name=body.name,
        date=body.date,
        start_time=body.start_time,
        end_time=body.end_time,
        max_students_per_room=max_per_room,
        assigned_teacher_id=teacher.id,
        total_assigned=total_to_assign,
        status='SCHEDULED',
        created_at=now,
        updated_at=now,
    )
    db.add(batch)
    db.flush()

    # Current max slot_number for this exam
    current_max_slot = db.scalar(
        select(func.max(ScheduleSlot.slot_number)).where(ScheduleSlot.exam_id == exam.id)
    ) or 0

    # Create ScheduleSlots for each room
    slot_objects = []
    for r_idx, room in enumerate(rooms):
        slot = ScheduleSlot(
            id=f"slt_{uuid4().hex[:8]}",
            batch_id=batch.id,
            exam_id=exam.id,
            slot_number=current_max_slot + r_idx + 1,
            date=body.date,
            start_time=body.start_time,
            end_time=body.end_time,
            room=room,
            max_students=max_per_room,
            assigned_students_count=0,
            status="SCHEDULED",
        )
        db.add(slot)
        slot_objects.append(slot)
    db.flush()

    # Balanced Round-Robin Distribution
    room_allocations = [[] for _ in range(num_rooms)]
    for idx, candidate in enumerate(candidates_to_assign):
        room_idx = idx % num_rooms
        room_allocations[room_idx].append(candidate)

    # Update candidates and slot counts
    room_counts = []
    for room_idx, assigned_list in enumerate(room_allocations):
        target_slot = slot_objects[room_idx]
        target_slot.assigned_students_count = len(assigned_list)
        room_counts.append({
            "room": rooms[room_idx],
            "assigned_count": len(assigned_list)
        })
        for cand in assigned_list:
            cand.allocation_status = "ASSIGNED"
            cand.assigned_slot_id = target_slot.id
            cand.updated_at = now
            db.add(SlotAssignment(
                slot_id=target_slot.id,
                student_id=cand.student_id,
            ))

    db.commit()

    remaining = len(candidates) - total_to_assign

    return {
        "batch_id": batch.id,
        "name": batch.name,
        "date": batch.date,
        "start_time": batch.start_time,
        "end_time": batch.end_time,
        "assigned_teacher_id": batch.assigned_teacher_id,
        "total_assigned": total_to_assign,
        "status": batch.status,
        "rooms": room_counts,
        "remaining_unassigned": remaining
    }


@router.get("/exams/{exam_id}/batches")
def list_batches(
    exam_id: str,
    db: Session = Depends(get_db),
    user=Depends(examiner),
):
    """List all batches for an exam."""
    batches = db.scalars(
        select(ExamBatch).where(ExamBatch.exam_id == exam_id).order_by(ExamBatch.date)
    ).all()

    result = []
    for b in batches:
        slots = db.scalars(
            select(ScheduleSlot).where(ScheduleSlot.batch_id == b.id)
        ).all()

        result.append({
            "batch_id": b.id,
            "name": b.name,
            "date": b.date,
            "start_time": b.start_time,
            "end_time": b.end_time,
            "assigned_teacher_id": b.assigned_teacher_id,
            "total_assigned": b.total_assigned,
            "status": b.status,
            "rooms": [
                {
                    "slot_id": s.id,
                    "room": s.room,
                    "assigned_count": s.assigned_students_count,
                    "variant_id": s.exam_variant_id,
                    "variant_name": db.get(ExamVariant, s.exam_variant_id).name if s.exam_variant_id else None,
                }
                for s in slots
            ]
        })

    return result


@router.get("/batches/{batch_id}/students")
def list_batch_students(
    batch_id: str,
    db: Session = Depends(get_db),
    user=Depends(examiner),
):
    """List all students assigned to a batch."""
    batch = by_id(db, ExamBatch, batch_id)
    slots = db.scalars(
        select(ScheduleSlot).where(ScheduleSlot.batch_id == batch_id)
    ).all()

    result = []
    for slot in slots:
        candidates = db.scalars(
            select(CourseCandidate).where(CourseCandidate.assigned_slot_id == slot.id)
        ).all()
        for c in candidates:
            result.append({
                "roll_number": c.roll_number,
                "full_name": c.full_name,
                "room": slot.room,
                "eligibility_status": c.eligibility_status
            })

    return result
