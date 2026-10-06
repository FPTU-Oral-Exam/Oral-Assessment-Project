"""Integration tests for Examiner Course Candidate Pool."""
import io
import openpyxl
import pytest
from sqlalchemy import select

from app.models import Course, CourseCandidate, User


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


class TestCandidatePool:
    """Test suite for Course Candidate Pool Excel import and roster listing."""

    def test_import_candidates_success(self, env):
        clients, factory = env
        examiner = clients["examiner"]

        # Create a test course
        with factory() as db:
            course = Course(
                id="crs_cand_01",
                code="PRJ301_POOL",
                name="Candidate Pool Test",
                status="ACTIVE",
            )
            db.add(course)
            db.commit()

        excel_data = create_excel_bytes([
            ("SE203555", "Nguyễn Văn A", "ĐỦ ĐIỀU KIỆN"),
            ("SE203556", "Trần Văn B", "ELIGIBLE"),
            ("SE203557", "Lê Thị C", "CẤM THI"),
        ])

        response = examiner.post(
            f"/api/examiner/courses/{course.id}/candidates/import",
            files={"file": ("candidates.xlsx", excel_data, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["imported"] == 3
        assert data["skipped"] == 0
        assert data["total_rows"] == 3

        # Verify candidate records in DB
        with factory() as db:
            cands = db.scalars(
                select(CourseCandidate).where(CourseCandidate.course_id == course.id)
            ).all()
            assert len(cands) == 3
            cand_map = {c.roll_number: c for c in cands}
            assert cand_map["SE203555"].eligibility_status == "ELIGIBLE"
            assert cand_map["SE203556"].eligibility_status == "ELIGIBLE"
            assert cand_map["SE203557"].eligibility_status == "DISQUALIFIED"

    def test_import_creates_student_users(self, env):
        clients, factory = env
        examiner = clients["examiner"]

        with factory() as db:
            course = Course(
                id="crs_cand_user_01",
                code="SWP391_USER",
                name="Auto User Creation",
                status="ACTIVE",
            )
            db.add(course)
            db.commit()

        excel_data = create_excel_bytes([
            ("SE999999", "Tân Sinh Viên Test", "ELIGIBLE"),
        ])

        response = examiner.post(
            f"/api/examiner/courses/{course.id}/candidates/import",
            files={"file": ("test_students.xlsx", excel_data, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        )
        assert response.status_code == 200

        # Verify User was auto-created in DB
        with factory() as db:
            user = db.scalar(select(User).where(User.username == "SE999999"))
            assert user is not None
            assert user.role == "STUDENT"
            assert user.name == "Tân Sinh Viên Test"
            assert user.status == "ACTIVE"

    def test_import_skips_duplicates(self, env):
        clients, factory = env
        examiner = clients["examiner"]

        with factory() as db:
            course = Course(
                id="crs_cand_dup_01",
                code="PRM392_DUP",
                name="Duplicate Test",
                status="ACTIVE",
            )
            db.add(course)
            db.commit()

        excel_data = create_excel_bytes([
            ("SE888888", "Sinh Viên Lặp", "ELIGIBLE"),
        ])

        # First import
        r1 = examiner.post(
            f"/api/examiner/courses/{course.id}/candidates/import",
            files={"file": ("first.xlsx", excel_data, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        )
        assert r1.status_code == 200
        assert r1.json()["imported"] == 1

        # Second import (same file)
        r2 = examiner.post(
            f"/api/examiner/courses/{course.id}/candidates/import",
            files={"file": ("second.xlsx", excel_data, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        )
        assert r2.status_code == 200
        assert r2.json()["imported"] == 0
        assert r2.json()["skipped"] == 1

    def test_import_missing_columns(self, env):
        clients, factory = env
        examiner = clients["examiner"]

        with factory() as db:
            course = Course(
                id="crs_cand_err_01",
                code="CSD201_ERR",
                name="Error Test",
                status="ACTIVE",
            )
            db.add(course)
            db.commit()

        # Missing "Trạng thái đủ điều kiện"
        excel_data = create_excel_bytes(
            [("SE123456", "Test Student")],
            headers=("MSSV", "Họ và tên")
        )

        response = examiner.post(
            f"/api/examiner/courses/{course.id}/candidates/import",
            files={"file": ("invalid_cols.xlsx", excel_data, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        )
        assert response.status_code == 400
        assert response.json()["error"]["code"] == "MISSING_COLUMNS"

    def test_import_invalid_file_extension(self, env):
        clients, factory = env
        examiner = clients["examiner"]

        with factory() as db:
            course = Course(
                id="crs_cand_ext_01",
                code="DBI202_EXT",
                name="Extension Test",
                status="ACTIVE",
            )
            db.add(course)
            db.commit()

        response = examiner.post(
            f"/api/examiner/courses/{course.id}/candidates/import",
            files={"file": ("candidates.csv", b"MSSV,Name", "text/csv")},
        )
        assert response.status_code == 400
        assert response.json()["error"]["code"] == "INVALID_FILE"

    def test_list_candidates_with_filters(self, env):
        clients, factory = env
        examiner = clients["examiner"]

        with factory() as db:
            course = Course(
                id="crs_cand_filter_01",
                code="FER201_FILTER",
                name="Filter Candidate Test",
                status="ACTIVE",
            )
            db.add(course)
            db.commit()

        excel_data = create_excel_bytes([
            ("SE111001", "Trần Khả Ái", "ELIGIBLE"),
            ("SE111002", "Lê Văn Hùng", "DISQUALIFIED"),
            ("SE111003", "Phạm Quốc Toản", "ELIGIBLE"),
        ])

        examiner.post(
            f"/api/examiner/courses/{course.id}/candidates/import",
            files={"file": ("filter_test.xlsx", excel_data, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        )

        # Filter by eligibility ELIGIBLE
        r_elig = examiner.get(
            f"/api/examiner/courses/{course.id}/candidates",
            params={"eligibility_status": "ELIGIBLE"}
        )
        assert r_elig.status_code == 200
        data_elig = r_elig.json()
        assert len(data_elig) == 2
        assert all(c["eligibility_status"] == "ELIGIBLE" for c in data_elig)

        # Filter by search
        r_search = examiner.get(
            f"/api/examiner/courses/{course.id}/candidates",
            params={"search": "Quốc Toản"}
        )
        assert r_search.status_code == 200
        data_search = r_search.json()
        assert len(data_search) == 1
        assert data_search[0]["roll_number"] == "SE111003"

    def test_course_detail_candidate_stats(self, env):
        clients, factory = env
        examiner = clients["examiner"]

        with factory() as db:
            course = Course(
                id="crs_cand_stats_01",
                code="MAS291_STATS",
                name="Course Stats Test",
                status="ACTIVE",
            )
            db.add(course)
            db.commit()

        excel_data = create_excel_bytes([
            ("SE555001", "Student One", "ELIGIBLE"),
            ("SE555002", "Student Two", "ELIGIBLE"),
            ("SE555003", "Student Three", "DISQUALIFIED"),
        ])

        examiner.post(
            f"/api/examiner/courses/{course.id}/candidates/import",
            files={"file": ("stats_test.xlsx", excel_data, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        )

        r_detail = examiner.get(f"/api/examiner/courses/{course.id}")
        assert r_detail.status_code == 200
        data = r_detail.json()
        assert "stats" in data
        stats = data["stats"]
        assert stats["total"] == 3
        assert stats["eligible"] == 2
        assert stats["disqualified"] == 1
        assert stats["assigned"] == 0
        assert stats["unassigned"] == 2
