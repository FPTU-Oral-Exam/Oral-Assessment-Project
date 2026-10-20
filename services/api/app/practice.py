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
    ensure_default_matrix(db)


def ensure_default_ents_rubric(db):
    import time
    from .models import Rubric

    rubric_name = "Rubric Chuẩn ENTs Speaking Test (5 Tiêu chí - Thang 10)"
    rubric = db.scalar(
        select(Rubric).where(Rubric.name == rubric_name).limit(1)
    )

    criteria = [
        {
            "id": "ideas",
            "name": "Ideas",
            "max_score": 2.0,
            "weight": 20.0,
            "description": "Mức độ phát triển ý tưởng, tính mạch lạc và độ tập trung vào chủ đề.",
            "descriptors": [
                {"level": "Exceeds standard", "score_range": "1.6 - 2.0", "description": "Presents a well-developed response with clear organization to the question with relevant, extended and supported ideas."},
                {"level": "Meets standard", "score_range": "1.0 - below 1.6", "description": "Presents relevant ideas but some may be inadequately developed or unclear, or some supporting ideas may lack focus."},
                {"level": "Attempt made", "score_range": "0.6 - below 1.0", "description": "Has few ideas but ideas are not organized. Some ideas are off-topic."},
                {"level": "Insufficient evidence", "score_range": "0 - below 0.6", "description": "Has no ideas at all, or all or most ideas are off-topic."},
            ],
        },
        {
            "id": "pronunciation",
            "name": "Pronunciation",
            "max_score": 2.0,
            "weight": 20.0,
            "description": "Độ rõ ràng của phát âm, nguyên âm/phụ âm, trọng âm từ và ngữ điệu câu.",
            "descriptors": [
                {"level": "Exceeds standard", "score_range": "1.6 - 2.0", "description": "Speaks with a clear voice and near-native pronunciation, stress and intonation. L1 accent has minimal effects."},
                {"level": "Meets standard", "score_range": "1.0 - below 1.6", "description": "Speaks with a clear voice but still in L1 accent. Speech is understandable. Some errors in word pronunciation, stress and sentence intonation may be found."},
                {"level": "Attempt made", "score_range": "0.6 - below 1.0", "description": "Speech is a little hard to be understood due to lots of errors in pronunciation."},
                {"level": "Insufficient evidence", "score_range": "0 - below 0.6", "description": "Pronunciation makes it impossible to understand speech. Or speaks nothing."},
            ],
        },
        {
            "id": "grammar_range_accuracy",
            "name": "Grammar Range and Accuracy",
            "max_score": 2.0,
            "weight": 20.0,
            "description": "Độ đa dạng cấu trúc ngữ pháp và độ chính xác của câu.",
            "descriptors": [
                {"level": "Exceeds standard", "score_range": "1.6 - 2.0", "description": "Uses a wide range of structures flexibly. The majority of sentences are error free."},
                {"level": "Meets standard", "score_range": "1.0 - below 1.6", "description": "Simple sentences are mostly accurate. Some complex sentences are used with noticeable mistakes."},
                {"level": "Attempt made", "score_range": "0.6 - below 1.0", "description": "Uses only simple sentences with errors. Errors prevent understanding frequently."},
                {"level": "Insufficient evidence", "score_range": "0 - below 0.6", "description": "Cannot produce basic sentence forms with grammar mistakes that make it hard to understand."},
            ],
        },
        {
            "id": "vocabulary_range_accuracy",
            "name": "Vocabulary Range and Accuracy",
            "max_score": 2.0,
            "weight": 20.0,
            "description": "Vốn từ vựng, độ chính xác của từ ngữ, ngữ cảnh sử dụng và paraphrase.",
            "descriptors": [
                {"level": "Exceeds standard", "score_range": "1.6 - 2.0", "description": "Uses a wide vocabulary resource readily and flexibly to convey precise meaning."},
                {"level": "Meets standard", "score_range": "1.0 - below 1.6", "description": "Vocabulary use is sufficient to discuss topics at length with clear overall meaning."},
                {"level": "Attempt made", "score_range": "0.6 - below 1.0", "description": "Manages to talk about the topic using mainly simple vocabulary with frequent inappropriacies."},
                {"level": "Insufficient evidence", "score_range": "0 - below 0.6", "description": "Speaks nothing or only produces isolated words or memorized utterances."},
            ],
        },
        {
            "id": "fluency_coherence",
            "name": "Fluency and coherence",
            "max_score": 2.0,
            "weight": 20.0,
            "description": "Độ trôi chảy, nhịp điệu bài nói, ngắt nghỉ hợp lý và từ nối liên kết.",
            "descriptors": [
                {"level": "Exceeds standard", "score_range": "1.6 - 2.0", "description": "Speaks fluently with no or occasional repetition or self-correction."},
                {"level": "Meets standard", "score_range": "1.0 - below 1.6", "description": "Can speak for a while and shows readiness to talk at length with linking words."},
                {"level": "Attempt made", "score_range": "0.6 - below 1.0", "description": "Speaks with noticeable effort. Pauses and self-correction often happen."},
                {"level": "Insufficient evidence", "score_range": "0 - below 0.6", "description": "Maintains a short speech with simple words and lots of hesitation, or speaks nothing."},
            ],
        },
    ]

    now = time.time()
    legacy_rubric = db.scalar(
        select(Rubric).where(Rubric.name == "PTE Academic Speaking Official Rubric").limit(1)
    )
    if legacy_rubric:
        legacy_rubric.name = rubric_name
        legacy_rubric.description = "Bộ tiêu chuẩn đánh giá Vấn đáp Tiếng Anh FPTU gồm 5 tiêu chí: Ideas, Pronunciation, Grammar, Vocabulary, Fluency (Thang điểm 10)."
        legacy_rubric.criteria = criteria
        legacy_rubric.version = (legacy_rubric.version or 1) + 1
        legacy_rubric.updated_at = now
        db.commit()
        db.refresh(legacy_rubric)
        return legacy_rubric

    if not rubric:
        rubric = Rubric(
            name=rubric_name,
            description="Bộ tiêu chuẩn đánh giá Vấn đáp Tiếng Anh FPTU gồm 5 tiêu chí: Ideas, Pronunciation, Grammar, Vocabulary, Fluency (Thang điểm 10).",
            criteria=criteria,
            version=1,
            updated_at=now,
        )
        db.add(rubric)
        db.commit()
        db.refresh(rubric)
    return rubric


