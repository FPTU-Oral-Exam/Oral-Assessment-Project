"""
Seeder chuẩn hóa Hệ sinh thái ENTs Speaking Test 5 Tiêu chí Thang điểm 10.
Khởi tạo:
1. 5 Tài khoản hệ thống chuẩn (admin, academy, examiner, teacher, student).
2. 6 Môn học ENTs chuẩn FPT (ENT001, ENT104, ENT203, ENT303, ENT403, ENT503).
3. 4 Dạng bài Speaking (GENERAL_INTERVIEW, PICTURE_DESCRIPTION, TOPIC_MONOLOGUE, DEEP_DISCUSSION).
4. Bộ Rubric chuẩn ENTs Speaking 5 tiêu chí thang điểm 10 (mỗi tiêu chí 2.0 điểm, 4 band descriptors).
5. Ngân hàng câu hỏi mẫu (Item Bank) bóc tách từ các tài liệu Guidelines.
6. 2 Đề thi mẫu PUBLISHED (ENT104 và ENT403) đóng băng Snapshot Rubric và Blueprint.
7. 1 Bài thi mẫu đã chấm hoàn tất cho học viên SV001 để Giảng viên kiểm tra giao diện /grading.
"""

import sys
import os
import time
import uuid

# Cho phép import app từ services/api
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "services", "api")))

from sqlalchemy import select, delete
from app.db import SessionLocal
from app.models import (
    User,
    Course,
    Rubric,
    Exam,
    ExamSession,
    Attempt,
    AcademicQuestion,
    AcademicMatrix,
    QuestionTypeConfigModel,
)
from app.security import hasher


# ============================================================================
# 1. TÀI KHOẢN HỆ THỐNG CHUẨN
# ============================================================================
ACCOUNTS = [
    {
        "username": "admin",
        "name": "Nguyễn Văn Gia Bình (Super Admin)",
        "role": "SYSTEM_ADMIN",
        "password": "Admin@123456",
    },
    {
        "username": "academy",
        "name": "Ban Học thuật (Master Curators)",
        "role": "ACADEMY",
        "password": "Admin@123456",
    },
    {
        "username": "examiner",
        "name": "Cán bộ Khảo thí (Exam Board)",
        "role": "EXAMINER",
        "password": "Examiner@123456",
    },
    {
        "username": "teacher",
        "name": "Giảng viên Chấm thi",
        "role": "TEACHER",
        "password": "Teacher@123456",
    },
    {
        "username": "student",
        "name": "Nguyễn Văn An (Sinh viên)",
        "role": "STUDENT",
        "password": "Student@123456",
    },
]

# ============================================================================
# 2. 6 MÔN HỌC ENTS CHUẨN FPT
# ============================================================================
ENT_COURSES = [
    {"code": "ENT001", "name": "Tiếng Anh Dự bị 1 (A1)", "credits": 3, "department_code": "ENG"},
    {"code": "ENT104", "name": "Tiếng Anh Cơ sở 2 (A2)", "credits": 3, "department_code": "ENG"},
    {"code": "ENT203", "name": "Tiếng Anh Giao tiếp 3 (B1)", "credits": 3, "department_code": "ENG"},
    {"code": "ENT303", "name": "Tiếng Anh Học thuật 4 (B1+)", "credits": 3, "department_code": "ENG"},
    {"code": "ENT403", "name": "Tiếng Anh Nâng cao 5 (B2)", "credits": 3, "department_code": "ENG"},
    {"code": "ENT503", "name": "Tiếng Anh Biện luận 6 (B2+)", "credits": 3, "department_code": "ENG"},
]

