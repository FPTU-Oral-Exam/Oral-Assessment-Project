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


def ensure_default_pte_rubric(db):
    import time
    from .models import Rubric

    rubric_name = "PTE Academic Speaking Official Rubric"
    rubric = db.scalar(
        select(Rubric).where(Rubric.name == rubric_name).limit(1)
    )

    criteria = [
        {
            "id": "content",
            "name": "Content",
            "description": "Độ chính xác nội dung, độ bao phủ ý và từ khóa chính",
            "max_score": 5.0,
            "weight": 34.0,
            "guiding_question": "Does your response include all the words in the reading text and only these words?",
            "scoring_method": "Content is scored by counting the number of correct words in your response. Replacements insertions and omissions of words will negatively affect your score.",
            "descriptors": [
                {"level": "5 điểm", "score_range": "5 đ", "description": "All words in the response from the prompt"},
                {"level": "4 điểm", "score_range": "4 đ", "description": "At least 75% of words in the response from the prompt"},
                {"level": "3 điểm", "score_range": "3 đ", "description": "At least 50% of words in the response from the prompt"},
                {"level": "2 điểm", "score_range": "2 đ", "description": "At least 25% of words in the response from the prompt"},
                {"level": "1 điểm", "score_range": "1 đ", "description": "Less than 25% of words in the response from the prompt"},
                {"level": "0 điểm", "score_range": "0 đ", "description": "Almost nothing from the prompt in the response"},
            ],
        },
        {
            "id": "oral_fluency",
            "name": "Oral Fluency",
            "description": "Độ trôi chảy, nhịp điệu phát âm, ngắt nghỉ câu tự nhiên",
            "max_score": 5.0,
            "weight": 33.0,
            "guiding_question": "Does your response demonstrate a smooth, effortless and natural rate of Speech?",
            "scoring_method": "Oral fluency is scored by determining if your rhythm, phrasing and stress are smooth. The best responses are spoken at a constant and natural rate of speech with appropriate phrasing. Hesitations, repetitions and false starts will negatively affect your score.",
            "descriptors": [
                {
                    "level": "5 điểm",
                    "score_range": "5 đ",
                    "description": "Speech shows smooth rhythm and phrasing. There are no hesitations, repetitions, false starts or non-native phonological simplifications",
                },
                {
                    "level": "4 điểm",
                    "score_range": "4 đ",
                    "description": "Speech has an acceptable rhythm with appropriate phrasing and word emphasis. There is no more than one hesitation, one repetition or a false start. There are no significant non-native phonological simplifications",
                },
                {
                    "level": "3 điểm",
                    "score_range": "3 đ",
                    "description": "Speech is at an acceptable speed but may be uneven. There may be more than one hesitation, but most words are spoken in continuous phrases. There are few repetitions or false starts. There are no long pauses and speech does not sound staccato",
                },
                {
                    "level": "2 điểm",
                    "score_range": "2 đ",
                    "description": "Speech may be uneven or staccato. Speech (if >= 6 words) has at least one smooth three-word run, and no more than two or three hesitations, repetitions or false starts. There may be one long pause, but not two or more",
                },
                {
                    "level": "1 điểm",
                    "score_range": "1 đ",
                    "description": "Speech has irregular phrasing or sentence rhythm. Poor phrasing, staccato or syllabic timing, and/or multiple hesitations, repetitions, and/or false starts make spoken performance notably uneven or discontinuous. Long utterances may have one or two long pauses and inappropriate sentencelevel word emphasis",
                },
                {
                    "level": "0 điểm",
                    "score_range": "0 đ",
                    "description": "Speech is slow and labored with little discernable phrase grouping, multiple hesitations, pauses, false starts, and/or major phonological simplifications. Most words are isolated, and there may be more than one long pause",
                },
            ],
        },
        {
            "id": "pronunciation",
            "name": "Pronunciation",
            "description": "Độ chuẩn xác nguyên âm, phụ âm và trọng âm từ",
            "max_score": 5.0,
            "weight": 33.0,
            "guiding_question": "Does your response demonstrate your ability to produce speech sounds in a similar way to most regular speakers of the language?",
            "scoring_method": "Pronunciation is scored by determining if your speech is easily understandable to most regular speakers of the language. The best responses contain vowels and consonants pronounced in a native-like way, as well as words and phrases stressed correctly. Responses should also be immediately understandable to a regular speaker of the language.",
            "descriptors": [
                {
                    "level": "5 điểm",
                    "score_range": "5 đ",
                    "description": "All vowels and consonants are produced in a manner that is easily understood by regular speakers of the language. The speaker uses assimilation and deletions appropriate to continuous speech. Stress is placed correctly in all words and sentence-level stress is fully appropriate",
                },
                {
                    "level": "4 điểm",
                    "score_range": "4 đ",
                    "description": "Vowels and consonants are produced clearly and unambiguously. A few minor consonant, vowel or stress distortions do not affect intelligibility. All words are easily understandable. A few consonants or consonant sequences may be distorted. Stress is placed correctly on all common words, and sentence level stress is reasonable",
                },
                {
                    "level": "3 điểm",
                    "score_range": "3 đ",
                    "description": "Most vowels and consonants are pronounced correctly. Some consistent errors might make a few words unclear. A few consonants in certain contexts may be regularly distorted, omitted or mispronounced. Stressdependent vowel reduction may occur on a few words",
                },
                {
                    "level": "2 điểm",
                    "score_range": "2 đ",
                    "description": "Some consonants and vowels are consistently mispronounced in a nonnative like manner. At least 2/3 of speech is intelligible, but listeners might need to adjust to the accent. Some consonants are regularly omitted, and consonant sequences may be simplified. Stress may be placed incorrectly on some words or be unclear",
                },
                {
                    "level": "1 điểm",
                    "score_range": "1 đ",
                    "description": "Many consonants and vowels are mispronounced, resulting in a strong intrusive foreign accent. Listeners may have difficulty understanding about 1/3 of the words. Many consonants may be distorted or omitted. Consonant sequences may be non-English. Stress is placed in a non-English manner; unstressed words may be reduced or omitted and a few syllables added or missed",
                },
                {
                    "level": "0 điểm",
                    "score_range": "0 đ",
                    "description": "Pronunciation seems completely characteristic of another language. Many consonants and vowels are mispronounced, misordered or omitted. Listeners may find more than 1/2 of the speech unintelligible. Stressed and unstressed syllables are realized in a non-English manner. Several words may have the wrong number of syllables",
                },
            ],
        },
    ]

    now = time.time()
    if not rubric:
        rubric = Rubric(
            name=rubric_name,
            description="Bộ Tiêu chuẩn Chấm điểm Speaking chuẩn hóa PTE Academic (Thang điểm 5, gồm 3 tiêu chí: Content, Oral Fluency, Pronunciation với đầy đủ 6 mức điểm chi tiết).",
            criteria=criteria,
            version=1,
            updated_at=now,
        )
        db.add(rubric)
        db.commit()
        db.refresh(rubric)
    return rubric