ensure_default_pte_rubric = ensure_default_ents_rubric


def ensure_default_matrix(db):
    import time
    from .models import AcademicMatrix

    ents_rubric = ensure_default_ents_rubric(db)

    legacy_matrix = db.scalar(
        select(AcademicMatrix).where(
            AcademicMatrix.code == "PTE-STD-SPEAKING",
            AcademicMatrix.deleted_at.is_(None),
        )
    )

    ents_rules = [
        {"type": "GENERAL_INTERVIEW", "question_count": 1, "prep_time": 0, "response_time": 45, "target_difficulty": "EASY", "weight_percentage": 25.0},
        {"type": "PICTURE_DESCRIPTION", "question_count": 1, "prep_time": 15, "response_time": 45, "target_difficulty": "MEDIUM", "weight_percentage": 25.0},
        {"type": "TOPIC_MONOLOGUE", "question_count": 1, "prep_time": 30, "response_time": 60, "target_difficulty": "HARD", "weight_percentage": 25.0},
        {"type": "DEEP_DISCUSSION", "question_count": 1, "prep_time": 15, "response_time": 60, "target_difficulty": "HARD", "weight_percentage": 25.0},
    ]

    if legacy_matrix:
        legacy_matrix.code = "ENTS-STD-SPEAKING"
        legacy_matrix.name = "Ma trận Chuẩn ENTs Speaking (4 Dạng bài)"
        legacy_matrix.description = "Quy chuẩn cấu trúc 4 dạng bài Speaking chuẩn ENTs FPTU: 1 General Interview, 1 Picture Description, 1 Topic Monologue, 1 Deep Discussion (Tổng 4 câu, 100% trọng số)"
        legacy_matrix.rubric_id = ents_rubric.id if ents_rubric else None
        legacy_matrix.rules = ents_rules
        legacy_matrix.difficulty_ratio = {"easy": 25, "medium": 25, "hard": 50}
        legacy_matrix.updated_at = time.time()
        db.commit()
        return

    exists = db.scalar(
        select(AcademicMatrix).where(
            AcademicMatrix.code == "ENTS-STD-SPEAKING",
            AcademicMatrix.deleted_at.is_(None),
        )
    )
    if not exists:
        m = AcademicMatrix(
            code="ENTS-STD-SPEAKING",
            name="Ma trận Chuẩn ENTs Speaking (4 Dạng bài)",
            description="Quy chuẩn cấu trúc 4 dạng bài Speaking chuẩn ENTs FPTU: 1 General Interview, 1 Picture Description, 1 Topic Monologue, 1 Deep Discussion (Tổng 4 câu, 100% trọng số)",
            rubric_id=ents_rubric.id if ents_rubric else None,
            rules=ents_rules,
            difficulty_ratio={"easy": 25, "medium": 25, "hard": 50},
            updated_at=time.time(),
        )
        db.add(m)
        db.commit()
    elif exists and not exists.rubric_id and ents_rubric:
        exists.rubric_id = ents_rubric.id
        exists.updated_at = time.time()
        db.commit()
