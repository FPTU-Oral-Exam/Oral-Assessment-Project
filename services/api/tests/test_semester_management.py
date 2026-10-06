"""Integration tests for Examiner Semester Management."""
import pytest
from app.models import Semester, Course, CourseCandidate, Exam, ExamBatch


class TestSemesterManagement:
    """Test suite for semester lifecycle management."""

    def test_create_semester_success(self, env):
        clients, _ = env
        examiner = clients["examiner"]

        response = examiner.post(
            "/api/examiner/semesters",
            json={
                "name": "Fall 2026",
                "year": 2026,
                "term": "FALL",
                "start_date": 1725120000.0,
                "end_date": 1735689600.0,
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Fall 2026"
        assert data["status"] == "DRAFT"
        assert "id" in data

    def test_create_semester_duplicate_year_term(self, env):
        clients, _ = env
        examiner = clients["examiner"]

        # First semester
        r1 = examiner.post(
            "/api/examiner/semesters",
            json={
                "name": "Spring 2027",
                "year": 2027,
                "term": "SPRING",
                "start_date": 1735689600.0,
                "end_date": 1748304000.0,
            },
        )
        assert r1.status_code == 201

        # Duplicate year + term
        r2 = examiner.post(
            "/api/examiner/semesters",
            json={
                "name": "Spring 2027 Duplicate",
                "year": 2027,
                "term": "SPRING",
                "start_date": 1735689600.0,
                "end_date": 1748304000.0,
            },
        )
        assert r2.status_code == 409
        assert r2.json()["error"]["code"] == "SEMESTER_EXISTS"

    def test_create_semester_end_before_start(self, env):
        clients, _ = env
        examiner = clients["examiner"]

        response = examiner.post(
            "/api/examiner/semesters",
            json={
                "name": "Invalid Semester",
                "year": 2028,
                "term": "FALL",
                "start_date": 1735689600.0,
                "end_date": 1725120000.0,
            },
        )
        assert response.status_code == 422

    def test_activate_semester(self, env):
        clients, _ = env
        examiner = clients["examiner"]

        r_create = examiner.post(
            "/api/examiner/semesters",
            json={
                "name": "Summer 2027",
                "year": 2027,
                "term": "SUMMER",
                "start_date": 1747267200.0,
                "end_date": 1756080000.0,
            },
        )
        assert r_create.status_code == 201
        semester_id = r_create.json()["id"]

        r_act = examiner.post(f"/api/examiner/semesters/{semester_id}/activate")
        assert r_act.status_code == 200
        assert r_act.json()["status"] == "ACTIVE"

    def test_complete_semester(self, env):
        clients, _ = env
        examiner = clients["examiner"]

        r_create = examiner.post(
            "/api/examiner/semesters",
            json={
                "name": "Fall 2028",
                "year": 2028,
                "term": "FALL",
                "start_date": 1756080000.0,
                "end_date": 1766080000.0,
            },
        )
        assert r_create.status_code == 201
        semester_id = r_create.json()["id"]

        # Activate first
        examiner.post(f"/api/examiner/semesters/{semester_id}/activate")

        # Then complete
        r_comp = examiner.post(f"/api/examiner/semesters/{semester_id}/complete")
        assert r_comp.status_code == 200
        assert r_comp.json()["status"] == "COMPLETED"

    def test_get_semester_detail(self, env):
        clients, factory = env
        examiner = clients["examiner"]

        r_create = examiner.post(
            "/api/examiner/semesters",
            json={
                "name": "Detail Test 2029",
                "year": 2029,
                "term": "SPRING",
                "start_date": 1766080000.0,
                "end_date": 1776080000.0,
            },
        )
        assert r_create.status_code == 201
        semester_id = r_create.json()["id"]

        # Link a course directly to this semester
        with factory() as db:
            course = Course(
                id="crs_test_detail_01",
                code="PRJ301_DETAIL",
                name="Java Web Detail",
                semester_id=semester_id,
                department_code="SE",
                credits=3,
                status="ACTIVE",
            )
            db.add(course)
            db.commit()

        r_detail = examiner.get(f"/api/examiner/semesters/{semester_id}")
        assert r_detail.status_code == 200
        data = r_detail.json()
        assert data["name"] == "Detail Test 2029"
        assert data["course_count"] == 1
        assert len(data["courses"]) == 1
        assert data["courses"][0]["code"] == "PRJ301_DETAIL"
        assert data["total_candidates"] == 0
        assert data["total_batches"] == 0
