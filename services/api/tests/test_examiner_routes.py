"""Integration tests for Examiner Portal API routes."""
import io
import time
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.models import (
    Course,
    Exam,
    ExamEnrollment,
    ExamSession,
    ReEvaluation,
    Rubric,
    ScheduleSlot,
    Section,
    Semester,
    SlotAssignment,
    User,
)


def unique_code():
    """Generate unique code for test isolation."""
    return f"SE{str(uuid.uuid4())[:8].upper()}"


# Helper functions
def ok(response, status=200):
    """Assert response status and return JSON."""
    # Handle both 200 and 201 as success for POST endpoints
    expected_statuses = [status]
    if status == 200:
        expected_statuses.append(201)
    assert response.status_code in expected_statuses, f"Expected {status} or 201, got {response.status_code}: {response.text}"
    return response.json()


# ============================================================================
# Semester CRUD Tests
# ============================================================================


class TestSemesterCRUD:
    """Test Semester management endpoints."""

    def test_create_semester(self, env):
        """Test creating a new semester."""
        clients, _ = env
        examiner = clients["examiner"]

        response = examiner.post(
            "/api/examiner/semesters",
            json={
                "name": "Spring 2026",
                "year": 2026,
                "term": "SPRING",
                "start_date": 1735689600.0,  # 2025-01-01
                "end_date": 1748304000.0,    # 2025-06-30
            }
        )
        data = ok(response, 201)
        assert data["name"] == "Spring 2026"
        assert data["status"] == "DRAFT"
        assert "id" in data

    def test_create_duplicate_semester_fails(self, env):
        """Test that creating a duplicate semester (same year+term) fails."""
        clients, _ = env
        examiner = clients["examiner"]

        # Create first semester
        examiner.post(
            "/api/examiner/semesters",
            json={
                "name": "Fall 2026",
                "year": 2026,
                "term": "FALL",
                "start_date": 1727740800.0,
                "end_date": 1740969600.0,
            }
        )

        # Try to create duplicate
        response = examiner.post(
            "/api/examiner/semesters",
            json={
                "name": "Fall 2026 v2",
                "year": 2026,
                "term": "FALL",
                "start_date": 1727740800.0,
                "end_date": 1740969600.0,
            }
        )
        assert response.status_code == 409
        assert response.json()["error"]["code"] == "SEMESTER_EXISTS"

    def test_list_semesters(self, env):
        """Test listing semesters."""
        clients, _ = env
        examiner = clients["examiner"]

        # Create a semester first
        examiner.post(
            "/api/examiner/semesters",
            json={
                "name": "Summer 2026",
                "year": 2026,
                "term": "SUMMER",
                "start_date": 1747267200.0,
                "end_date": 1756080000.0,
            }
        )

        data = ok(examiner.get("/api/examiner/semesters"))
        assert len(data) >= 1
        assert any(s["name"] == "Summer 2026" for s in data)

    def test_get_semester_detail(self, env):
        """Test getting semester details with courses."""
        clients, factory = env
        examiner = clients["examiner"]

        # Create semester
        semester = ok(examiner.post(
            "/api/examiner/semesters",
            json={
                "name": "Winter 2026",
                "year": 2026,
                "term": "FALL",
                "start_date": 1727740800.0,
                "end_date": 1740969600.0,
            }
        ), 201)

        # Create a course via admin
        admin = clients["admin"]
        course = ok(admin.post("/admin/courses", json={"code": "SE102", "name": "Software Testing"}), 201)

        # Create a section under the semester and course
        with factory() as db:
            teacher_user = db.execute(select(User).where(User.username == "teacher")).scalar_one()
            section = Section(
                course_id=course["id"],
                semester_id=semester["id"],
                code="SE102-W26",
                name="Winter 2026 Section",
                teacher_id=teacher_user.id,
                status="ACTIVE",
            )
            db.add(section)
            db.commit()

        # Get semester detail
        data = ok(examiner.get(f"/api/examiner/semesters/{semester['id']}"))
        assert data["name"] == "Winter 2026"
        assert "courses" in data

    def test_activate_semester(self, env):
        """Test activating a semester."""
        clients, _ = env
        examiner = clients["examiner"]

        semester = ok(examiner.post(
            "/api/examiner/semesters",
            json={
                "name": "Spring Active 2026",
                "year": 2026,
                "term": "SPRING",
                "start_date": 1735689600.0,
                "end_date": 1748304000.0,
            }
        ))

        data = ok(examiner.post(f"/api/examiner/semesters/{semester['id']}/activate"))
        assert data["status"] == "ACTIVE"

    def test_complete_semester(self, env):
        """Test completing a semester."""
        clients, _ = env
        examiner = clients["examiner"]

        semester = ok(examiner.post(
            "/api/examiner/semesters",
            json={
                "name": "Spring Complete 2026",
                "year": 2026,
                "term": "SPRING",
                "start_date": 1735689600.0,
                "end_date": 1748304000.0,
            }
        ))

        # Activate first
        examiner.post(f"/api/examiner/semesters/{semester['id']}/activate")

        # Then complete
        data = ok(examiner.post(f"/api/examiner/semesters/{semester['id']}/complete"))
        assert data["status"] == "COMPLETED"


