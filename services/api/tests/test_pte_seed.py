from app.db import SessionLocal
from app.models import Course, Exam, Rubric


def test_pte_exam_seeded_correctly():
    db = SessionLocal()
    try:
        course = db.query(Course).filter(Course.code == "PTE-CORE").first()
        assert course is not None, "PTE-CORE course must exist"

        exam = db.query(Exam).filter(Exam.name == "PTE Speaking Practice Test 1").first()
        assert exam is not None, "PTE Speaking Practice Test 1 must exist"
        assert exam.status == "PUBLISHED"
        assert len(exam.snapshot["questions"]) == 6

        q_types = [q["type"] for q in exam.snapshot["questions"]]
        assert q_types == [
            "READ_ALOUD",
            "REPEAT_SENTENCE",
            "DESCRIBE_IMAGE",
            "RETELL_LECTURE",
            "SUMMARIZE_GROUP_DISCUSSION",
            "RESPOND_TO_SITUATION",
        ]
    finally:
        db.close()