# ============================================================================
# 3. 4 DẠNG BÀI SPEAKING ENTS
# ============================================================================
ENT_QUESTION_TYPES = [
    {
        "type": "GENERAL_INTERVIEW",
        "name": "Part 1: General Interview",
        "vietnamese_name": "Phỏng vấn & Giới thiệu bản thân",
        "description": "Giám khảo hỏi các câu hỏi ngắn về chủ đề quen thuộc (quê quán, sở thích, gia đình).",
        "default_prep_time": 0,
        "default_response_time": 45,
        "max_score": 10.0,
        "requires_image": False,
        "requires_key_points": True,
        "recommended_question_count": 5,
    },
    {
        "type": "PICTURE_DESCRIPTION",
        "name": "Part 2: Picture Description",
        "vietnamese_name": "Miêu tả tranh & Bối cảnh trực quan",
        "description": "Thí sinh miêu tả một bức tranh dựa trên 4 câu hỏi định hướng.",
        "default_prep_time": 120,
        "default_response_time": 150,
        "max_score": 10.0,
        "requires_image": True,
        "requires_key_points": True,
        "recommended_question_count": 1,
    },
    {
        "type": "TOPIC_MONOLOGUE",
        "name": "Part 1: Topic Monologue (Long Run)",
        "vietnamese_name": "Độc thoại theo Thẻ chủ đề",
        "description": "Thí sinh bốc thăm thẻ chủ đề và trình bày độc thoại theo 4 gợi ý triển khai ý tưởng.",
        "default_prep_time": 60,
        "default_response_time": 150,
        "max_score": 10.0,
        "requires_image": False,
        "requires_key_points": True,
        "recommended_question_count": 1,
    },
    {
        "type": "DEEP_DISCUSSION",
        "name": "Part 2: Deep Discussion & Follow-up",
        "vietnamese_name": "Câu hỏi mở rộng & Tư duy phản biện",
        "description": "Giám khảo đặt câu hỏi mở rộng nhằm thử thách khả năng tư duy phản biện và lập luận sâu.",
        "default_prep_time": 15,
        "default_response_time": 90,
        "max_score": 10.0,
        "requires_image": False,
        "requires_key_points": True,
        "recommended_question_count": 2,
    },
]

