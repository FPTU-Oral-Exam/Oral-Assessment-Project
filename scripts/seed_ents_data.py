"""
Seeder chuẩn hóa Hệ sinh thái ENTs Speaking Test 5 Tiêu chí Thang điểm 10 theo 6 Level.
Khởi tạo:
1. 11 Tài khoản hệ thống chuẩn (admin, academy, examiner, teacher, student, student_l1 -> student_l6).
2. 6 Môn học ENTs chuẩn FPT (ENT001, ENT104, ENT203, ENT303, ENT403, ENT503).
3. 4 Dạng bài Speaking (GENERAL_INTERVIEW, PICTURE_DESCRIPTION, TOPIC_MONOLOGUE, DEEP_DISCUSSION).
4. Bộ Rubric chuẩn ENTs Speaking 5 tiêu chí thang điểm 10 (mỗi tiêu chí 2.0 điểm, 4 band descriptors).
5. Ngân hàng câu hỏi mẫu (Item Bank) bóc tách từ các tài liệu Guidelines.
6. 6 Đề thi mẫu PUBLISHED (tương ứng với 6 Level ENT001 -> ENT503) nạp đầy đủ questions vào snapshot.
7. Thiết lập Ca thi, Phòng thi, Phân bổ Giảng viên và Thí sinh tự động cho cả 6 Level.
8. 1 Bài thi mẫu đã chấm hoàn tất cho học viên 'student' để Giảng viên kiểm tra giao diện /grading.
"""

import sys
import os
import time
import uuid

# Cấu hình UTF-8 cho console Windows
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# Cho phép import app từ services/api hoặc trực tiếp từ thư mục cha
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "services", "api")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import select, delete
from app.db import SessionLocal
from app.models import (
    User,
    Course,
    Rubric,
    Exam,
    ExamBatch,
    ScheduleSlot,
    SlotAssignment,
    CourseCandidate,
    CourseEnrollment,
    Section,
    ExamEnrollment,
    ExamSession,
    Attempt,
    AcademicQuestion,
    AcademicMatrix,
    QuestionTypeConfigModel,
)
from app.security import hasher


# ============================================================================
# 1. TÀI KHOẢN HỆ THỐNG CHUẨN (BAO GỒM 6 TÀI KHOẢN THEO LEVEL)
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
        "name": "Nguyễn Văn An (Demo Student - Level 2)",
        "role": "STUDENT",
        "password": "Student@123456",
    },
    # Sinh viên mẫu theo từng Level để kiểm thử tính năng thi theo Level
    {
        "username": "student_l1",
        "name": "Nguyễn Anh Dũng (Demo Level 1 - ENT001)",
        "role": "STUDENT",
        "password": "Student@123456",
    },
    {
        "username": "student_l2",
        "name": "Trần Bảo Nam (Demo Level 2 - ENT104)",
        "role": "STUDENT",
        "password": "Student@123456",
    },
    {
        "username": "student_l3",
        "name": "Lê Thanh Tùng (Demo Level 3 - ENT203)",
        "role": "STUDENT",
        "password": "Student@123456",
    },
    {
        "username": "student_l4",
        "name": "Phạm Văn Đức (Demo Level 4 - ENT303)",
        "role": "STUDENT",
        "password": "Student@123456",
    },
    {
        "username": "student_l5",
        "name": "Bùi Hoàng Việt (Demo Level 5 - ENT403)",
        "role": "STUDENT",
        "password": "Student@123456",
    },
    {
        "username": "student_l6",
        "name": "Trần Quang Minh (Demo Level 6 - ENT503)",
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
    {
        "type": "ROLE_PLAY",
        "name": "Part 1: Role-play with Local AI Partner",
        "vietnamese_name": "Đóng vai hội thoại tương tác (Local AI)",
        "description": "Thí sinh nhận thẻ vai trò và tương tác đối thoại 2 chiều với Local AI (Ollama).",
        "default_prep_time": 60,
        "default_response_time": 180,
        "max_score": 10.0,
        "requires_image": False,
        "requires_key_points": True,
        "recommended_question_count": 1,
    },
]

