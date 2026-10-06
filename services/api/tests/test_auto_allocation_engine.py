"""Integration tests for Examiner Exam Batches & Auto-Allocation Engine."""
import io
import openpyxl
import pytest
from sqlalchemy import select

from app.models import Course, CourseCandidate, Exam, ExamBatch, ScheduleSlot, SlotAssignment, User


def create_excel_bytes(rows, headers=("MSSV", "Họ và tên", "Trạng thái đủ điều kiện")):
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.append(list(headers))
    for r in rows:
        ws.append(list(r))
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf.getvalue()


class TestAutoAllocationEngine:
    """Test suite for balanced auto-allocation algorithm across rooms."""

    def test_allocate_candidates_evenly(self, env):
        clients, factory = env
        examiner = clients["examiner"]

        # Setup Course, Exam, and Teacher
        with factory() as db:
            teacher = db.scalar(select(User).where(User.username == "teacher"))
            teacher_id = teacher.id

            course = Course(
                id="crs_alloc_01",
                code="PRJ301_ALLOC",
                name="Allocation Balance Course",
                status="ACTIVE",
            )
            db.add(course)
            db.flush()

            exam = Exam(
                id="exm_alloc_01",
                course_id=course.id,
                name="Final Practical Exam",
                time_limit=30,
                question_count=3,
                status="DRAFT",
            )
            db.add(exam)
            db.commit()

        # Import 35 eligible candidates
        candidate_rows = [(f"SE20{i:04d}", f"Candidate {i}", "ELIGIBLE") for i in range(35)]
        excel_data = create_excel_bytes(candidate_rows)

        r_import = examiner.post(
            f"/api/examiner/courses/{course.id}/candidates/import",
            files={"file": ("candidates_35.xlsx", excel_data, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        )
        assert r_import.status_code == 200
        assert r_import.json()["imported"] == 35

        # Create batch with 3 rooms, max 15 each (Capacity = 45 > 35)
        response = examiner.post(
            f"/api/examiner/exams/{exam.id}/batches",
            json={
                "name": "Đợt 1 - Ca sáng",
                "date": 1735689600.0,
                "start_time": "08:00",
                "end_time": "10:00",
                "rooms": ["AL-L401", "AL-L402", "AL-L403"],
                "max_students_per_room": 15,
                "assigned_teacher_id": teacher_id,
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["total_assigned"] == 35
        assert len(data["rooms"]) == 3
        assert data["remaining_unassigned"] == 0

        # Balanced check: 35 / 3 = 12, 12, 11
        counts = [r["assigned_count"] for r in data["rooms"]]
        assert sorted(counts) == [11, 12, 12]

    def test_no_duplicate_allocation(self, env):
        clients, factory = env
        examiner = clients["examiner"]

        with factory() as db:
            teacher = db.scalar(select(User).where(User.username == "teacher"))
            teacher_id = teacher.id

            course = Course(
                id="crs_alloc_dup_01",
                code="PRN211_NODUP",
                name="No Duplicate Course",
                status="ACTIVE",
            )
            db.add(course)
            db.flush()

            exam = Exam(
                id="exm_alloc_dup_01",
                course_id=course.id,
                name="Midterm Exam",
                time_limit=30,
                question_count=3,
                status="DRAFT",
            )
            db.add(exam)
            db.commit()

        # Import 20 candidates
        candidate_rows = [(f"SE30{i:04d}", f"Student {i}", "ELIGIBLE") for i in range(20)]
        excel_data = create_excel_bytes(candidate_rows)

        examiner.post(
            f"/api/examiner/courses/{course.id}/candidates/import",
            files={"file": ("candidates_20.xlsx", excel_data, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        )

        # First batch: 1 room, max 15 students
        r1 = examiner.post(
            f"/api/examiner/exams/{exam.id}/batches",
            json={
                "name": "Đợt 1",
                "date": 1735689600.0,
                "start_time": "08:00",
                "end_time": "09:00",
                "rooms": ["AL-L401"],
                "max_students_per_room": 15,
                "assigned_teacher_id": teacher_id,
            },
        )
        assert r1.status_code == 201
        d1 = r1.json()
        assert d1["total_assigned"] == 15
        assert d1["remaining_unassigned"] == 5

        # Second batch: 1 room, max 15 -> only 5 remaining students allocated
        r2 = examiner.post(
            f"/api/examiner/exams/{exam.id}/batches",
            json={
                "name": "Đợt 2",
                "date": 1735689600.0,
                "start_time": "10:00",
                "end_time": "11:00",
                "rooms": ["AL-L402"],
                "max_students_per_room": 15,
                "assigned_teacher_id": teacher_id,
            },
        )
        assert r2.status_code == 201
        d2 = r2.json()
        assert d2["total_assigned"] == 5
        assert d2["remaining_unassigned"] == 0

    def test_disqualified_not_allocated(self, env):
        clients, factory = env
        examiner = clients["examiner"]

        with factory() as db:
            teacher = db.scalar(select(User).where(User.username == "teacher"))
            teacher_id = teacher.id

            course = Course(
                id="crs_alloc_disq_01",
                code="SWP391_DISQ",
                name="Disqualified Filter Course",
                status="ACTIVE",
            )
            db.add(course)
            db.flush()

            exam = Exam(
                id="exm_alloc_disq_01",
                course_id=course.id,
                name="Final Exam",
                time_limit=30,
                question_count=3,
                status="DRAFT",
            )
            db.add(exam)
            db.commit()

        # Import 1 DISQUALIFIED and 1 ELIGIBLE
        candidate_rows = [
            ("SE401111", "Student Disqualified", "DISQUALIFIED"),
            ("SE401112", "Student Eligible", "ĐỦ ĐIỀU KIỆN"),
        ]
        excel_data = create_excel_bytes(candidate_rows)

        examiner.post(
            f"/api/examiner/courses/{course.id}/candidates/import",
            files={"file": ("disq.xlsx", excel_data, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        )

        response = examiner.post(
            f"/api/examiner/exams/{exam.id}/batches",
            json={
                "name": "Test Disqualified Exclusion",
                "date": 1735689600.0,
                "start_time": "08:00",
                "end_time": "09:00",
                "rooms": ["AL-L401"],
                "max_students_per_room": 15,
                "assigned_teacher_id": teacher_id,
            },
        )
        assert response.status_code == 201
        assert response.json()["total_assigned"] == 1
        assert response.json()["remaining_unassigned"] == 0

    def test_no_unallocated_candidates_error(self, env):
        clients, factory = env
        examiner = clients["examiner"]

        with factory() as db:
            teacher = db.scalar(select(User).where(User.username == "teacher"))
            teacher_id = teacher.id

            course = Course(
                id="crs_alloc_empty_01",
                code="EXE101_EMPTY",
                name="Empty Course",
                status="ACTIVE",
            )
            db.add(course)
            db.flush()

            exam = Exam(
                id="exm_alloc_empty_01",
                course_id=course.id,
                name="Empty Candidate Exam",
                time_limit=30,
                question_count=3,
                status="DRAFT",
            )
            db.add(exam)
            db.commit()

        # Attempt to create batch when NO candidates exist
        response = examiner.post(
            f"/api/examiner/exams/{exam.id}/batches",
            json={
                "name": "Batch For Empty Course",
                "date": 1735689600.0,
                "start_time": "08:00",
                "end_time": "09:00",
                "rooms": ["AL-L401"],
                "max_students_per_room": 15,
                "assigned_teacher_id": teacher_id,
            },
        )
        assert response.status_code == 400
        assert response.json()["error"]["code"] == "NO_CANDIDATES"

    def test_get_batch_students(self, env):
        clients, factory = env
        examiner = clients["examiner"]

        with factory() as db:
            teacher = db.scalar(select(User).where(User.username == "teacher"))
            teacher_id = teacher.id

            course = Course(
                id="crs_alloc_stus_01",
                code="PRJ301_STUS",
                name="Batch Students Course",
                status="ACTIVE",
            )
            db.add(course)
            db.flush()

            exam = Exam(
                id="exm_alloc_stus_01",
                course_id=course.id,
                name="Roster Exam",
                time_limit=30,
                question_count=3,
                status="DRAFT",
            )
            db.add(exam)
            db.commit()

        # Import 2 candidates
        candidate_rows = [
            ("SE777001", "Sinh Viên Roster 1", "ELIGIBLE"),
            ("SE777002", "Sinh Viên Roster 2", "ELIGIBLE"),
        ]
        excel_data = create_excel_bytes(candidate_rows)

        examiner.post(
            f"/api/examiner/courses/{course.id}/candidates/import",
            files={"file": ("roster.xlsx", excel_data, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        )

        r_batch = examiner.post(
            f"/api/examiner/exams/{exam.id}/batches",
            json={
                "name": "Roster Batch",
                "date": 1735689600.0,
                "start_time": "14:00",
                "end_time": "16:00",
                "rooms": ["AL-L501"],
                "max_students_per_room": 15,
                "assigned_teacher_id": teacher_id,
            },
        )
        assert r_batch.status_code == 201
        batch_id = r_batch.json()["batch_id"]

        # Query batch students
        r_students = examiner.get(f"/api/examiner/batches/{batch_id}/students")
        assert r_students.status_code == 200
        students = r_students.json()
        assert len(students) == 2
        roll_numbers = {s["roll_number"] for s in students}
        assert roll_numbers == {"SE777001", "SE777002"}
        assert all(s["room"] == "AL-L501" for s in students)
        assert all(s["eligibility_status"] == "ELIGIBLE" for s in students)

    def test_invalid_teacher_fails(self, env):
        clients, factory = env
        examiner = clients["examiner"]

        with factory() as db:
            course = Course(
                id="crs_alloc_invt_01",
                code="PRJ301_INVT",
                name="Invalid Teacher Course",
                status="ACTIVE",
            )
            db.add(course)
            db.flush()

            exam = Exam(
                id="exm_alloc_invt_01",
                course_id=course.id,
                name="Teacher Check Exam",
                time_limit=30,
                question_count=3,
                status="DRAFT",
            )
            db.add(exam)
            db.commit()

        # Non-existent or non-teacher user ID
        response = examiner.post(
            f"/api/examiner/exams/{exam.id}/batches",
            json={
                "name": "Invalid Teacher Batch",
                "date": 1735689600.0,
                "start_time": "08:00",
                "end_time": "09:00",
                "rooms": ["AL-L401"],
                "max_students_per_room": 15,
                "assigned_teacher_id": "non_existent_teacher_id",
            },
        )
        assert response.status_code == 400
        assert response.json()["error"]["code"] == "INVALID_TEACHER"