# ============================================================================
# 4. TIÊU CHUẨN RUBRIC 5 TIÊU CHÍ (THANG ĐIỂM 10)
# ============================================================================
ENT_RUBRIC_CRITERIA = [
    {
        "id": "ideas",
        "name": "Ideas",
        "max_score": 2.0,
        "weight": 20.0,
        "description": "Mức độ phát triển ý tưởng, tính mạch lạc và độ tập trung vào chủ đề.",
        "descriptors": [
            {
                "level": "Exceeds standard",
                "score_range": "1.6 - 2.0",
                "description": "Presents a well-developed response with clear organization to the question with relevant, extended and supported ideas.",
            },
            {
                "level": "Meets standard",
                "score_range": "1.0 - below 1.6",
                "description": "Presents relevant ideas but some may be inadequately developed or unclear, or some supporting ideas may lack focus.",
            },
            {
                "level": "Attempt made",
                "score_range": "0.6 - below 1.0",
                "description": "Has few ideas but ideas are not organized. Some ideas are off-topic.",
            },
            {
                "level": "Insufficient evidence",
                "score_range": "0 - below 0.6",
                "description": "Has no ideas at all, or all or most ideas are off-topic.",
            },
        ],
    },
    {
        "id": "pronunciation",
        "name": "Pronunciation",
        "max_score": 2.0,
        "weight": 20.0,
        "description": "Độ rõ ràng của phát âm, nguyên âm/phụ âm, trọng âm từ và ngữ điệu câu.",
        "descriptors": [
            {
                "level": "Exceeds standard",
                "score_range": "1.6 - 2.0",
                "description": "Speaks with a clear voice and near-native pronunciation, stress and intonation. L1 accent has minimal effects.",
            },
            {
                "level": "Meets standard",
                "score_range": "1.0 - below 1.6",
                "description": "Speaks with a clear voice but still in L1 accent. Speech is understandable. Some errors in word pronunciation, stress and sentence intonation may be found.",
            },
            {
                "level": "Attempt made",
                "score_range": "0.6 - below 1.0",
                "description": "Speech is a little hard to be understood due to lots of errors in pronunciation.",
            },
            {
                "level": "Insufficient evidence",
                "score_range": "0 - below 0.6",
                "description": "Pronunciation makes it impossible to understand speech. Or speaks nothing.",
            },
        ],
    },
    {
        "id": "grammar_range_accuracy",
        "name": "Grammar Range and Accuracy",
        "max_score": 2.0,
        "weight": 20.0,
        "description": "Độ đa dạng cấu trúc ngữ pháp và độ chính xác của câu.",
        "descriptors": [
            {
                "level": "Exceeds standard",
                "score_range": "1.6 - 2.0",
                "description": "Uses a wide range of structures flexibly. The majority of sentences are error free. A few simple errors may still be present, but they have 'little to no' effect on the clarity.",
            },
            {
                "level": "Meets standard",
                "score_range": "1.0 - below 1.6",
                "description": "Simple sentences are mostly accurate. Some complex sentences are used, but these are limited in range, and they often have noticeable mistakes.",
            },
            {
                "level": "Attempt made",
                "score_range": "0.6 - below 1.0",
                "description": "Uses only simple sentences with errors. Errors prevent understanding frequently.",
            },
            {
                "level": "Insufficient evidence",
                "score_range": "0 - below 0.6",
                "description": "Speaks nothing or cannot produce basic sentence forms, or produce basic sentence forms with a lot of grammar mistakes that make it hard to understand.",
            },
        ],
    },
    {
        "id": "vocabulary_range_accuracy",
        "name": "Vocabulary Range and Accuracy",
        "max_score": 2.0,
        "weight": 20.0,
        "description": "Vốn từ vựng, độ chính xác của từ ngữ, ngữ cảnh sử dụng và paraphrase.",
        "descriptors": [
            {
                "level": "Exceeds standard",
                "score_range": "1.6 - 2.0",
                "description": "Uses a wide vocabulary resource readily and flexibly to convey precise meaning. Uses less common and idiomatic vocabulary skillfully.",
            },
            {
                "level": "Meets standard",
                "score_range": "1.0 - below 1.6",
                "description": "Vocabulary use is sufficient to discuss topics at length. There may be some repetition and sometimes inappropriate word choices, but the overall meaning is clear.",
            },
            {
                "level": "Attempt made",
                "score_range": "0.6 - below 1.0",
                "description": "Manages to talk about the topic using mainly simple vocabulary. Shows difficulty choosing vocabulary to speak. There are frequent inappropriacies.",
            },
            {
                "level": "Insufficient evidence",
                "score_range": "0 - below 0.6",
                "description": "Speaks nothing or only produces isolated words or memorized utterances, or uses little vocabulary related to the topic.",
            },
        ],
    },
    {
        "id": "fluency_coherence",
        "name": "Fluency and coherence",
        "max_score": 2.0,
        "weight": 20.0,
        "description": "Độ trôi chảy, nhịp điệu bài nói, ngắt nghỉ hợp lý và từ nối liên kết.",
        "descriptors": [
            {
                "level": "Exceeds standard",
                "score_range": "1.6 - 2.0",
                "description": "Speaks fluently with no or occasional repetition or self-correction. Any pauses are just to plan what to say next, not to find the right words. Uses a wide range of appropriate linking words.",
            },
            {
                "level": "Meets standard",
                "score_range": "1.0 - below 1.6",
                "description": "Can speak for a while and shows a readiness to talk at length. Sometimes loses track due to pausing, repeating, or correcting. Uses linking words to connect ideas.",
            },
            {
                "level": "Attempt made",
                "score_range": "0.6 - below 1.0",
                "description": "Speaks with noticeable effort. Pauses, word repetition, and self-correction often happen. Uses very few linking words.",
            },
            {
                "level": "Insufficient evidence",
                "score_range": "0 - below 0.6",
                "description": "Maintains a short speech with some simple words or sentences and lots of hesitation to think, or speaks nothing.",
            },
        ],
    },
]