# ============================================================================
# 4. BỘ RUBRIC CHUẨN ENTS SPEAKING 5 TIÊU CHÍ (THANG ĐIỂM 10)
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
    # --- GENERAL INTERVIEW ---
    {
        "code": "ENT001_INT_01",
        "skill": "SPEAKING",
        "type": "GENERAL_INTERVIEW",
        "title": "General Interview - Self Introduction & Daily Routine",
        "prompt": "Please introduce yourself briefly. What is your daily routine on a typical weekday? What do you usually do in your free time, and why?",
        "prep_time": 0,
        "response_time": 45,
        "difficulty": "EASY",
        "key_points": [
            "State full name, age, and major/studies clearly",
            "Describe morning and afternoon daily routine",
            "Mention leisure activities and reasons for choosing them",
        ],
        "tags": ["ENT001", "Interview", "SelfIntroduction"],
    },
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
    {
        "code": "ENT203_INT_01",
        "skill": "SPEAKING",
        "type": "GENERAL_INTERVIEW",
        "title": "General Interview - Travel Experiences & Hobbies",
        "prompt": "Tell me about a memorable trip you took recently. Why did you choose that destination? What hobbies do you enjoy the most, and how did you start them?",
        "prep_time": 0,
        "response_time": 60,
        "difficulty": "MEDIUM",
        "key_points": [
            "Describe travel destination, companions, and key experiences",
            "Explain personal reasons for choosing the trip",
            "Elaborate on current hobbies and their beginnings",
        ],
        "tags": ["ENT203", "Interview", "Travel"],
    },

    # --- PICTURE DESCRIPTION ---
    {
        "code": "ENT001_PICT_01",
        "skill": "SPEAKING",
        "type": "PICTURE_DESCRIPTION",
        "title": "Picture Description - University Campus Life",
        "prompt": "Look at the picture showing students on a modern university campus. Describe what you see in 2 minutes: where they are, what they are doing, and how they appear to feel.",
        "media_url": "/images/office_meeting_team.svg",
        "prep_time": 90,
        "response_time": 120,
        "difficulty": "EASY",
        "key_points": [
            "Describe the overall setting and campus surroundings",
            "Identify the number of students and their primary actions",
            "Describe facial expressions, mood, and interactions",
        ],
        "tags": ["ENT001", "PictureDescription", "CampusLife"],
    },
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
    {
        "code": "ENT203_PICT_01",
        "skill": "SPEAKING",
        "type": "PICTURE_DESCRIPTION",
        "title": "Picture Description - Collaborative Tech Workshop",
        "prompt": "Look at the picture showing a team of engineers collaborating on a software design session. Describe their roles, tools, and collaboration dynamics.",
        "media_url": "/images/office_meeting_team.svg",
        "prep_time": 120,
        "response_time": 150,
        "difficulty": "MEDIUM",
        "key_points": [
            "Identify key team members and their roles",
            "Describe equipment, screens, and technical documents",
            "Evaluate team collaboration dynamics and engagement",
        ],
        "tags": ["ENT203", "PictureDescription", "Collaboration"],
    },

    # --- TOPIC MONOLOGUE ---
    {
        "code": "ENT303_MONO_01",
        "skill": "SPEAKING",
        "type": "TOPIC_MONOLOGUE",
        "title": "Topic Monologue - An Important Technological Innovation",
        "prompt": "Describe an important technological innovation that has changed modern life. Explain what it is, how it works, and whether its overall impact is positive or negative.",
        "prep_time": 60,
        "response_time": 150,
        "difficulty": "HARD",
        "key_points": [
            "Name the innovation and when it emerged",
            "Explain core functionalities and how people use it",
            "Analyze benefits vs potential societal drawbacks",
        ],
        "tags": ["ENT303", "Monologue", "Innovation"],
    },
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
    {
        "code": "ENT503_MONO_01",
        "skill": "SPEAKING",
        "type": "TOPIC_MONOLOGUE",
        "title": "Topic Monologue - Artificial Intelligence in Higher Education",
        "prompt": "Discuss the impact of generative artificial intelligence on higher education. Present arguments on academic integrity, personalized learning, and future career readiness.",
        "prep_time": 60,
        "response_time": 150,
        "difficulty": "HARD",
        "key_points": [
            "Overview of AI adoption in modern university classrooms",
            "Key benefits for personalized learning and accessibility",
            "Challenges regarding academic integrity and critical thinking",
            "Recommendations for university policy and students",
        ],
        "tags": ["ENT503", "Monologue", "ArtificialIntelligence"],
    },

    # --- DEEP DISCUSSION ---
    {
        "code": "ENT203_DISC_01",
        "skill": "SPEAKING",
        "type": "DEEP_DISCUSSION",
        "title": "Deep Discussion - Remote Working vs Office Presence",
        "prompt": "Do you believe remote work increases employee productivity or degrades team cohesion? What are the key psychological and organizational factors?",
        "prep_time": 15,
        "response_time": 90,
        "difficulty": "MEDIUM",
        "key_points": [
            "Evaluate productivity metrics in remote vs in-office settings",
            "Discuss communication barriers and team trust",
            "Conclude with recommendations for hybrid workplace models",
        ],
        "tags": ["ENT203", "DeepDiscussion", "Workplace"],
    },
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
    {
        "code": "ENT503_DISC_01",
        "skill": "SPEAKING",
        "type": "DEEP_DISCUSSION",
        "title": "Deep Discussion - Ethical Dilemmas in Autonomous Systems",
        "prompt": "When autonomous machines or algorithms cause harm, who bears moral and legal responsibility? How should regulators balance technological innovation with public safety?",
        "prep_time": 15,
        "response_time": 90,
        "difficulty": "HARD",
        "key_points": [
            "Analyze ethical responsibility when autonomous systems fail",
            "Compare legal frameworks across different jurisdictions",
            "Propose regulatory principles for AI deployment",
        ],
        "tags": ["ENT503", "DeepDiscussion", "Ethics"],
    },

    # --- ROLE-PLAY WITH LOCAL AI (LEVEL 3 & 4) ---
    {
        "code": "ENT203_ROLE_01",
        "skill": "SPEAKING",
        "type": "ROLE_PLAY",
        "title": "Role-play: School Bus Trip to Da Nang",
        "prompt": "Role-play Situation: You are Student A planning to join the university's weekend trip to Da Nang. You are talking to Alex, the student travel coordinator (Local AI). Your task is to ask about: 1. Date and departure time; 2. Ticket price and student discounts; 3. Places to visit in Da Nang; 4. Items you need to prepare and bring.",
        "prep_time": 60,
        "response_time": 180,
        "difficulty": "MEDIUM",
        "key_points": [
            "Ask about the date and departure time",
            "Inquire about ticket price and payment",
            "Ask about key attractions and itinerary",
            "Ask what items or documents to bring, then thank and wrap up",
        ],
        "tags": ["ENT203", "RolePlay", "DaNangTrip", "LocalAI"],
    },
    {
        "code": "ENT303_ROLE_01",
        "skill": "SPEAKING",
        "type": "ROLE_PLAY",
        "title": "Role-play: Cross-Cultural Workplace Etiquette",
        "prompt": "Role-play Situation: You are a student exchange intern talking with your workplace advisor, Sarah (Local AI), before your first international project meeting. Ask about: 1. Business greeting customs; 2. Taboo conversation topics to avoid; 3. Meeting manners and note-taking; 4. Business dining etiquette and making a good impression.",
        "prep_time": 60,
        "response_time": 180,
        "difficulty": "HARD",
        "key_points": [
            "Inquire about appropriate greeting customs",
            "Ask about sensitive or taboo topics to avoid",
            "Ask about meeting protocols and expectations",
            "Ask for advice on business dining manners and thank the advisor",
        ],
        "tags": ["ENT303", "RolePlay", "WorkplaceEtiquette", "LocalAI"],
    },
]