# ============================================================================
# Course Management Tests
# ============================================================================


class TestCourseManagement:
    """Test Course management endpoints."""

    def test_list_semester_courses(self, env):
        """Test listing courses in a semester."""
        clients, _ = env
        examiner = clients["examiner"]

        sem_response = examiner.post(
            "/api/examiner/semesters",
            json={
                "name": "Test Semester",
                "year": 2026,
                "term": "SPRING",
                "start_date": 1735689600.0,
                "end_date": 1748304000.0,
            }
        )
        sem_data = ok(sem_response, 201)
        sem_id = sem_data["id"]

        course_code = unique_code()
        course_response = examiner.post(
            f"/api/examiner/semesters/{sem_id}/courses",
            json={
                "name": "Test Course",
                "code": course_code,
                "description": "Test",
            }
        )
        ok(course_response, 201)

        list_response = examiner.get(f"/api/examiner/semesters/{sem_id}/courses")
        data = ok(list_response)
        assert len(data) >= 1
        assert any(c["code"] == course_code for c in data)

    def test_create_course_creates_default_section(self, env):
        """Test that creating course creates a default section."""
        clients, _ = env
        examiner = clients["examiner"]

        sem_response = examiner.post(
            "/api/examiner/semesters",
            json={
                "name": "Test Semester 2",
                "year": 2026,
                "term": "SUMMER",
                "start_date": 1735689600.0,
                "end_date": 1748304000.0,
            }
        )
        sem_data = ok(sem_response, 201)

        course_code = unique_code()
        course_response = examiner.post(
            f"/api/examiner/semesters/{sem_data['id']}/courses",
            json={
                "name": "Test Course 2",
                "code": course_code,
            }
        )
        course_data = ok(course_response, 201)

        sections_response = examiner.get(
            f"/api/examiner/courses/{course_data['id']}/sections"
        )
        sections = ok(sections_response)
        assert len(sections) == 1
        assert sections[0]["code"] == course_code

    def test_get_course_detail(self, env):
        """Test getting course detail."""
        clients, _ = env
        examiner = clients["examiner"]

        sem_response = examiner.post(
            "/api/examiner/semesters",
            json={"name": "Test 3", "year": 2026, "term": "FALL",
                  "start_date": 1735689600.0, "end_date": 1748304000.0}
        )
        sem_data = ok(sem_response, 201)

        course_code = unique_code()
        course_response = examiner.post(
            f"/api/examiner/semesters/{sem_data['id']}/courses",
            json={"name": "Test Course 3", "code": course_code}
        )
        course_data = ok(course_response, 201)

        detail_response = examiner.get(
            f"/api/examiner/courses/{course_data['id']}"
        )
        detail = ok(detail_response)
        assert detail["name"] == "Test Course 3"
        assert detail["section_count"] == 1

    def test_update_course(self, env):
        """Test updating course details."""
        clients, _ = env
        examiner = clients["examiner"]

        sem_response = examiner.post(
            "/api/examiner/semesters",
            json={"name": "Test 4", "year": 2026, "term": "SPRING",
                  "start_date": 1735689600.0, "end_date": 1748304000.0}
        )
        sem_data = ok(sem_response, 201)

        course_code = unique_code()
        course_response = examiner.post(
            f"/api/examiner/semesters/{sem_data['id']}/courses",
            json={"name": "Original Name", "code": course_code}
        )
        course_data = ok(course_response, 201)

        update_response = examiner.put(
            f"/api/examiner/courses/{course_data['id']}",
            json={"name": "Updated Name"}
        )
        updated = ok(update_response)
        assert updated["name"] == "Updated Name"

    def test_list_all_courses(self, env):
        """Test listing all courses across semesters."""
        clients, _ = env
        examiner = clients["examiner"]

        sem_response = examiner.post(
            "/api/examiner/semesters",
            json={"name": f"Sem {unique_code()}", "year": 2026, "term": "SPRING",
                  "start_date": 1735689600.0, "end_date": 1748304000.0}
        )
        sem_data = ok(sem_response, 201)
        examiner.post(
            f"/api/examiner/semesters/{sem_data['id']}/courses",
            json={"name": "All Courses Test", "code": unique_code()}
        )

        courses = ok(examiner.get("/api/examiner/courses"))
        assert isinstance(courses, list)
        assert len(courses) >= 1
        assert "name" in courses[0]
        assert "code" in courses[0]
        assert "section_count" in courses[0]