# ============================================================================
# 5. CÂU HỎI MẪU BÓC TÁCH TỪ GUIDELINES (ITEM BANK)
# ============================================================================
SAMPLE_QUESTIONS = [
    # --- ENT104 Part 1: General Interview ---
    {
        "code": "ENT104_INT_01",
        "skill": "SPEAKING",
        "type": "GENERAL_INTERVIEW",
        "title": "General Interview - Hometown and Daily Life",
        "prompt": "Where is your hometown? Who is your favorite actor? What job does your father/mother do? How often do you go out with your friends, and where do you usually go?",
        "prep_time": 0,
        "response_time": 60,
        "difficulty": "EASY",
        "key_points": [
            "State hometown clearly",
            "Name favorite actor and why",
            "Describe parents' job",
            "Frequency of going out with friends and favorite places",
        ],
        "tags": ["ENT104", "Interview", "Personal"],
    },
    # --- ENT104 Part 2: Picture Description ---
    {
        "code": "ENT104_PICT_01",
        "skill": "SPEAKING",
        "type": "PICTURE_DESCRIPTION",
        "title": "Picture Description - Office Meeting",
        "prompt": "Look at the picture showing a group meeting in a modern office. Describe the picture in 2 to 3 minutes by addressing the 4 guiding questions.",
        "media_url": "/images/office_meeting_team.svg",
        "prep_time": 120,
        "response_time": 150,
        "difficulty": "MEDIUM",
        "key_points": [
            "How many people are there in the picture?",
            "Where do you think they are?",
            "Who do you think they are?",
            "What do you think they are talking about?",
        ],
        "tags": ["ENT104", "PictureDescription", "Workplace"],
    },
    # --- ENT403 Part 1: Topic Monologue ---
    {
        "code": "ENT403_MONO_01",
        "skill": "SPEAKING",
        "type": "TOPIC_MONOLOGUE",
        "title": "Topic Monologue - Hidden Personality Trait",
        "prompt": "Describe a part of your personality that others may not know. You have 1 minute to prepare and 2-3 minutes to talk about it.",
        "prep_time": 60,
        "response_time": 150,
        "difficulty": "HARD",
        "key_points": [
            "What part of your personality it is",
            "Why others may not know this about you",
            "How you feel about this part of your personality",
            "Explain how this part of your personality affects your life",
        ],
        "tags": ["ENT403", "Monologue", "Personality"],
    },
    # --- ENT403 Part 2: Deep Discussion ---
    {
        "code": "ENT403_DISC_01",
        "skill": "SPEAKING",
        "type": "DEEP_DISCUSSION",
        "title": "Deep Discussion - Social Media & Mindset",
        "prompt": "How does social media influence our behavior? Do you think it affects us in a positive or negative way? Why? Which mindset (pessimistic, realistic, or optimistic) leads to greater happiness and success?",
        "prep_time": 15,
        "response_time": 90,
        "difficulty": "HARD",
        "key_points": [
            "Provide balanced view on positive vs negative impacts of social media",
            "Give concrete real-world examples",
            "Analyze realistic vs optimistic mindset in overcoming adversity",
        ],
        "tags": ["ENT403", "DeepDiscussion", "CriticalThinking"],
    },
]


