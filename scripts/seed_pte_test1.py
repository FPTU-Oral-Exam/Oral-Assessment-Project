import os
import sys
from pathlib import Path

# Add services/api to sys.path so we can import app modules directly
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "services" / "api"))

from sqlalchemy import select
from app.db import Base, SessionLocal, engine
from app.models import (
    Assignment,
    Course,
    CourseEnrollment,
    Exam,
    LearningOutcome,
    Rubric,
    Topic,
    TopicOutcome,
    User,
)
from argon2 import PasswordHasher
hasher = PasswordHasher()

PTE_COURSE_ID = "00000000-0000-4000-8000-000000000009"
PTE_EXAM_ID = "00000000-0000-4000-8000-000000000010"

def seed_pte():
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)
    
    with SessionLocal() as db:
        admin = db.scalar(select(User).where(User.role == "ADMIN").order_by(User.created_at))
        if not admin:
            admin = User(
                username="admin",
                name="Quản trị viên",
                role="ADMIN",
                password_hash=hasher.hash("admin12345678"),
            )
            db.add(admin)
            db.flush()

        student = db.scalar(select(User).where(User.role == "STUDENT").order_by(User.created_at))
        if not student:
            student = User(
                username="student",
                name="Thí sinh PTE",
                role="STUDENT",
                password_hash=hasher.hash("student12345678"),
            )
            db.add(student)
            db.flush()

        course = db.get(Course, PTE_COURSE_ID)
        if not course:
            course = Course(
                id=PTE_COURSE_ID,
                code="PTE-CORE",
                name="PTE Core & Academic Speaking",
                description="Bộ đề thi luyện nói tiếng Anh chuẩn PTE gồm 6 phần.",
                owner_id=admin.id,
                hotwords=["sleep", "disorder", "villages", "nitrogen", "oxygen", "entrepreneur", "intelligence", "originality"],
            )
            db.add(course)
            db.flush()

        lo = db.scalar(select(LearningOutcome).where(LearningOutcome.course_id == course.id))
        if not lo:
            lo = LearningOutcome(
                course_id=course.id,
                code="PTE-SPEAKING",
                description="Khả năng phát âm, lưu loát và phản xạ nói tiếng Anh chuẩn PTE",
            )
            db.add(lo)
            db.flush()

        topic = db.scalar(select(Topic).where(Topic.course_id == course.id))
        if not topic:
            topic = Topic(
                course_id=course.id,
                learning_outcome_id=lo.id,
                name="PTE Speaking 6 Tasks",
                description="Read Aloud, Repeat Sentence, Describe Image, Re-tell Lecture, Group Discussion, Situation",
            )
            db.add(topic)
            db.flush()
            db.add(TopicOutcome(topic_id=topic.id, outcome_id=lo.id))

        criteria = [
            {"name": "Content", "description": "Appropriate keywords, concept coverage and accuracy", "max_score": 3, "weight": 1},
            {"name": "Oral Fluency", "description": "Rhythm, phrasing, hesitation and smooth speech delivery", "max_score": 5, "weight": 1},
            {"name": "Pronunciation", "description": "Clarity of consonants, vowels and word stress", "max_score": 5, "weight": 1},
        ]
        rubric = db.scalar(select(Rubric).where(Rubric.course_id == course.id))
        if not rubric:
            rubric = Rubric(course_id=course.id, name="PTE Speaking Standard Rubric", criteria=criteria)
            db.add(rubric)
            db.flush()

        questions = [
            {
                "sequence": 1,
                "type": "READ_ALOUD",
                "instruction": "Look at the text below. In 40 seconds, you must read this text aloud as naturally and clearly as possible. You have 40 seconds to read aloud. The microphone will stop after 3 seconds of silence!",
                "text": "Sleep behavior is also known as a sleep disorder. People with sleep disorders often talk or walk in their sleep. They are not aware of what they are talking about or where they are going. There aren't any serious effects on the body in general but it may be connected to mental health. People with childhood trauma, unspeakable problems or depression are the ones with different sleep behavior.",
                "prep_time": 40,
                "speak_time": 40,
                "silence_timeout": 3,
                "model_audio": "/pte/test1/q1_ra_sample.mp3",
                "expected_concepts": ["Sleep behavior", "sleep disorder", "mental health", "depression"],
            },
            {
                "sequence": 2,
                "type": "REPEAT_SENTENCE",
                "instruction": "You will hear a sentence. Please repeat the sentence exactly as you hear it. The microphone will stop after 3 seconds of silence!",
                "text": "At that time, people moved from towns to villages.",
                "prompt_audio": "/pte/test1/q2_rs.mp3",
                "prep_time": 0,
                "speak_time": 15,
                "silence_timeout": 3,
                "expected_concepts": ["people moved from towns to villages"],
            },
            {
                "sequence": 3,
                "type": "SUMMARIZE_GROUP_DISCUSSION",
                "instruction": "You will hear three people having a discussion. When you hear the beep, summarize the whole discussion. You will have 10 seconds to prepare and 2 minutes to give your response. The microphone will stop after 3 seconds of silence!",
                "prompt_audio": "/pte/test1/q5_sgd.mp3",
                "text": "Group Discussion on Artificial Intelligence in Creative Fields",
                "prep_time": 10,
                "speak_time": 120,
                "silence_timeout": 3,
                "expected_concepts": ["Artificial Intelligence", "creative fields", "originality", "regulation", "artists"],
            },
            {
                "sequence": 4,
                "type": "DESCRIBE_IMAGE",
                "instruction": "Look at the image below. In 25 seconds, please speak into the microphone and describe in detail what the image is showing. You have 40 seconds to give your response. The microphone will stop after 3 seconds of silence!",
                "prompt_image": "/pte/test1/q3_di.svg",
                "text": "Approximate composition of the air (Nitrogen: 79%, Oxygen: 20%, Other gases: 1%)",
                "prep_time": 25,
                "speak_time": 40,
                "silence_timeout": 3,
                "expected_concepts": ["composition of the air", "Nitrogen 79%", "Oxygen 20%", "Other gases 1%"],
            },
            {
                "sequence": 5,
                "type": "RESPOND_TO_SITUATION",
                "instruction": "Listen to and read a description of a situation. Then answer a question about it with an extended response. You will have 10 seconds to think about your answer. You will have 40 seconds to give your response. The microphone will stop after 3 seconds of silence!",
                "prompt_audio": "/pte/test1/q6_rts.mp3",
                "text": "You're at a local café and realize you left your wallet at home after ordering. The cashier is waiting for payment, and you don't have enough time to go back home. What would you say to the cashier to resolve the situation?",
                "prep_time": 10,
                "speak_time": 40,
                "silence_timeout": 3,
                "expected_concepts": ["apologize", "left wallet", "mobile banking", "transfer", "solution"],
            },
            {
                "sequence": 6,
                "type": "RETELL_LECTURE",
                "instruction": "You will hear a lecture. After listening to the lecture, in 10 seconds, please speak into the microphone and retell what you have just heard from the lecture in your own words. You will have 40 seconds to give your response. The microphone will stop after 3 seconds of silence!",
                "prompt_audio": "/pte/test1/q4_rl.mp3",
                "text": "Lecture on Successful Entrepreneurship and Innovative Ideas",
                "prep_time": 10,
                "speak_time": 40,
                "silence_timeout": 3,
                "expected_concepts": ["successful entrepreneur", "great idea", "unique", "transformative", "innovation"],
            },
        ]

        exam = db.get(Exam, PTE_EXAM_ID)
        if not exam:
            exam = Exam(
                id=PTE_EXAM_ID,
                course_id=course.id,
                rubric_id=rubric.id,
                name="PTE Speaking Practice Test 1",
                time_limit=1800,
                blueprint=[{"topic_id": topic.id, "difficulty": "MEDIUM", "count": 6}],
                status="PUBLISHED",
                max_attempts=None,
                snapshot={
                    "practice": True,
                    "questions": questions,
                    "criteria": criteria,
                    "rubric_version": 1,
                    "knowledge_version": "pte-v1",
                    "ai_provider": "demo",
                    "embedding_model": "demo-hash-768-v1",
                    "llm_model": "pte-model",
                    "prompt_version": "pte-speaking-v1",
                    "document_ids": [],
                    "topic_chunk_ids": {},
                },
            )
            db.add(exam)
            db.flush()

        # Enroll all active students and assign this exam
        students = db.scalars(select(User).where(User.role == "STUDENT")).all()
        for s in students:
            if not db.scalar(select(CourseEnrollment).where(CourseEnrollment.course_id == course.id, CourseEnrollment.student_id == s.id)):
                db.add(CourseEnrollment(course_id=course.id, student_id=s.id))
            if not db.scalar(select(Assignment).where(Assignment.exam_id == exam.id, Assignment.student_id == s.id)):
                db.add(Assignment(exam_id=exam.id, student_id=s.id))

        db.commit()
        print(f"Successfully seeded {exam.name} with {len(questions)} PTE questions!")

if __name__ == "__main__":
    seed_pte()
