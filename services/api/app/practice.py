"""Built-in practice course, seeded idempotently without AI keys or external calls."""

from sqlalchemy import select

from .models import Course, Exam, LearningOutcome, Rubric, Topic, TopicOutcome, User

COURSE_ID = "00000000-0000-4000-8000-000000000001"
EXAM_ID = "00000000-0000-4000-8000-000000000002"


def ensure_practice(db):
    owner = db.scalar(
        select(User)
        .where(User.role.in_(["SYSTEM_ADMIN", "ADMIN"]))
        .order_by(User.created_at)
    )
    if not owner:
        return

    course = db.get(Course, COURSE_ID)
    if not course:
        course = Course(
            id=COURSE_ID,
            code="ORAL-PRACTICE",
            name="English Oral Assessment Practice",
            description="Default practice course for testing microphone, camera, and English oral assessment flow.",
            owner_id=owner.id,
        )
        db.add(course)
        db.flush()
    else:
        course.name = "English Oral Assessment Practice"
        course.description = "Default practice course for testing microphone, camera, and English oral assessment flow."

    lo = db.scalar(select(LearningOutcome).where(LearningOutcome.course_id == course.id, LearningOutcome.code == "PRACTICE"))
    if not lo:
        lo = LearningOutcome(
            course_id=course.id, code="PRACTICE", description="Demonstrate clear English speaking and reasoning skills"
        )
        db.add(lo)
        db.flush()
    else:
        lo.description = "Demonstrate clear English speaking and reasoning skills"

    topic = db.scalar(select(Topic).where(Topic.course_id == course.id))
    if not topic:
        topic = Topic(
            course_id=course.id,
            learning_outcome_id=lo.id,
            name="Communication & Problem Solving",
            description="Explain ideas clearly in English with concrete examples",
        )
        db.add(topic)
        db.flush()
        db.add(TopicOutcome(topic_id=topic.id, outcome_id=lo.id))
    else:
        topic.name = "Communication & Problem Solving"
        topic.description = "Explain ideas clearly in English with concrete examples"

    criteria = [
        {"name": "Clarity & Structure", "description": "Expresses ideas clearly and logically in English", "max_score": 5, "weight": 1},
        {"name": "Content & Examples", "description": "Provides relevant concrete examples to support statements", "max_score": 5, "weight": 1}
    ]

    rubric = db.scalar(select(Rubric).where(Rubric.course_id == course.id))
    if not rubric:
        rubric = Rubric(course_id=course.id, name="English Practice Rubric", criteria=criteria)
        db.add(rubric)
        db.flush()
    else:
        rubric.name = "English Practice Rubric"
        rubric.criteria = criteria

    questions = [
        {
            "text": "Please briefly introduce yourself and share one of your key academic or professional goals.",
            "topic_id": topic.id,
            "difficulty": "EASY",
            "expected_concepts": ["Personal introduction", "Academic or professional goal"],
            "english_terms": [{"term": "Introduction", "meaning": "Giới thiệu"}, {"term": "Goal", "meaning": "Mục tiêu"}],
            "reference_chunk_ids": [],
        },
        {
            "text": "Describe a challenging problem you faced recently and how you resolved it, highlighting the key lessons learned.",
            "topic_id": topic.id,
            "difficulty": "EASY",
            "expected_concepts": ["Problem description", "Solution approach", "Key takeaway"],
            "english_terms": [{"term": "Challenge", "meaning": "Thử thách"}, {"term": "Solution", "meaning": "Giải pháp"}],
            "reference_chunk_ids": [],
        },
    ]

    exam = db.get(Exam, EXAM_ID)
    if not exam:
        exam = Exam(
            id=EXAM_ID,
            course_id=course.id,
            rubric_id=rubric.id,
            name="Practice Exam: English Oral Assessment",
            time_limit=600,
            blueprint=[{"topic_id": topic.id, "difficulty": "EASY", "count": 2}],
            status="PUBLISHED",
            snapshot={
                "practice": True,
                "questions": questions,
                "criteria": criteria,
                "rubric_version": 2,
                "knowledge_version": "practice-v2",
                "ai_provider": "demo",
                "embedding_model": "demo-hash-768-v1",
                "llm_model": "practice",
                "prompt_version": "practice-v2",
                "document_ids": [],
                "topic_chunk_ids": {},
            },
        )
        db.add(exam)
    else:
        exam.name = "Practice Exam: English Oral Assessment"
        exam.snapshot = {
            "practice": True,
            "questions": questions,
            "criteria": criteria,
            "rubric_version": 2,
            "knowledge_version": "practice-v2",
            "ai_provider": "demo",
            "embedding_model": "demo-hash-768-v1",
            "llm_model": "practice",
            "prompt_version": "practice-v2",
            "document_ids": [],
            "topic_chunk_ids": {},
        }
    db.commit()