# ============================================================================
# Section CRUD Tests
# ============================================================================


class TestSectionCRUD:
    """Test Section management endpoints."""

    def test_create_section(self, env):
        """Test creating a new section."""
        clients, factory = env
        examiner = clients["examiner"]

        # Get teacher ID
        with factory() as db:
            teacher_user = db.execute(select(User).where(User.username == "teacher")).scalar_one()
            teacher_id = teacher_user.id

        # Create course first via admin with unique code
        admin = clients["admin"]
        course_code = unique_code()
        course = ok(admin.post("/admin/courses", json={"code": course_code, "name": "Advanced Testing"}))

        # Create section
        data = ok(examiner.post(
            f"/api/examiner/courses/{course['id']}/sections",
            json={
                "name": "Morning T2",
                "code": f"{course_code}-T2-S",
                "teacher_id": teacher_id,
                "day_of_week": 1,
                "time_slot": "MORNING",
                "max_students": 30,
            }
        ))
        assert data["name"] == "Morning T2"
        assert data["code"] == f"{course_code}-T2-S"
        assert data["status"] == "DRAFT"

    def test_create_section_invalid_teacher_fails(self, env):
        """Test that assigning a non-teacher fails."""
        clients, factory = env
        examiner = clients["examiner"]

        with factory() as db:
            student_user = db.execute(select(User).where(User.username == "student")).scalar_one()
            student_id = student_user.id

        admin = clients["admin"]
        course_code = unique_code()
        course = ok(admin.post("/admin/courses", json={"code": course_code, "name": "Test Course"}))

        response = examiner.post(
            f"/api/examiner/courses/{course['id']}/sections",
            json={
                "name": "Invalid Section",
                "code": f"{course_code}-SEC",
                "teacher_id": student_id,
                "day_of_week": 1,
            }
        )
        assert response.status_code == 422
        assert response.json()["error"]["code"] == "NOT_TEACHER"

    def test_list_sections(self, env):
        """Test listing sections for a course."""
        clients, factory = env
        examiner = clients["examiner"]

        with factory() as db:
            teacher_user = db.execute(select(User).where(User.username == "teacher")).scalar_one()
            teacher_id = teacher_user.id

        admin = clients["admin"]
        course_code = unique_code()
        course = ok(admin.post("/admin/courses", json={"code": course_code, "name": "Testing Basics"}))

        # Create section
        examiner.post(
            f"/api/examiner/courses/{course['id']}/sections",
            json={
                "name": "Afternoon T3",
                "code": f"{course_code}-T3-A",
                "teacher_id": teacher_id,
                "day_of_week": 2,
                "time_slot": "AFTERNOON",
            }
        )

        # List sections
        data = ok(examiner.get(f"/api/examiner/courses/{course['id']}/sections"))
        assert len(data) >= 1
        assert any(s["code"] == f"{course_code}-T3-A" for s in data)

    def test_update_section(self, env):
        """Test updating a section and assigning teacher."""
        clients, factory = env
        examiner = clients["examiner"]

        with factory() as db:
            teacher_user = db.execute(select(User).where(User.username == "teacher")).scalar_one()
            teacher_id = teacher_user.id

        admin = clients["admin"]
        course_code = unique_code()
        course = ok(admin.post("/admin/courses", json={"code": course_code, "name": "Section Update Course"}))

        created = ok(examiner.post(
            f"/api/examiner/courses/{course['id']}/sections",
            json={
                "name": "Initial Section",
                "code": f"{course_code}-SEC-1",
                "day_of_week": 1,
                "time_slot": "MORNING",
                "max_students": 30,
            }
        ))
        section_id = created["id"]

        # Update section with teacher and new max_students
        updated = ok(examiner.patch(
            f"/api/examiner/sections/{section_id}",
            json={
                "name": "Updated Section Name",
                "teacher_id": teacher_id,
                "max_students": 45,
            }
        ))
        assert updated["name"] == "Updated Section Name"
        assert updated["max_students"] == 45
        assert updated["teacher"] is not None
        assert updated["teacher"]["id"] == teacher_id