def seed_database():
    print("=" * 70)
    print(">>> BẮT ĐẦU NẠP SEED DATA CHUẨN ENTS SPEAKING 5 TIÊU CHÍ (SCALE 10) <<<")
    print("=" * 70)

    with SessionLocal() as db:
        # 1. Đồng bộ 11 tài khoản hệ thống chuẩn
        print("\n[1/7] Đồng bộ 11 tài khoản hệ thống chuẩn (bao gồm 6 student theo Level)...")
        user_map = {}
        for acc in ACCOUNTS:
            user = db.scalar(select(User).where(User.username == acc["username"]))
            if not user:
                user = User(
                    username=acc["username"],
                    name=acc["name"],
                    email=f"{acc['username']}@fpt.edu.vn",
                    role=acc["role"],
                    status="ACTIVE",
                    password_hash=hasher.hash(acc["password"]),
                )
                db.add(user)
            else:
                user.password_hash = hasher.hash(acc["password"])
                user.role = acc["role"]
                user.name = acc["name"]
                user.status = "ACTIVE"
            db.flush()
            user_map[acc["username"]] = user.id
            print(f"  + User: {acc['username']:<12} | Role: {acc['role']:<12} | OK")

        # 2. Đồng bộ 6 môn học chuẩn FPT
        print("\n[2/7] Đồng bộ 6 môn học chuẩn FPT (ENT001 - ENT503)...")
        course_map = {}
        for c in ENT_COURSES:
            course = db.scalar(select(Course).where(Course.code == c["code"]))
            if not course:
                course = Course(
                    code=c["code"],
                    name=c["name"],
                    term="Fall 2026",
                    department_code=c["department_code"],
                )
                db.add(course)
            else:
                course.name = c["name"]
                course.term = "Fall 2026"
            db.flush()
            course_map[c["code"]] = course.id
            print(f"  + Course: {c['code']:<8} | {c['name']}")

        # 3. Cấu hình 4 dạng bài Speaking ENTs
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
                course_id=course_map.get("ENT104"),
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
        print("\n[5/7] Dọn sạch câu hỏi cũ (legacy types) và nạp 12 câu hỏi ENTs vào Ngân hàng câu hỏi...")
        LEGACY_TYPES = ["RA", "RS", "GD", "DI", "SI", "RL", "ASQ"]
        del_q = db.execute(delete(AcademicQuestion).where(AcademicQuestion.type.in_(LEGACY_TYPES))).rowcount
        del_cfg = db.execute(delete(QuestionTypeConfigModel).where(QuestionTypeConfigModel.type.in_(LEGACY_TYPES))).rowcount
        db.flush()
        if del_q or del_cfg:
            print(f"  + Đã dọn sạch {del_q} câu hỏi cũ và {del_cfg} cấu hình dạng bài cũ (legacy) khỏi Database.")

        q_object_map = {}
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
                q_obj = existing
            else:
                q_obj = AcademicQuestion(
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
                db.add(q_obj)
            db.flush()
            q_object_map[q_data["code"]] = q_obj
            print(f"  + Question: {q_data['code']:<16} | Type: {q_data['type']}")

        # Helper tạo attempt question object từ AcademicQuestion
        def make_question_payload(q_obj):
            return {
                "id": q_obj.id,
                "code": q_obj.code,
                "title": q_obj.title,
                "type": q_obj.type,
                "part_type": q_obj.type,
                "text": q_obj.prompt,
                "prompt": q_obj.prompt,
                "prompt_image": q_obj.media_url,
                "media_url": q_obj.media_url,
                "time_prep": q_obj.prep_time,
                "time_speak": q_obj.response_time,
                "prep_time": q_obj.prep_time,
                "response_time": q_obj.response_time,
                "key_points": q_obj.key_points or [],
                "difficulty": q_obj.difficulty,
            }

        # 6. Tạo 6 Kỳ thi mẫu PUBLISHED (tương ứng với cả 6 Level ENT001 -> ENT503)
        print("\n[6/7] Phát hành 6 Đề thi mẫu PUBLISHED cho cả 6 Level ENTs...")

        EXAMS_SPEC = [
            {
                "code": "ENT001",
                "name": "ENT001 Speaking Final Exam (Học kỳ Fall 2026)",
                "desc": "Kỳ thi Vấn đáp cuối kỳ môn ENT001 - Level 1 (A1 Starter). Gồm 2 phần: Phỏng vấn & Miêu tả tranh.",
                "q_codes": ["ENT001_INT_01", "ENT001_PICT_01"],
                "blueprint": [
                    {"type": "GENERAL_INTERVIEW", "count": 1, "difficulty": "EASY"},
                    {"type": "PICTURE_DESCRIPTION", "count": 1, "difficulty": "EASY"},
                ],
            },
            {
                "code": "ENT104",
                "name": "ENT104 Speaking Final Exam (Học kỳ Fall 2026)",
                "desc": "Kỳ thi Vấn đáp cuối kỳ môn ENT104 - Level 2 (A2 Elementary). Gồm 2 phần: Phỏng vấn & Miêu tả tranh.",
                "q_codes": ["ENT104_INT_01", "ENT104_PICT_01"],
                "blueprint": [
                    {"type": "GENERAL_INTERVIEW", "count": 1, "difficulty": "EASY"},
                    {"type": "PICTURE_DESCRIPTION", "count": 1, "difficulty": "MEDIUM"},
                ],
            },
            {
                "code": "ENT203",
                "name": "ENT203 Speaking Final Exam (Học kỳ Fall 2026)",
                "desc": "Kỳ thi Vấn đáp cuối kỳ môn ENT203 - Level 3 (B1 Intermediate). Gồm 2 phần: Đóng vai với Local AI & Thảo luận sâu.",
                "q_codes": ["ENT203_ROLE_01", "ENT203_DISC_01"],
                "blueprint": [
                    {"type": "ROLE_PLAY", "count": 1, "difficulty": "MEDIUM"},
                    {"type": "DEEP_DISCUSSION", "count": 1, "difficulty": "MEDIUM"},
                ],
            },
            {
                "code": "ENT303",
                "name": "ENT303 Speaking Final Exam (Học kỳ Fall 2026)",
                "desc": "Kỳ thi Vấn đáp cuối kỳ môn ENT303 - Level 4 (B1+ High Intermediate). Gồm 2 phần: Đóng vai với Local AI & Thảo luận sâu.",
                "q_codes": ["ENT303_ROLE_01", "ENT203_DISC_01"],
                "blueprint": [
                    {"type": "ROLE_PLAY", "count": 1, "difficulty": "HARD"},
                    {"type": "DEEP_DISCUSSION", "count": 1, "difficulty": "MEDIUM"},
                ],
            },
            {
                "code": "ENT403",
                "name": "ENT403 Speaking Final Exam (Học kỳ Fall 2026)",
                "desc": "Kỳ thi Vấn đáp cuối kỳ môn ENT403 - Level 5 (B2 Upper Intermediate). Gồm 2 phần: Độc thoại theo chủ đề & Thảo luận phản biện.",
                "q_codes": ["ENT403_MONO_01", "ENT403_DISC_01"],
                "blueprint": [
                    {"type": "TOPIC_MONOLOGUE", "count": 1, "difficulty": "HARD"},
                    {"type": "DEEP_DISCUSSION", "count": 1, "difficulty": "HARD"},
                ],
            },
            {
                "code": "ENT503",
                "name": "ENT503 Speaking Final Exam (Học kỳ Fall 2026)",
                "desc": "Kỳ thi Vấn đáp cuối kỳ môn ENT503 - Level 6 (B2+ Advanced). Gồm 2 phần: Độc thoại học thuật & Phản biện chuyên sâu.",
                "q_codes": ["ENT503_MONO_01", "ENT503_DISC_01"],
                "blueprint": [
                    {"type": "TOPIC_MONOLOGUE", "count": 1, "difficulty": "HARD"},
                    {"type": "DEEP_DISCUSSION", "count": 1, "difficulty": "HARD"},
                ],
            },
        ]

        exam_map = {}
        for spec in EXAMS_SPEC:
            c_code = spec["code"]
            c_id = course_map[c_code]
            exam_obj = db.scalar(select(Exam).where(Exam.name == spec["name"]))

            # Chuẩn bị danh sách câu hỏi cho snapshot
            q_payloads = [make_question_payload(q_object_map[qc]) for qc in spec["q_codes"] if qc in q_object_map]

            snapshot = {
                "assembly_mode": "ITEM_BANK_BLUEPRINT",
                "criteria": ENT_RUBRIC_CRITERIA,
                "rubric_version": rubric.version,
                "knowledge_version": "guidelines-v1",
                "questions": q_payloads,
            }

            if not exam_obj:
                exam_obj = Exam(
                    course_id=c_id,
                    rubric_id=rubric.id,
                    name=spec["name"],
                    description=spec["desc"],
                    time_limit=600,
                    question_count=len(q_payloads),
                    status="PUBLISHED",
                    snapshot=snapshot,
                    blueprint=spec["blueprint"],
                )
                db.add(exam_obj)
            else:
                exam_obj.snapshot = snapshot
                exam_obj.status = "PUBLISHED"
                exam_obj.question_count = len(q_payloads)
                exam_obj.blueprint = spec["blueprint"]
            db.flush()
            exam_map[c_code] = exam_obj
            print(f"  + Exam: {spec['name']:<50} | ID: {exam_obj.id}")

        # 7. Thiết lập Ca thi, Phòng thi và Phân bổ sinh viên theo từng Level
        print("\n[7/7] Thiết lập Ca thi, Phòng thi và Phân bổ sinh viên theo từng Level...")
        now_ts = time.time()
        date_ts = now_ts + 86400  # Ngày mai

        SLOT_CONFIGS = [
            {"code": "ENT001", "ca": 1, "batch": "Ca 1", "room": "AL-L101", "start": "08:00", "end": "09:30", "class": "SE1701", "students": ["student_l1"]},
            {"code": "ENT104", "ca": 1, "batch": "Ca 1", "room": "AL-L401", "start": "08:00", "end": "09:30", "class": "SE1702", "students": ["student", "student_l2"]},
            {"code": "ENT203", "ca": 2, "batch": "Ca 2", "room": "AL-L201", "start": "10:00", "end": "11:30", "class": "SE1703", "students": ["student_l3"]},
            {"code": "ENT303", "ca": 3, "batch": "Ca 3", "room": "AL-L301", "start": "13:30", "end": "15:00", "class": "SE1704", "students": ["student_l4"]},
            {"code": "ENT403", "ca": 3, "batch": "Ca 3", "room": "AL-L403", "start": "13:30", "end": "15:00", "class": "SE1705", "students": ["student_l5"]},
            {"code": "ENT503", "ca": 4, "batch": "Ca 4", "room": "AL-L501", "start": "15:30", "end": "17:00", "class": "SE1706", "students": ["student_l6"]},
        ]

        for sc in SLOT_CONFIGS:
            c_code = sc["code"]
            c_id = course_map[c_code]
            ex = exam_map[c_code]

            # Batch
            batch = db.scalar(select(ExamBatch).where(ExamBatch.exam_id == ex.id, ExamBatch.name == sc["batch"]))
            if not batch:
                batch = ExamBatch(
                    exam_id=ex.id,
                    name=sc["batch"],
                    date=date_ts,
                    start_time=sc["start"],
                    end_time=sc["end"],
                    max_students_per_room=40,
                    assigned_teacher_id=user_map["teacher"],
                    status="SCHEDULED",
                )
                db.add(batch)
                db.flush()

            # Slot
            slot = db.scalar(select(ScheduleSlot).where(
                ScheduleSlot.exam_id == ex.id,
                ScheduleSlot.room == sc["room"],
                ScheduleSlot.slot_number == sc["ca"]
            ))
            if not slot:
                slot = ScheduleSlot(
                    exam_id=ex.id,
                    batch_id=batch.id,
                    slot_number=sc["ca"],
                    date=date_ts,
                    start_time=sc["start"],
                    end_time=sc["end"],
                    room=sc["room"],
                    max_students=40,
                    teacher_id=user_map["teacher"],
                    status="READY",
                )
                db.add(slot)
                db.flush()
            else:
                slot.status = "READY"
                slot.batch_id = batch.id
                slot.teacher_id = user_map["teacher"]

            # Section (Lớp học phần)
            sec = db.scalar(select(Section).where(Section.course_id == c_id, Section.code == sc["class"]))
            if not sec:
                sec = Section(
                    course_id=c_id,
                    name=f"Lớp {sc['class']}",
                    code=sc["class"],
                    status="ACTIVE",
                    teacher_id=user_map["teacher"],
                )
                db.add(sec)
                db.flush()

            # Phân bổ từng sinh viên vào Lớp, CourseEnrollment, SlotAssignment, CourseCandidate
            for st_username in sc["students"]:
                st_id = user_map.get(st_username)
                if not st_id:
                    continue

                st_user = db.get(User, st_id)

                # CourseEnrollment
                ce = db.scalar(select(CourseEnrollment).where(
                    CourseEnrollment.course_id == c_id,
                    CourseEnrollment.student_id == st_id
                ))
                if not ce:
                    db.add(CourseEnrollment(course_id=c_id, student_id=st_id))

                # ExamEnrollment
                ee = db.scalar(select(ExamEnrollment).where(
                    ExamEnrollment.section_id == sec.id,
                    ExamEnrollment.student_id == st_id
                ))
                if not ee:
                    db.add(ExamEnrollment(section_id=sec.id, student_id=st_id))

                # SlotAssignment
                sa = db.scalar(select(SlotAssignment).where(
                    SlotAssignment.slot_id == slot.id,
                    SlotAssignment.student_id == st_id
                ))
                if not sa:
                    db.add(SlotAssignment(slot_id=slot.id, student_id=st_id))

                # CourseCandidate
                cand = db.scalar(select(CourseCandidate).where(
                    CourseCandidate.course_id == c_id,
                    CourseCandidate.roll_number == st_username
                ))
                if not cand:
                    db.add(CourseCandidate(
                        course_id=c_id,
                        student_id=st_id,
                        roll_number=st_username,
                        full_name=st_user.name if st_user else st_username,
                        allocation_status="ASSIGNED",
                        assigned_slot_id=slot.id,
                        eligibility_status="ELIGIBLE",
                    ))
                else:
                    cand.assigned_slot_id = slot.id
                    cand.allocation_status = "ASSIGNED"
                    cand.eligibility_status = "ELIGIBLE"

            print(f"  + Course: {c_code:<8} | {sc['batch']} | Room: {sc['room']} | Class: {sc['class']} | Students: {sc['students']}")

        # 8. Khởi tạo 1 Bài thi mẫu đã chấm hoàn tất cho Sinh viên SV001 (student)
        ent104_exam = exam_map["ENT104"]
        session = db.scalar(select(ExamSession).where(
            ExamSession.exam_id == ent104_exam.id,
            ExamSession.student_id == user_map["student"]
        ))
        if not session:
            session = ExamSession(
                exam_id=ent104_exam.id,
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
