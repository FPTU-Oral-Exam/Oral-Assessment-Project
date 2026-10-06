import time
import uuid
import pytest
from app.models import Course, Exam, ExamBatch, ScheduleSlot, Semester, User


def unique_code():
    return f"TC{str(uuid.uuid4())[:6].upper()}"


def test_teacher_semesters_empty(env):
    clients, _ = env
    teacher = clients["teacher"]
    resp = teacher.get("/api/admin/teacher-semesters")
    assert resp.status_code == 200
    assert resp.json() == []


def test_teacher_semesters_with_assigned_batch(env):
    clients, session_factory = env
    examiner = clients["examiner"]
    teacher = clients["teacher"]

    # 1. Create a semester
    sem_res = examiner.post(
        "/api/examiner/semesters",
        json={
            "name": "Spring 2026 Test",
            "year": 2026,
            "term": "SPRING",
            "start_date": 1735689600.0,
            "end_date": 1743465600.0,
        },
    )
    assert sem_res.status_code == 201
    sem_id = sem_res.json()["id"]

    # 2. Add course to semester
    course_code = unique_code()
    course_res = examiner.post(
        f"/api/examiner/semesters/{sem_id}/courses",
        json={
            "code": course_code,
            "name": f"Lap trinh {course_code}",
            "credits": 3,
            "department_code": "IT",
        },
    )
    assert course_res.status_code in [200, 201]
    course_id = course_res.json()["id"]

    # 3. Create exam for course
    exam_res = examiner.post(
        f"/api/examiner/courses/{course_id}/exams",
        json={
            "name": "Thi Cuoi Ky",
            "description": "Exam desc",
            "time_limit": 30,
            "question_count": 3,
        },
    )
    assert exam_res.status_code in [200, 201]
    exam_id = exam_res.json()["id"]

    # 4. Create batch assigned to teacher
    with session_factory() as db:
        teacher_user = db.query(User).filter(User.role == "TEACHER").first()
        teacher_id = teacher_user.id

        batch = ExamBatch(
            exam_id=exam_id,
            name="Ca 1 - Sang",
            date=1736000000.0,
            start_time="08:00",
            end_time="10:00",
            max_students_per_room=15,
            assigned_teacher_id=teacher_id,
            total_assigned=25,
            status="SCHEDULED",
        )
        db.add(batch)
        db.flush()

        slot = ScheduleSlot(
            exam_id=exam_id,
            batch_id=batch.id,
            slot_number=1,
            date=1736000000.0,
            start_time="08:00",
            end_time="10:00",
            room="AL-L401",
            max_students=15,
            assigned_students_count=15,
        )
        db.add(slot)
        db.commit()

    # 5. Teacher queries teacher-semesters
    resp = teacher.get("/api/admin/teacher-semesters")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 1

    sem_entry = next((s for s in data if s["semester_id"] == sem_id), None)
    assert sem_entry is not None
    assert sem_entry["semester_name"] == "Spring 2026 Test"

    course_entry = next((c for c in sem_entry["courses"] if c["id"] == course_id), None)
    assert course_entry is not None
    assert course_entry["code"] == course_code

    exam_entry = next((e for e in course_entry["exams"] if e["id"] == exam_id), None)
    assert exam_entry is not None
    assert len(exam_entry["batches"]) == 1
    assert exam_entry["batches"][0]["name"] == "Ca 1 - Sang"
    assert "AL-L401" in exam_entry["batches"][0]["rooms"]
