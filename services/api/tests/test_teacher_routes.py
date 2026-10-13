import time
import uuid
import pytest
from sqlalchemy import select
from app.models import (
    Attempt,
    Course,
    Exam,
    ExamBatch,
    ExamSession,
    ReEvaluation,
    ScheduleSlot,
    SlotAssignment,
    User,
)


def unique_code():
    return f"TC{str(uuid.uuid4())[:6].upper()}"


def test_teacher_schedule_empty(env):
    clients, _ = env
    teacher = clients["teacher"]
    resp = teacher.get("/api/teacher/schedule")
    assert resp.status_code == 200
    assert resp.json() == []


def test_teacher_schedule_with_assigned_batch(env):
    clients, session_factory = env
    teacher_client = clients["teacher"]

    with session_factory() as db:
        teacher_user = db.scalar(select(User).where(User.username == "teacher"))
        teacher_id = teacher_user.id

        course = Course(code=unique_code(), name="Lập trình Python", owner_id=teacher_id)
        db.add(course)
        db.flush()

        exam = Exam(
            course_id=course.id,
            name="Thi Cuối Kỳ Python",
            time_limit=30,
            question_count=3,
            status="PUBLISHED",
            snapshot={"llm_model": "test-model"},
        )
        db.add(exam)
        db.flush()

        batch = ExamBatch(
            exam_id=exam.id,
            name="Ca 1 - Sáng T2",
            date=time.time(),
            start_time="08:00",
            end_time="10:00",
            assigned_teacher_id=teacher_id,
        )
        db.add(batch)
        db.flush()

        slot = ScheduleSlot(
            exam_id=exam.id,
            batch_id=batch.id,
            slot_number=1,
            date=time.time(),
            start_time="08:00",
            end_time="10:00",
            room="A301",
            max_students=20,
            status="READY",
        )
        db.add(slot)
        db.commit()

        slot_id = slot.id

    resp = teacher_client.get("/api/teacher/schedule")
    assert resp.status_code == 200
    slots = resp.json()
    assert len(slots) >= 1
    target = next((s for s in slots if s["id"] == slot_id), None)
    assert target is not None
    assert target["room"] == "A301"
    assert target["exam_name"] == "Thi Cuối Kỳ Python"
    assert target["course_name"] == "Lập trình Python"