def ensure_default_matrix(db):
    import time
    from .models import AcademicMatrix

    pte_rubric = ensure_default_pte_rubric(db)

    exists = db.scalar(
        select(AcademicMatrix).where(
            AcademicMatrix.code == "PTE-STD-SPEAKING",
            AcademicMatrix.deleted_at.is_(None),
        )
    )
    if not exists:
        rules = [
            {"type": "RA", "question_count": 3, "prep_time": 35, "response_time": 40, "target_difficulty": "MEDIUM", "weight_percentage": 20.0},
            {"type": "RS", "question_count": 8, "prep_time": 3, "response_time": 15, "target_difficulty": "MEDIUM", "weight_percentage": 30.0},
            {"type": "GD", "question_count": 1, "prep_time": 30, "response_time": 60, "target_difficulty": "MEDIUM", "weight_percentage": 10.0},
            {"type": "DI", "question_count": 2, "prep_time": 25, "response_time": 40, "target_difficulty": "MEDIUM", "weight_percentage": 15.0},
            {"type": "SI", "question_count": 1, "prep_time": 20, "response_time": 40, "target_difficulty": "MEDIUM", "weight_percentage": 10.0},
            {"type": "RL", "question_count": 1, "prep_time": 10, "response_time": 40, "target_difficulty": "MEDIUM", "weight_percentage": 15.0},
        ]
        m = AcademicMatrix(
            code="PTE-STD-SPEAKING",
            name="Ma trận Chuẩn PTE Speaking (6 Dạng bài)",
            description="Quy chuẩn cấu trúc 6 dạng bài Speaking chuẩn PTE Academic: 3 RA, 8 RS, 1 GD, 2 DI, 1 SI, 1 RL (Tổng 16 câu, 100% trọng số)",
            rubric_id=pte_rubric.id if pte_rubric else None,
            rules=rules,
            difficulty_ratio={"easy": 30, "medium": 50, "hard": 20},
            updated_at=time.time(),
        )
        db.add(m)
        db.commit()
    elif exists and not exists.rubric_id and pte_rubric:
        exists.rubric_id = pte_rubric.id
        exists.updated_at = time.time()
        db.commit()
