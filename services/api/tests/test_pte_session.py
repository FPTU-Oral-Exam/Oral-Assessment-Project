import time
from app.db import SessionLocal
from app.models import Exam, ExamSession, Attempt, User
from app.routes_exam import public_session


def test_public_session_pte_fields():
    db = SessionLocal()
    try:
        exam = db.query(Exam).filter(Exam.name == "PTE Speaking Practice Test 1").first()
        assert exam is not None, "PTE Exam must exist"

        student = User(username=f"test_pte_{int(time.time() * 1000)}", name="Test Student", role="STUDENT", password_hash="hash")
        db.add(student)
        db.flush()

        # Create a test session
        session = ExamSession(
            exam_id=exam.id,
            student_id=student.id,
            attempt_number=1,
            status="IN_PROGRESS",
            started_at=time.time(),
        )
        db.add(session)
        db.flush()

        questions = exam.snapshot.get("questions", [])
        for idx, q in enumerate(questions):
            db.add(Attempt(session_id=session.id, sequence=idx + 1, question=q, status="READY"))
        db.flush()

        data = public_session(db, session)
        curr = data["current_attempt"]
        assert curr is not None
        assert curr["sequence"] == 1
        assert curr["type"] == "READ_ALOUD"
        assert "Sleep behavior" in curr["text"]
        assert curr["prep_time"] == 40
        assert curr["speak_time"] == 40
        assert curr["silence_timeout"] == 3
        assert curr["model_audio"] == "/pte/test1/q1_ra_sample.mp3"
        assert "Look at the text below" in curr["instruction"]
    finally:
        db.rollback()
        db.close()


if __name__ == "__main__":
    test_public_session_pte_fields()
    print("ALL PTE SERIALIZATION ASSERTIONS PASSED!")