def test_teacher_proctor_room_candidates(env):
    clients, session_factory = env
    teacher_client = clients["teacher"]

    with session_factory() as db:
        teacher_user = db.scalar(select(User).where(User.username == "teacher"))
        student_user = db.scalar(select(User).where(User.username == "student"))

        course = Course(code=unique_code(), name="Tiếng Anh Chuyên Ngành", owner_id=teacher_user.id)
        db.add(course)
        db.flush()

        exam = Exam(
            course_id=course.id,
            name="Vấn đáp Tiếng Anh",
            time_limit=20,
            question_count=2,
            status="PUBLISHED",
            snapshot={},
        )
        db.add(exam)
        db.flush()

        batch = ExamBatch(
            exam_id=exam.id,
            name="Ca 2 - Chiều T3",
            date=time.time(),
            start_time="13:30",
            end_time="15:30",
            assigned_teacher_id=teacher_user.id,
        )
        db.add(batch)
        db.flush()

        slot = ScheduleSlot(
            exam_id=exam.id,
            batch_id=batch.id,
            slot_number=1,
            date=time.time(),
            start_time="13:30",
            end_time="15:30",
            room="B202",
            max_students=15,
            status="IN_PROGRESS",
        )
        db.add(slot)
        db.flush()

        # Assign student to slot
        assignment = SlotAssignment(slot_id=slot.id, student_id=student_user.id)
        db.add(assignment)

        # Create exam session for student
        sess = ExamSession(
            exam_id=exam.id,
            student_id=student_user.id,
            status="DEVICE_CHECK",
            started_at=time.time(),
        )
        db.add(sess)
        db.commit()

        slot_id = slot.id
        student_id = student_user.id

    resp = teacher_client.get(f"/api/teacher/proctor/{slot_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["slot"]["room"] == "B202"
    assert data["exam"]["name"] == "Vấn đáp Tiếng Anh"
    assert len(data["candidates"]) == 1
    candidate = data["candidates"][0]
    assert candidate["student_id"] == student_id
    assert candidate["status"] == "DEVICE_CHECK"


def test_teacher_results_and_grading_flow(env):
    clients, session_factory = env
    teacher_client = clients["teacher"]

    with session_factory() as db:
        teacher_user = db.scalar(select(User).where(User.username == "teacher"))
        student_user = db.scalar(select(User).where(User.username == "student"))

        course = Course(code=unique_code(), name="Cấu trúc dữ liệu", owner_id=teacher_user.id)
        db.add(course)
        db.flush()

        exam = Exam(
            course_id=course.id,
            name="Thi Vấn Đáp DSA",
            time_limit=45,
            question_count=1,
            status="PUBLISHED",
            snapshot={
                "llm_model": "test-ai",
                "rubric": {
                    "criteria": [{"name": "Độ chính xác", "max_score": 10.0, "weight": 1.0}]
                },
            },
        )
        db.add(exam)
        db.flush()

        session = ExamSession(
            exam_id=exam.id,
            student_id=student_user.id,
            status="SUBMITTED",
            started_at=time.time() - 3600,
            completed_at=time.time(),
        )
        db.add(session)
        db.flush()

        attempt = Attempt(
            session_id=session.id,
            sequence=1,
            question={"text": "Giải thích Binary Search Tree?"},
            transcript="Binary search tree là cây nhị phân tìm kiếm...",
            stt_confidence=0.95,
            assessment={
                "score": 8.0,
                "criteria": [{"name": "Độ chính xác", "score": 8.0, "feedback": "Khá tốt"}],
            },
            status="GRADED",
        )
        db.add(attempt)
        db.commit()

        session_id = session.id
        attempt_id = attempt.id

    # 1. Get results list
    res_list = teacher_client.get("/api/teacher/results")
    assert res_list.status_code == 200
    items = res_list.json()
    assert any(r["id"] == session_id for r in items)

    # 2. Get result detail
    res_detail = teacher_client.get(f"/api/teacher/results/{session_id}")
    assert res_detail.status_code == 200
    detail = res_detail.json()
    assert detail["exam_name"] == "Thi Vấn Đáp DSA"
    assert len(detail["attempts"]) == 1

    # 3. Score override
    res_override = teacher_client.post(
        f"/api/teacher/attempts/{attempt_id}/override",
        json={
            "score": 9.5,
            "reason": "Sinh viên trả lời xuất sắc chi tiết con trỏ",
            "criteria": [{"name": "Độ chính xác", "score": 9.5, "feedback": "Xuất sắc"}],
        },
    )
    assert res_override.status_code == 200
    override_data = res_override.json()
    assert override_data["assessment"]["score"] == 9.5
    assert override_data["assessment"]["manual_override"] is True

    # 4. Approve session
    res_approve = teacher_client.post(f"/api/teacher/results/{session_id}/approve")
    assert res_approve.status_code == 200
    approve_data = res_approve.json()
    assert approve_data["status"] == "COMPLETED"
    assert approve_data["final_score"] == 9.5


def test_teacher_re_evaluation_flow(env):
    clients, session_factory = env
    teacher_client = clients["teacher"]

    with session_factory() as db:
        teacher_1 = db.scalar(select(User).where(User.username == "teacher"))
        teacher_2 = db.scalar(select(User).where(User.username == "system_admin"))
        student = db.scalar(select(User).where(User.username == "student"))

        course = Course(code=unique_code(), name="Mạng Máy Tính", owner_id=teacher_1.id)
        db.add(course)
        db.flush()

        exam = Exam(
            course_id=course.id,
            name="Vấn đáp Mạng",
            time_limit=30,
            question_count=1,
            status="PUBLISHED",
            snapshot={},
        )
        db.add(exam)
        db.flush()

        session = ExamSession(
            exam_id=exam.id,
            student_id=student.id,
            status="SUBMITTED",
        )
        db.add(session)
        db.flush()

        attempt = Attempt(
            session_id=session.id,
            sequence=1,
            question={"text": "TCP vs UDP?"},
            assessment={"score": 6.0},
            status="GRADED",
        )
        db.add(attempt)
        db.flush()

        re_eval = ReEvaluation(
            attempt_id=attempt.id,
            teacher_id_1=teacher_2.id,
            teacher_id_2=teacher_1.id,  # teacher_client is the 2nd grader
            reason="GRADE_DISPUTE",
            reason_detail="Sinh viên đề nghị phúc khảo",
            score_1=6.0,
            status="PENDING",
            blind_marking=True,
        )
        db.add(re_eval)
        db.commit()

        re_eval_id = re_eval.id

    # 1. Get re-evaluations list (blind marking: score_1 should be None)
    res_list = teacher_client.get("/api/teacher/re-evaluations")
    assert res_list.status_code == 200
    items = res_list.json()
    target = next((item for item in items if item["id"] == re_eval_id), None)
    assert target is not None
    assert target["score_1"] is None  # Blind marking hides score_1

    # 2. Submit 2nd grader score
    res_submit = teacher_client.post(
        f"/api/teacher/re-evaluations/{re_eval_id}/submit",
        json={"score_2": 8.0, "feedback": "Phân tích TCP Handshake tốt"},
    )
    assert res_submit.status_code == 200
    submit_data = res_submit.json()
    assert submit_data["status"] == "COMPLETED"
    assert submit_data["score_2"] == 8.0
    assert submit_data["final_score"] == 7.0  # Average of 6.0 and 8.0


def test_teacher_role_enforcement(env):
    clients, _ = env
    student_client = clients["student"]

    # Student should receive 403 FORBIDDEN when attempting to access Teacher endpoints
    res_sched = student_client.get("/api/teacher/schedule")
    assert res_sched.status_code == 403

    res_results = student_client.get("/api/teacher/results")
    assert res_results.status_code == 403


def test_teacher_regrade_and_request_re_eval(env):
    clients, session_factory = env
    teacher_client = clients["teacher"]

    with session_factory() as db:
        teacher_user = db.scalar(select(User).where(User.username == "teacher"))
        reviewer_user = db.scalar(select(User).where(User.username == "examiner"))
        student_user = db.scalar(select(User).where(User.username == "student"))

        course = Course(code=unique_code(), name="Hệ Điều Hành", owner_id=teacher_user.id)
        db.add(course)
        db.flush()

        exam = Exam(
            course_id=course.id,
            name="Vấn đáp HĐH",
            time_limit=30,
            question_count=1,
            status="PUBLISHED",
            snapshot={
                "assembly_mode": "ITEM_BANK_BLUEPRINT",
                "llm_model": "test-ai",
                "criteria": [{"name": "Tiến trình", "max_score": 10.0, "weight": 1.0}],
            },
        )
        db.add(exam)
        db.flush()

        session = ExamSession(
            exam_id=exam.id,
            student_id=student_user.id,
            status="SUBMITTED",
            started_at=time.time(),
        )
        db.add(session)
        db.flush()

        attempt = Attempt(
            session_id=session.id,
            sequence=1,
            question={"text": "Phân biệt Process và Thread?"},
            transcript="Process là tiến trình có không gian nhớ riêng...",
            assessment={"score": 7.0},
            status="GRADED",
        )
        db.add(attempt)
        db.commit()

        attempt_id = attempt.id
        reviewer_id = reviewer_user.id

    # 1. Regrade transcript
    res_regrade = teacher_client.post(
        f"/api/teacher/attempts/{attempt_id}/regrade",
        json={
            "corrected_transcript": "Process là tiến trình có không gian địa chỉ riêng biệt, còn Thread chia sẻ chung không gian nhớ.",
            "reason": "Sửa lỗi nhận diện sai từ chuyên ngành do giọng nói địa phương",
        },
    )
    assert res_regrade.status_code == 200, f"Regrade failed with: {res_regrade.text}"
    regrade_data = res_regrade.json()
    assert regrade_data["transcript"].startswith("Process là tiến trình có không gian địa chỉ")

    # 2. Request re-evaluation
    res_req = teacher_client.post(
        f"/api/teacher/attempts/{attempt_id}/request-re-eval",
        json={
            "teacher_id_2": reviewer_id,
            "reason": "EXAMINER_REQUEST",
            "reason_detail": "Bài thi có ý trả lời đặc biệt cần chấm chéo độc lập",
            "blind_marking": True,
        },
    )
    assert res_req.status_code == 200
    assert res_req.json()["status"] == "PENDING"