# ============================================================================
# Exam Management Tests
# ============================================================================


class TestExamManagement:
    """Test Exam management endpoints."""

    def _create_course(self, examiner):
        """Helper to create semester and course."""
        sem_response = examiner.post(
            "/api/examiner/semesters",
            json={"name": f"Sem {unique_code()}", "year": 2026, "term": "SPRING",
                  "start_date": 1735689600.0, "end_date": 1748304000.0}
        )
        sem_data = ok(sem_response, 201)

        course_response = examiner.post(
            f"/api/examiner/semesters/{sem_data['id']}/courses",
            json={"name": f"Course {unique_code()}", "code": unique_code()}
        )
        return sem_data, ok(course_response, 201)

    def test_create_exam(self, env):
        """Test creating an exam for a course."""
        clients, _ = env
        examiner = clients["examiner"]
        _, course = self._create_course(examiner)

        response = examiner.post(
            f"/api/examiner/courses/{course['id']}/exams",
            json={
                "name": "Midterm Exam",
                "description": "Midterm assessment",
                "time_limit": 30,
                "question_count": 3,
            }
        )
        data = ok(response, 201)
        assert data["name"] == "Midterm Exam"
        assert data["status"] == "DRAFT"
        assert data["time_limit"] == 30

    def test_one_exam_per_course(self, env):
        """Test that only one exam can exist per course."""
        clients, _ = env
        examiner = clients["examiner"]
        _, course = self._create_course(examiner)

        examiner.post(
            f"/api/examiner/courses/{course['id']}/exams",
            json={"name": "First Exam", "time_limit": 30, "question_count": 3}
        )

        response = examiner.post(
            f"/api/examiner/courses/{course['id']}/exams",
            json={"name": "First Exam", "time_limit": 30, "question_count": 3}
        )
        assert response.status_code == 409

    def test_list_course_exams(self, env):
        """Test listing exams for a course."""
        clients, _ = env
        examiner = clients["examiner"]
        _, course = self._create_course(examiner)

        examiner.post(
            f"/api/examiner/courses/{course['id']}/exams",
            json={"name": "Test Exam", "time_limit": 30, "question_count": 3}
        )

        response = examiner.get(f"/api/examiner/courses/{course['id']}/exams")
        data = ok(response)
        assert len(data) == 1
        assert data[0]["name"] == "Test Exam"

    def test_get_exam_detail(self, env):
        """Test getting exam detail."""
        clients, _ = env
        examiner = clients["examiner"]
        _, course = self._create_course(examiner)

        create_response = examiner.post(
            f"/api/examiner/courses/{course['id']}/exams",
            json={"name": "Detail Exam", "time_limit": 45, "question_count": 5}
        )
        exam_data = ok(create_response, 201)

        detail_response = examiner.get(f"/api/examiner/exams/{exam_data['id']}")
        detail = ok(detail_response)
        assert detail["name"] == "Detail Exam"
        assert detail["time_limit"] == 45
        assert detail["slot_count"] == 0

    def test_list_all_exams(self, env):
        """Test listing all exams across courses."""
        clients, _ = env
        examiner = clients["examiner"]
        _, course = self._create_course(examiner)
        examiner.post(
            f"/api/examiner/courses/{course['id']}/exams",
            json={"name": "All Exams Test", "time_limit": 30, "question_count": 3}
        )

        exams = ok(examiner.get("/api/examiner/exams"))
        assert isinstance(exams, list)
        assert len(exams) >= 1
        assert "name" in exams[0]
        assert "course_id" in exams[0]
        assert "slot_count" in exams[0]


# ============================================================================
# Enrollment Import Tests
# ============================================================================