def seed_database():
    print("=" * 70)
    print(">>> BẮT ĐẦU NẠP SEED DATA CHUẨN ENTS SPEAKING 5 TIÊU CHÍ (SCALE 10) <<<")
    print("=" * 70)

    with SessionLocal() as db:
        # 1. Đồng bộ Tài khoản Hệ thống
        print("\n[1/7] Đồng bộ 5 tài khoản hệ thống chuẩn...")
        user_map = {}
        for acc in ACCOUNTS:
            u = db.scalar(select(User).where(User.username == acc["username"]))
            if u:
                u.name = acc["name"]
                u.role = acc["role"]
                u.password_hash = hasher.hash(acc["password"])
                u.status = "ACTIVE"
            else:
                u = User(
                    username=acc["username"],
                    name=acc["name"],
                    role=acc["role"],
                    password_hash=hasher.hash(acc["password"]),
                    status="ACTIVE",
                )
                db.add(u)
            db.flush()
            user_map[acc["username"]] = u.id
            print(f"  + User: {acc['username']:<10} | Role: {acc['role']:<13} | OK")

        # 2. Đồng bộ 6 Môn học ENTs
        print("\n[2/7] Đồng bộ 6 môn học chuẩn FPT (ENT001 - ENT503)...")
        course_map = {}
        for c_data in ENT_COURSES:
            c = db.scalar(select(Course).where(Course.code == c_data["code"]))
            if not c:
                c = Course(
                    code=c_data["code"],
                    name=c_data["name"],
                    credits=c_data["credits"],
                    department_code=c_data["department_code"],
                    owner_id=user_map["academy"],
                    teacher_id=user_map["teacher"],
                    status="ACTIVE",
                )
                db.add(c)
            else:
                c.name = c_data["name"]
                c.department_code = c_data["department_code"]
                c.teacher_id = user_map["teacher"]
            db.flush()
            course_map[c_data["code"]] = c.id
            print(f"  + Course: {c_data['code']:<8} | {c_data['name']}")

        # 3. Đồng bộ 4 Dạng bài Speaking ENTs
        print("\n[3/7] Cấu hình 4 dạng bài Speaking ENTs trong QuestionTypeConfig...")
        for qt in ENT_QUESTION_TYPES:
            cfg = db.scalar(select(QuestionTypeConfigModel).where(QuestionTypeConfigModel.type == qt["type"]))
            if not cfg:
                cfg = QuestionTypeConfigModel(
                    type=qt["type"],
                    name=qt["name"],
                    vietnamese_name=qt["vietnamese_name"],
                    description=qt["description"],
                    default_prep_time=qt["default_prep_time"],
                    default_response_time=qt["default_response_time"],
                    max_score=qt["max_score"],
                    requires_image=qt["requires_image"],
                    requires_key_points=qt["requires_key_points"],
                    recommended_question_count=qt["recommended_question_count"],
                    is_active=True,
                )
                db.add(cfg)
            else:
                cfg.name = qt["name"]
                cfg.vietnamese_name = qt["vietnamese_name"]
                cfg.default_prep_time = qt["default_prep_time"]
                cfg.default_response_time = qt["default_response_time"]
                cfg.requires_image = qt["requires_image"]
            db.flush()
            print(f"  + Type: {qt['type']:<22} | Prep: {qt['default_prep_time']}s | Speak: {qt['default_response_time']}s")

        # 4. Khởi tạo Rubric 5 Tiêu chí Thang điểm 10
        print("\n[4/7] Khởi tạo Rubric ENTs Speaking Test 5 Criteria (Scale 10)...")
        rubric_name = "Rubric Chuẩn ENTs Speaking Test (5 Tiêu chí - Thang 10)"
        rubric = db.scalar(select(Rubric).where(Rubric.name == rubric_name))
        if not rubric:
            rubric = Rubric(
                name=rubric_name,
                description="Bộ tiêu chuẩn đánh giá Vấn đáp Tiếng Anh FPTU gồm 5 tiêu chí: Ideas, Pronunciation, Grammar, Vocabulary, Fluency (Thang điểm 10).",
                course_id=None,  # Dùng chung toàn khoa
                version=1,
                criteria=ENT_RUBRIC_CRITERIA,
            )
            db.add(rubric)
        else:
            rubric.criteria = ENT_RUBRIC_CRITERIA
            rubric.version = (rubric.version or 1) + 1
        db.flush()
        print(f"  + Rubric ID: {rubric.id} | Criteria: 5 tiêu chí thang điểm 2 (Tổng 10.0)")

        # 5. Dọn sạch câu hỏi cũ và nạp câu hỏi mẫu Guidelines vào Item Bank
        print("\n[5/7] Nạp câu hỏi mẫu bóc tách từ Guidelines vào Ngân hàng câu hỏi...")
        # Xóa câu hỏi demo cũ nếu có mã trùng
        for q_data in SAMPLE_QUESTIONS:
            existing = db.scalar(select(AcademicQuestion).where(AcademicQuestion.code == q_data["code"]))
            if existing:
                existing.title = q_data["title"]
                existing.prompt = q_data["prompt"]
                existing.type = q_data["type"]
                existing.prep_time = q_data["prep_time"]
                existing.response_time = q_data["response_time"]
                existing.media_url = q_data.get("media_url")
                existing.key_points = q_data.get("key_points", [])
                existing.tags = q_data.get("tags", [])
                existing.difficulty = q_data["difficulty"]
            else:
                db.add(
                    AcademicQuestion(
                        code=q_data["code"],
                        skill=q_data["skill"],
                        type=q_data["type"],
                        title=q_data["title"],
                        prompt=q_data["prompt"],
                        media_url=q_data.get("media_url"),
                        prep_time=q_data["prep_time"],
                        response_time=q_data["response_time"],
                        difficulty=q_data["difficulty"],
                        status="APPROVED",
                        key_points=q_data.get("key_points", []),
                        tags=q_data.get("tags", []),
                        author_id=user_map["academy"],
                    )
                )
            print(f"  + Question: {q_data['code']:<16} | Type: {q_data['type']}")
        db.flush()

        # 6. Tạo 2 Kỳ thi mẫu PUBLISHED (ENT104 & ENT403)
        print("\n[6/7] Phát hành 2 Đề thi mẫu PUBLISHED (ENT104 và ENT403)...")
        # Đề 1: ENT104 Final Exam
        ent104_exam_name = "ENT104 Speaking Final Exam (Học kỳ Fall 2026)"
        exam1 = db.scalar(select(Exam).where(Exam.name == ent104_exam_name))
        snapshot1 = {
            "assembly_mode": "ITEM_BANK_BLUEPRINT",
            "criteria": ENT_RUBRIC_CRITERIA,
            "rubric_version": rubric.version,
            "knowledge_version": "guidelines-v1",
        }
        if not exam1:
            exam1 = Exam(
                course_id=course_map["ENT104"],
                rubric_id=rubric.id,
                name=ent104_exam_name,
                description="Kỳ thi Vấn đáp cuối kỳ môn ENT104 gồm 2 phần: Phỏng vấn & Miêu tả tranh theo chuẩn FPTU.",
                time_limit=600,
                question_count=2,
                status="PUBLISHED",
                snapshot=snapshot1,
                blueprint=[
                    {"type": "GENERAL_INTERVIEW", "count": 1, "difficulty": "EASY"},
                    {"type": "PICTURE_DESCRIPTION", "count": 1, "difficulty": "MEDIUM"},
                ],
            )
            db.add(exam1)
        else:
            exam1.snapshot = snapshot1
            exam1.status = "PUBLISHED"
        db.flush()
        print(f"  + Exam 1: {ent104_exam_name} (ID: {exam1.id})")

        # Đề 2: ENT403 Final Exam
        ent403_exam_name = "ENT403 Speaking Final Exam (Học kỳ Fall 2026)"
        exam2 = db.scalar(select(Exam).where(Exam.name == ent403_exam_name))
        snapshot2 = {
            "assembly_mode": "ITEM_BANK_BLUEPRINT",
            "criteria": ENT_RUBRIC_CRITERIA,
            "rubric_version": rubric.version,
            "knowledge_version": "guidelines-v1",
        }
        if not exam2:
            exam2 = Exam(
                course_id=course_map["ENT403"],
                rubric_id=rubric.id,
                name=ent403_exam_name,
                description="Kỳ thi Vấn đáp cuối kỳ môn ENT403 gồm 2 phần: Độc thoại theo chủ đề & Thảo luận phản biện.",
                time_limit=600,
                question_count=2,
                status="PUBLISHED",
                snapshot=snapshot2,
                blueprint=[
                    {"type": "TOPIC_MONOLOGUE", "count": 1, "difficulty": "HARD"},
                    {"type": "DEEP_DISCUSSION", "count": 1, "difficulty": "HARD"},
                ],
            )
            db.add(exam2)
        else:
            exam2.snapshot = snapshot2
            exam2.status = "PUBLISHED"
        db.flush()
        print(f"  + Exam 2: {ent403_exam_name} (ID: {exam2.id})")

        # 7. Khởi tạo 1 Bài thi mẫu đã chấm hoàn tất cho Sinh viên SV001
        print("\n[7/7] Khởi tạo Bài thi mẫu đã chấm hoàn tất để Giảng viên kiểm tra /grading...")
        session = db.scalar(select(ExamSession).where(
            ExamSession.exam_id == exam1.id,
            ExamSession.student_id == user_map["student"]
        ))
        if not session:
            session = ExamSession(
                exam_id=exam1.id,
                student_id=user_map["student"],
                status="COMPLETED",
                started_at=time.time() - 3600,
                completed_at=time.time() - 3000,
                final_score=8.4,
                attempt_number=1,
            )
            db.add(session)
            db.flush()

        # Tạo Attempt 1 (General Interview)
        att1 = db.scalar(select(Attempt).where(Attempt.session_id == session.id, Attempt.sequence == 1))
        assessment1 = {
            "model": "gemini-2.5-flash",
            "status": "COMPLETED",
            "score": 8.6,
            "review_required": False,
            "criteria": [
                {"name": "Ideas", "score": 1.7, "max_score": 2.0, "weight": 20.0, "band": "Exceeds standard", "comment": "Trả lời đầy đủ thông tin quê quán, sở thích và hoạt động cùng bạn bè."},
                {"name": "Pronunciation", "score": 1.7, "max_score": 2.0, "weight": 20.0, "band": "Exceeds standard", "comment": "Giọng nói rõ ràng, ngữ điệu tự nhiên, ít ảnh hưởng tiếng mẹ đẻ."},
                {"name": "Grammar Range and Accuracy", "score": 1.8, "max_score": 2.0, "weight": 20.0, "band": "Exceeds standard", "comment": "Sử dụng chính xác các thì hiện tại đơn và hiện tại hoàn thành."},
                {"name": "Vocabulary Range and Accuracy", "score": 1.7, "max_score": 2.0, "weight": 20.0, "band": "Exceeds standard", "comment": "Vốn từ đa dạng, dùng từ phù hợp với ngữ cảnh giao tiếp."},
                {"name": "Fluency and coherence", "score": 1.7, "max_score": 2.0, "weight": 20.0, "band": "Exceeds standard", "comment": "Tốc độ nói 2.3 WPS, nhịp điệu đều đặn, ngắt nghỉ tự nhiên."},
            ],
            "enhanced_metrics": {
                "fluency": {"speech_rate_wps": 2.3, "pause_count": 2, "pause_ratio": 0.05, "filled_pause_count": 0},
                "pronunciation": {"acoustic_confidence": 0.94},
            },
            "feedback": "Ideas (1.7/2): Exceeds standard | Pronunciation (1.7/2): Exceeds standard | Grammar (1.8/2): Exceeds standard | Vocabulary (1.7/2): Exceeds standard | Fluency (1.7/2): Exceeds standard",
        }
        if not att1:
            att1 = Attempt(
                session_id=session.id,
                sequence=1,
                question={
                    "text": "Where is your hometown? Who is your favorite actor? What job does your father/mother do? How often do you go out with your friends?",
                    "title": "General Interview",
                    "part_type": "GENERAL_INTERVIEW",
                    "time_prep": 0,
                    "time_speak": 45,
                },
                status="COMPLETED",
                started_at=time.time() - 3500,
                finished_at=time.time() - 3450,
                transcript="I was born and raised in Da Nang city, which is famous for its beautiful bridges and beaches. My favorite actor is Tom Hiddleston because of his incredible performance in Loki. My father is an electrical engineer and my mother is a high school teacher. I usually hang out with my close friends on weekends at local coffee shops.",
                stt_confidence=0.94,
                assessment=assessment1,
            )
            db.add(att1)

        # Tạo Attempt 2 (Picture Description)
        att2 = db.scalar(select(Attempt).where(Attempt.session_id == session.id, Attempt.sequence == 2))
        assessment2 = {
            "model": "gemini-2.5-flash",
            "status": "COMPLETED",
            "score": 8.2,
            "review_required": False,
            "criteria": [
                {"name": "Ideas", "score": 1.6, "max_score": 2.0, "weight": 20.0, "band": "Exceeds standard", "comment": "Miêu tả đầy đủ 4 ý định hướng: số người, không gian văn phòng, nghề nghiệp và chủ đề thảo luận."},
                {"name": "Pronunciation", "score": 1.6, "max_score": 2.0, "weight": 20.0, "band": "Exceeds standard", "comment": "Phát âm rõ ràng, trọng âm từ chính xác."},
                {"name": "Grammar Range and Accuracy", "score": 1.7, "max_score": 2.0, "weight": 20.0, "band": "Exceeds standard", "comment": "Sử dụng linh hoạt thì hiện tại tiếp diễn và mệnh đề quan hệ."},
                {"name": "Vocabulary Range and Accuracy", "score": 1.7, "max_score": 2.0, "weight": 20.0, "band": "Exceeds standard", "comment": "Sử dụng tốt các từ vựng chủ đề công sở (colleagues, presentation, project deadline)."},
                {"name": "Fluency and coherence", "score": 1.6, "max_score": 2.0, "weight": 20.0, "band": "Exceeds standard", "comment": "Tốc độ nói 2.2 WPS, sử dụng từ nối tự nhiên (in addition, furthermore)."},
            ],
            "enhanced_metrics": {
                "fluency": {"speech_rate_wps": 2.2, "pause_count": 3, "pause_ratio": 0.07, "filled_pause_count": 1},
                "pronunciation": {"acoustic_confidence": 0.91},
            },
            "feedback": "Ideas (1.6/2): Exceeds standard | Pronunciation (1.6/2): Exceeds standard | Grammar (1.7/2): Exceeds standard | Vocabulary (1.7/2): Exceeds standard | Fluency (1.6/2): Exceeds standard",
        }
        if not att2:
            att2 = Attempt(
                session_id=session.id,
                sequence=2,
                question={
                    "text": "Look at the picture showing a group meeting in a modern office. Describe the picture in 2 to 3 minutes.",
                    "title": "Picture Description - Office Meeting",
                    "part_type": "PICTURE_DESCRIPTION",
                    "prompt_image": "/images/office_meeting_team.svg",
                    "time_prep": 120,
                    "time_speak": 150,
                    "key_points": [
                        "How many people are there in the picture?",
                        "Where do you think they are?",
                        "Who do you think they are?",
                        "What do you think they are talking about?",
                    ],
                },
                status="COMPLETED",
                started_at=time.time() - 3300,
                finished_at=time.time() - 3150,
                transcript="Looking at the picture, I can see a group of five professionals having an active meeting in a modern, well-lit conference room. There are three men and two women dressed in formal business attire. In the center, a woman is presenting data on a laptop while her colleagues listen attentively. They appear to be discussing quarterly targets and upcoming project milestones. Overall, the atmosphere looks very collaborative and productive.",
                stt_confidence=0.91,
                assessment=assessment2,
            )
            db.add(att2)

        db.commit()
        print(f"  + Session ID: {session.id} | Student: Nguyễn Văn An | Score: 8.4/10.0 (COMPLETED)")

    print("\n" + "=" * 70)
    print(">>> NẠP SEED DATA ENTS THÀNH CÔNG 100%! <<<")
    print("=" * 70)


if __name__ == "__main__":
    seed_database()