class TestEnrollmentImport:
    """Test enrollment import from Excel."""

    def test_import_enrollments(self, env):
        """Test importing students from Excel file."""
        clients, _ = env
        examiner = clients["examiner"]

        sem_response = examiner.post(
            "/api/examiner/semesters",
            json={"name": f"Sem {unique_code()}", "year": 2026, "term": "SPRING",
                  "start_date": 1735689600.0, "end_date": 1748304000.0}
        )
        sem_data = ok(sem_response, 201)
        course_response = examiner.post(
            f"/api/examiner/semesters/{sem_data['id']}/courses",
            json={"name": f"Course {unique_code()}", "code": unique_code()}
        )
        course = ok(course_response, 201)

        import openpyxl
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.append(["MSSV", "Ho ten", "Ma lop"])
        ws.append(["student", "Test Student", "SEC-01"])

        buffer = io.BytesIO()
        wb.save(buffer)
        buffer.seek(0)

        res = examiner.post(
            "/api/examiner/enrollments/import",
            data={"course_id": course["id"]},
            files={"file": ("test.xlsx", buffer, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        )
        data = ok(res)
        assert data["created_enrollments"] == 1
        assert data["created_sections"] == 1
        assert data["skipped"] == 0

    def test_import_skips_existing_enrollments(self, env):
        """Test that existing enrollments are skipped."""
        clients, _ = env
        examiner = clients["examiner"]

        sem_response = examiner.post(
            "/api/examiner/semesters",
            json={"name": f"Sem {unique_code()}", "year": 2026, "term": "SPRING",
                  "start_date": 1735689600.0, "end_date": 1748304000.0}
        )
        sem_data = ok(sem_response, 201)
        course_response = examiner.post(
            f"/api/examiner/semesters/{sem_data['id']}/courses",
            json={"name": f"Course {unique_code()}", "code": unique_code()}
        )
        course = ok(course_response, 201)

        import openpyxl
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.append(["MSSV", "Ho ten", "Ma lop"])
        ws.append(["student", "Test Student", "SEC-02"])

        buffer = io.BytesIO()
        wb.save(buffer)

        # Import first time
        examiner.post(
            "/api/examiner/enrollments/import",
            data={"course_id": course["id"]},
            files={"file": ("test.xlsx", io.BytesIO(buffer.getvalue()), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        )

        # Import second time
        res = examiner.post(
            "/api/examiner/enrollments/import",
            data={"course_id": course["id"]},
            files={"file": ("test.xlsx", io.BytesIO(buffer.getvalue()), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        )
        data = ok(res)
        assert data["created_enrollments"] == 0
        assert data["skipped"] == 1


# ============================================================================
# Enrollment Management Tests
# ============================================================================


class TestEnrollmentManagement:
    """Test Enrollment management endpoints."""

    def _create_course_with_section(self, examiner):
        """Helper to create course with section."""
        sem_response = examiner.post(
            "/api/examiner/semesters",
            json={"name": f"Sem {unique_code()}", "year": 2026, "term": "SPRING",
                  "start_date": 1735689600.0, "end_date": 1748304000.0}
        )
        sem_data = ok(sem_response, 201)

        course_response = examiner.post(
            f"/api/examiner/semesters/{sem_data['id']}/courses",
            json={"name": f"Course {unique_code()}", "code": unique_code()}
        )
        course = ok(course_response, 201)

        sections_response = examiner.get(
            f"/api/examiner/courses/{course['id']}/sections"
        )
        sections = ok(sections_response)
        return course, sections[0]

    def test_list_section_enrollments(self, env):
        """Test listing enrollments in a section."""
        clients, _ = env
        examiner = clients["examiner"]
        course, section = self._create_course_with_section(examiner)

        openpyxl = pytest.importorskip("openpyxl")
        import io
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.append(["MSSV", "Ho ten", "Ma lop"])
        ws.append(["student", "Test Student", section["code"]])

        buffer = io.BytesIO()
        wb.save(buffer)
        buffer.seek(0)

        examiner.post(
            "/api/examiner/enrollments/import",
            data={"course_id": course["id"]},
            files={"file": ("test.xlsx", buffer, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
        )

        response = examiner.get(f"/api/examiner/sections/{section['id']}/enrollments")
        data = ok(response)
        assert len(data) == 1
        assert data[0]["username"] == "student"

    def test_delete_enrollment(self, env):
        """Test deleting an enrollment."""
        clients, _ = env
        examiner = clients["examiner"]
        course, section = self._create_course_with_section(examiner)

        openpyxl = pytest.importorskip("openpyxl")
        import io
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.append(["MSSV", "Ho ten", "Ma lop"])
        ws.append(["student", "Test Student", section["code"]])

        buffer = io.BytesIO()
        wb.save(buffer)
        buffer.seek(0)

        examiner.post(
            "/api/examiner/enrollments/import",
            data={"course_id": course["id"]},
            files={"file": ("test.xlsx", buffer, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
        )

        list_response = examiner.get(f"/api/examiner/sections/{section['id']}/enrollments")
        enrollments = ok(list_response)
        assert len(enrollments) == 1

        delete_response = examiner.delete(
            f"/api/examiner/enrollments/{enrollments[0]['id']}"
        )
        assert delete_response.status_code == 200

        list_response2 = examiner.get(f"/api/examiner/sections/{section['id']}/enrollments")
        assert len(ok(list_response2)) == 0


# ============================================================================
# ScheduleSlot Tests
# ============================================================================


class TestScheduleSlots:
    """Test ScheduleSlot creation and auto-assignment."""

    def _setup_exam_with_enrollment(self, examiner):
        sem_response = examiner.post(
            "/api/examiner/semesters",
            json={"name": f"Sem {unique_code()}", "year": 2026, "term": "SPRING",
                  "start_date": 1735689600.0, "end_date": 1748304000.0}
        )
        sem = ok(sem_response, 201)
        course_response = examiner.post(
            f"/api/examiner/semesters/{sem['id']}/courses",
            json={"name": f"Course {unique_code()}", "code": unique_code()}
        )
        course = ok(course_response, 201)

        import openpyxl
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.append(["MSSV", "Ho ten", "Ma lop"])
        ws.append(["student", "Test Student", "SEC-SLOT"])

        buf = io.BytesIO()
        wb.save(buf)
        buf.seek(0)
        examiner.post(
            "/api/examiner/enrollments/import",
            data={"course_id": course["id"]},
            files={"file": ("test.xlsx", buf, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        )

        exam_res = examiner.post(
            f"/api/examiner/courses/{course['id']}/exams",
            json={"name": "Midterm Exam", "time_limit": 30, "question_count": 3}
        )
        exam = ok(exam_res, 201)
        return exam

    def test_create_slots_with_auto_assignment(self, env):
        """Test creating slots auto-assigns enrolled students."""
        clients, _ = env
        examiner = clients["examiner"]
        exam = self._setup_exam_with_enrollment(examiner)

        slot_data = ok(examiner.post(
            f"/api/examiner/exams/{exam['id']}/slots",
            json={
                "slots": [{
                    "slot_number": 1,
                    "date": 1737158400.0,
                    "start_time": "08:00",
                    "end_time": "09:00",
                    "room": "D101",
                    "max_students": 10,
                }]
            }
        ), 201)
        assert slot_data["created"] == 1
        assert len(slot_data["slots"]) == 1
        assert slot_data["slots"][0]["student_count"] == 1

    def test_list_slots(self, env):
        """Test listing slots for an exam."""
        clients, _ = env
        examiner = clients["examiner"]
        exam = self._setup_exam_with_enrollment(examiner)

        examiner.post(
            f"/api/examiner/exams/{exam['id']}/slots",
            json={
                "slots": [{
                    "slot_number": 1,
                    "date": 1737158400.0,
                    "start_time": "08:00",
                    "end_time": "09:00",
                    "room": "D101",
                    "max_students": 10,
                }]
            }
        )

        slots = ok(examiner.get(f"/api/examiner/exams/{exam['id']}/slots"))
        assert len(slots) == 1
        assert slots[0]["slot_number"] == 1
        assert slots[0]["room"] == "D101"

    def test_lock_unlock_slot(self, env):
        """Test locking and unlocking a slot."""
        clients, _ = env
        examiner = clients["examiner"]
        exam = self._setup_exam_with_enrollment(examiner)

        slot_data = ok(examiner.post(
            f"/api/examiner/exams/{exam['id']}/slots",
            json={
                "slots": [{
                    "slot_number": 1,
                    "date": 1737158400.0,
                    "start_time": "08:00",
                    "end_time": "09:00",
                    "room": "D101",
                    "max_students": 10,
                }]
            }
        ), 201)
        slot_id = slot_data["slots"][0]["id"]

        # Lock
        lock_data = ok(examiner.post(f"/api/examiner/slots/{slot_id}/lock"))
        assert lock_data["grade_locked"] is True

        # Unlock
        unlock_data = ok(examiner.post(f"/api/examiner/slots/{slot_id}/unlock"))
        assert unlock_data["grade_locked"] is False


# ============================================================================
# Results and Export Tests
# ============================================================================


class TestResultsAndExport:
    """Test results and FAP export endpoints."""

    def _setup_slot(self, examiner):
        sem_response = examiner.post(
            "/api/examiner/semesters",
            json={"name": f"Sem {unique_code()}", "year": 2026, "term": "SPRING",
                  "start_date": 1735689600.0, "end_date": 1748304000.0}
        )
        sem = ok(sem_response, 201)
        course_response = examiner.post(
            f"/api/examiner/semesters/{sem['id']}/courses",
            json={"name": f"Course {unique_code()}", "code": unique_code()}
        )
        course = ok(course_response, 201)

        import openpyxl
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.append(["MSSV", "Ho ten", "Ma lop"])
        ws.append(["student", "Test Student", "SEC-RES"])

        buf = io.BytesIO()
        wb.save(buf)
        buf.seek(0)
        examiner.post(
            "/api/examiner/enrollments/import",
            data={"course_id": course["id"]},
            files={"file": ("test.xlsx", buf, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        )

        exam_res = examiner.post(
            f"/api/examiner/courses/{course['id']}/exams",
            json={"name": "Midterm Exam", "time_limit": 30, "question_count": 3}
        )
        exam = ok(exam_res, 201)

        slot_data = ok(examiner.post(
            f"/api/examiner/exams/{exam['id']}/slots",
            json={
                "slots": [{
                    "slot_number": 1,
                    "date": 1737158400.0,
                    "start_time": "08:00",
                    "end_time": "09:00",
                    "room": "D101",
                    "max_students": 10,
                }]
            }
        ), 201)
        return slot_data["slots"][0]["id"]

    def test_slot_results(self, env):
        """Test getting results for a slot."""
        clients, _ = env
        examiner = clients["examiner"]
        slot_id = self._setup_slot(examiner)

        results = ok(examiner.get(f"/api/examiner/slots/{slot_id}/results"))
        assert len(results) == 1
        assert results[0]["username"] == "student"

    def test_export_fap(self, env):
        """Test FAP export returns Excel file."""
        clients, _ = env
        examiner = clients["examiner"]
        slot_id = self._setup_slot(examiner)

        res = examiner.get(f"/api/examiner/slots/{slot_id}/export")
        assert res.status_code == 200
        assert "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" in res.headers.get("content-type", "")


# ============================================================================
# Teacher Assignment Tests
# ============================================================================


class TestTeacherAssignment:
    """Test teacher assignment to slots."""

    def test_assign_teacher_to_slot(self, env):
        """Test assigning a teacher to create exam variant."""
        clients, factory = env
        examiner = clients["examiner"]

        with factory() as db:
            teacher = db.execute(select(User).where(User.username == "teacher")).scalar_one()
            teacher_id = teacher.id

        # Setup slot
        sem_res = examiner.post(
            "/api/examiner/semesters",
            json={"name": f"Sem {unique_code()}", "year": 2026, "term": "SPRING",
                  "start_date": 1735689600.0, "end_date": 1748304000.0}
        )
        sem = ok(sem_res, 201)
        course_res = examiner.post(
            f"/api/examiner/semesters/{sem['id']}/courses",
            json={"name": f"Course {unique_code()}", "code": unique_code()}
        )
        course = ok(course_res, 201)
        exam_res = examiner.post(
            f"/api/examiner/courses/{course['id']}/exams",
            json={"name": "Assign Exam", "time_limit": 30, "question_count": 3}
        )
        exam = ok(exam_res, 201)
        slot_res = ok(examiner.post(
            f"/api/examiner/exams/{exam['id']}/slots",
            json={"slots": [{"slot_number": 1, "date": 1737158400.0, "start_time": "08:00", "end_time": "09:00", "room": "R1", "max_students": 10}]}
        ), 201)
        slot_id = slot_res["slots"][0]["id"]

        assign_res = examiner.post(
            f"/api/examiner/slots/{slot_id}/assign-teacher",
            data={"teacher_id": teacher_id, "description": "Create variant A"},
        )
        assign_data = ok(assign_res)
        assert assign_data["status"] == "ASSIGNED"
        assert assign_data["teacher"]["id"] == teacher_id


# ============================================================================
# ReEvaluation Tests
# ============================================================================


class TestReEvaluation:
    """Test re-evaluation request endpoint."""

    def test_request_re_evaluation(self, env):
        """Test creating a re-evaluation request."""
        clients, factory = env
        examiner = clients["examiner"]

        with factory() as db:
            teacher = db.execute(select(User).where(User.username == "teacher")).scalar_one()
            student = db.execute(select(User).where(User.username == "student")).scalar_one()
            teacher_id = teacher.id
            student_id = student.id

        sem_res = examiner.post(
            "/api/examiner/semesters",
            json={"name": f"Sem {unique_code()}", "year": 2026, "term": "SPRING",
                  "start_date": 1735689600.0, "end_date": 1748304000.0}
        )
        sem = ok(sem_res, 201)
        course_res = examiner.post(
            f"/api/examiner/semesters/{sem['id']}/courses",
            json={"name": f"Course {unique_code()}", "code": unique_code()}
        )
        course = ok(course_res, 201)
        exam_res = examiner.post(
            f"/api/examiner/courses/{course['id']}/exams",
            json={"name": "ReEval Exam", "time_limit": 30, "question_count": 3}
        )
        exam = ok(exam_res, 201)

        # Create session & attempt in db
        from app.models import Attempt
        with factory() as db:
            session = ExamSession(
                exam_id=exam["id"],
                student_id=student_id,
                attempt_number=1,
                status="SUBMITTED",
                final_score=7.0,
            )
            db.add(session)
            db.flush()
            attempt = Attempt(
                session_id=session.id,
                sequence=1,
                question={"text": "Question 1"},
                status="EVALUATED",
            )
            db.add(attempt)
            db.commit()
            attempt_id = attempt.id

        re_eval_res = examiner.post(
            f"/api/examiner/attempts/{attempt_id}/request-re-eval",
            json={
                "teacher_id_2": teacher_id,
                "reason": "RECONTROLL",
                "reason_detail": "Yeu cau cham phuc khao do lech diem",
                "blind_marking": True,
            }
        )
        re_eval_data = ok(re_eval_res)
        assert re_eval_data["status"] == "PENDING"
        assert "id" in re_eval_data


# ============================================================================
# Student Attempts Tests
# ============================================================================


class TestStudentAttempts:
    """Test retrieving student attempts with audio and transcript."""

    def test_get_student_attempts(self, env):
        clients, factory = env
        examiner = clients["examiner"]

        with factory() as db:
            student = db.execute(select(User).where(User.username == "student")).scalar_one()
            student_id = student.id

        attempts = ok(examiner.get(f"/api/examiner/students/{student_id}/attempts"))
        assert isinstance(attempts, list)



# ============================================================================
# Authorization Tests
# ============================================================================


class TestAuthorization:
    """Test that role-based access control works correctly."""

    def test_non_examiner_cannot_access_examiner_routes(self, env):
        """Test that non-EXAMINER users get 403 on examiner routes."""
        clients, _ = env

        # Student should be denied (STUDENT role)
        response = clients["student"].get("/api/examiner/semesters")
        assert response.status_code == 403

        # Teacher should be denied (TEACHER role)
        response = clients["teacher"].get("/api/examiner/semesters")
        assert response.status_code == 403

        # Note: reviewer and examiner have EXAMINER role, so they CAN access examiner routes

    def test_examiner_can_access_examiner_routes(self, env):
        """Test that EXAMINER users can access examiner routes."""
        clients, _ = env
        examiner = clients["examiner"]

        # Should succeed
        response = examiner.get("/api/examiner/semesters")
        assert response.status_code == 200

        # Reviewer also has EXAMINER role
        response = clients["reviewer"].get("/api/examiner/semesters")
        assert response.status_code == 200

    def test_unauthenticated_user_cannot_access(self, env):
        """Test that unauthenticated users get 401."""
        from fastapi.testclient import TestClient
        from app.main import app

        client = TestClient(app)
        response = client.get("/api/examiner/semesters")
        assert response.status_code == 401
