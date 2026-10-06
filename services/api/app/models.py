import time
import uuid

from pgvector.sqlalchemy import Vector
from sqlalchemy import JSON, Float, ForeignKey, Index, Integer, String, Text, UniqueConstraint, text
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base


def uid():
    return str(uuid.uuid4())


class Entity:
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    created_at: Mapped[float] = mapped_column(Float, default=time.time)


class User(Entity, Base):
    __tablename__ = "users"
    username: Mapped[str] = mapped_column(String(80), unique=True)
    email: Mapped[str | None] = mapped_column(String(320))
    google_sub: Mapped[str | None] = mapped_column(String(255), unique=True)
    name: Mapped[str] = mapped_column(String(150))
    password_hash: Mapped[str] = mapped_column(Text)
    role: Mapped[str] = mapped_column(String(20))
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE")


class AuthSession(Entity, Base):
    __tablename__ = "auth_sessions"
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    expires_at: Mapped[float] = mapped_column(Float)
    revoked: Mapped[bool] = mapped_column(default=False)


class Course(Entity, Base):
    __tablename__ = "courses"
    code: Mapped[str] = mapped_column(String(50), unique=True)
    name: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, default="")
    credits: Mapped[int] = mapped_column(Integer, default=3)
    owner_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    teacher_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    semester_id: Mapped[str | None] = mapped_column(ForeignKey("semesters.id"), nullable=True)
    department_code: Mapped[str | None] = mapped_column(String(20), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE")


class CourseEnrollment(Entity, Base):
    __tablename__ = "course_enrollments"
    __table_args__ = (UniqueConstraint("course_id", "student_id"),)
    course_id: Mapped[str] = mapped_column(ForeignKey("courses.id"))
    student_id: Mapped[str] = mapped_column(ForeignKey("users.id"))


class OAuthFlow(Entity, Base):
    __tablename__ = "oauth_flows"
    state_hash: Mapped[str | None] = mapped_column(String(64), unique=True)
    nonce: Mapped[str] = mapped_column(String(100))
    verifier: Mapped[str] = mapped_column(String(100))
    poll_hash: Mapped[str | None] = mapped_column(String(64))
    user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"))
    expires_at: Mapped[float] = mapped_column(Float)
    consumed: Mapped[bool] = mapped_column(default=False)
    completed: Mapped[bool] = mapped_column(default=False)
    failed: Mapped[bool] = mapped_column(default=False)


class LearningOutcome(Entity, Base):
    __tablename__ = "learning_outcomes"
    __table_args__ = (UniqueConstraint("course_id", "code"),)
    course_id: Mapped[str] = mapped_column(ForeignKey("courses.id"))
    code: Mapped[str] = mapped_column(String(50))
    description: Mapped[str] = mapped_column(Text)
    weight: Mapped[float] = mapped_column(Float, default=1)


class Topic(Entity, Base):
    __tablename__ = "topics"
    course_id: Mapped[str] = mapped_column(ForeignKey("courses.id"))
    learning_outcome_id: Mapped[str] = mapped_column(ForeignKey("learning_outcomes.id"))
    name: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, default="")


class Document(Entity, Base):
    __tablename__ = "documents"
    __table_args__ = (
        Index(
            "one_textbook_per_course",
            "course_id",
            unique=True,
            postgresql_where=text("kind = 'TEXTBOOK'"),
            sqlite_where=text("kind = 'TEXTBOOK'"),
        ),
    )
    course_id: Mapped[str] = mapped_column(ForeignKey("courses.id"))
    topic_id: Mapped[str | None] = mapped_column(ForeignKey("topics.id"))
    kind: Mapped[str] = mapped_column(String(20), default="SUPPLEMENT")
    page_count: Mapped[int | None] = mapped_column(Integer)
    filename: Mapped[str] = mapped_column(String(250))
    storage_key: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="PENDING")
    version: Mapped[int] = mapped_column(Integer, default=1)
    error: Mapped[str | None] = mapped_column(Text)
    embedding_model: Mapped[str] = mapped_column(String(150))


class Chunk(Entity, Base):
    __tablename__ = "document_chunks"
    document_id: Mapped[str] = mapped_column(ForeignKey("documents.id"), index=True)
    course_id: Mapped[str] = mapped_column(ForeignKey("courses.id"), index=True)
    topic_id: Mapped[str | None] = mapped_column(ForeignKey("topics.id"))
    learning_outcome_id: Mapped[str | None] = mapped_column(ForeignKey("learning_outcomes.id"))
    heading: Mapped[str | None] = mapped_column(Text)
    page: Mapped[int] = mapped_column(Integer)
    content: Mapped[str] = mapped_column(Text)
    embedding: Mapped[list] = mapped_column(JSON().with_variant(Vector(768), "postgresql"))


class Rubric(Entity, Base):
    __tablename__ = "rubrics"
    course_id: Mapped[str] = mapped_column(ForeignKey("courses.id"))
    name: Mapped[str] = mapped_column(String(200))
    version: Mapped[int] = mapped_column(Integer, default=1)
    criteria: Mapped[list] = mapped_column(JSON(none_as_null=True))


class Exam(Entity, Base):
    __tablename__ = "exams"
    course_id: Mapped[str] = mapped_column(ForeignKey("courses.id"))
    rubric_id: Mapped[str | None] = mapped_column(ForeignKey("rubrics.id"), nullable=True)
    name: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text, default="")
    time_limit: Mapped[int] = mapped_column(Integer)
    question_count: Mapped[int] = mapped_column(Integer, default=3)
    blueprint: Mapped[list | None] = mapped_column(JSON(none_as_null=True), default=[])
    status: Mapped[str] = mapped_column(String(20), default="DRAFT")
    snapshot: Mapped[dict | None] = mapped_column(JSON(none_as_null=True))
    max_attempts: Mapped[int | None] = mapped_column(Integer().evaluates_none(), default=1, server_default="1")
    deleted_at: Mapped[float | None] = mapped_column(Float)


class Assignment(Entity, Base):
    __tablename__ = "assignments"
    __table_args__ = (UniqueConstraint("exam_id", "student_id"),)
    exam_id: Mapped[str] = mapped_column(ForeignKey("exams.id"))
    student_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    extra_attempts: Mapped[int] = mapped_column(Integer, default=0, server_default="0")


class ExamSession(Entity, Base):
    __tablename__ = "exam_sessions"
    __table_args__ = (
        UniqueConstraint("exam_id", "student_id", "attempt_number", name="uq_exam_session_attempt"),
        Index("one_active_exam_session", "exam_id", "student_id", unique=True,
              postgresql_where=text("deleted_at IS NULL AND status IN ('DEVICE_CHECK', 'IN_PROGRESS')"),
              sqlite_where=text("deleted_at IS NULL AND status IN ('DEVICE_CHECK', 'IN_PROGRESS')")),
    )
    exam_id: Mapped[str] = mapped_column(ForeignKey("exams.id"))
    student_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    status: Mapped[str] = mapped_column(String(30), default="DEVICE_CHECK")
    started_at: Mapped[float | None] = mapped_column(Float)
    completed_at: Mapped[float | None] = mapped_column(Float)
    final_score: Mapped[float | None] = mapped_column(Float)
    attempt_number: Mapped[int] = mapped_column(Integer, default=1, server_default="1")
    deleted_at: Mapped[float | None] = mapped_column(Float)


class MediaCleanup(Entity, Base):
    __tablename__ = "media_cleanup"
    upload_id: Mapped[str] = mapped_column(String(36), unique=True)
    storage_key: Mapped[str | None] = mapped_column(Text)
    retries: Mapped[int] = mapped_column(Integer, default=0)
    next_attempt_at: Mapped[float] = mapped_column(Float, default=0)


class Attempt(Entity, Base):
    __tablename__ = "question_attempts"
    __table_args__ = (UniqueConstraint("session_id", "sequence"),)
    session_id: Mapped[str] = mapped_column(ForeignKey("exam_sessions.id"), index=True)
    sequence: Mapped[int] = mapped_column(Integer)
    question: Mapped[dict] = mapped_column(JSON(none_as_null=True))
    status: Mapped[str] = mapped_column(String(30), default="READY")
    started_at: Mapped[float | None] = mapped_column(Float)
    finished_at: Mapped[float | None] = mapped_column(Float)
    transcript: Mapped[str | None] = mapped_column(Text)
    stt_confidence: Mapped[float | None] = mapped_column(Float)
    assessment: Mapped[dict | None] = mapped_column(JSON(none_as_null=True))
    submit_key: Mapped[str | None] = mapped_column(String(100))


class Upload(Entity, Base):
    __tablename__ = "uploads"
    attempt_id: Mapped[str] = mapped_column(ForeignKey("question_attempts.id"))
    kind: Mapped[str] = mapped_column(String(10))
    mime_type: Mapped[str] = mapped_column(String(100))
    size: Mapped[int] = mapped_column(Integer)
    sha256: Mapped[str] = mapped_column(String(64))
    total_chunks: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(20), default="PENDING")
    storage_key: Mapped[str | None] = mapped_column(Text)


class Audit(Entity, Base):
    __tablename__ = "audit_logs"
    user_id: Mapped[str | None] = mapped_column(String(36))
    event: Mapped[str] = mapped_column(String(80))
    details: Mapped[dict] = mapped_column(JSON, default=dict)


class BookSection(Entity, Base):
    __tablename__ = "book_sections"
    course_id: Mapped[str] = mapped_column(ForeignKey("courses.id"))
    document_id: Mapped[str] = mapped_column(ForeignKey("documents.id"))
    title: Mapped[str] = mapped_column(String(300))
    level: Mapped[int] = mapped_column(Integer, default=1)
    start_page: Mapped[int] = mapped_column(Integer)
    end_page: Mapped[int] = mapped_column(Integer)
    source: Mapped[str] = mapped_column(String(20), default="MANUAL")


class TopicOutcome(Base):
    __tablename__ = "topic_outcomes"
    topic_id: Mapped[str] = mapped_column(ForeignKey("topics.id", ondelete="CASCADE"), primary_key=True)
    outcome_id: Mapped[str] = mapped_column(ForeignKey("learning_outcomes.id"), primary_key=True)


class TopicSection(Base):
    __tablename__ = "topic_sections"
    topic_id: Mapped[str] = mapped_column(ForeignKey("topics.id", ondelete="CASCADE"), primary_key=True)
    section_id: Mapped[str] = mapped_column(ForeignKey("book_sections.id"), primary_key=True)


class TopicDocument(Base):
    __tablename__ = "topic_documents"
    topic_id: Mapped[str] = mapped_column(ForeignKey("topics.id", ondelete="CASCADE"), primary_key=True)
    document_id: Mapped[str] = mapped_column(ForeignKey("documents.id"), primary_key=True)


class SystemSetting(Base):
    __tablename__ = "system_settings"
    key: Mapped[str] = mapped_column(String(80), primary_key=True)
    value: Mapped[dict] = mapped_column(JSON)


class ReviewJob(Entity, Base):
    __tablename__ = "review_jobs"
    attempt_id: Mapped[str] = mapped_column(ForeignKey("question_attempts.id"), index=True)
    requested_by: Mapped[str] = mapped_column(ForeignKey("users.id"))
    status: Mapped[str] = mapped_column(String(20), default="PENDING")
    reason: Mapped[str] = mapped_column(Text)
    policy: Mapped[dict] = mapped_column(JSON)
    original: Mapped[dict] = mapped_column(JSON)
    result: Mapped[dict | None] = mapped_column(JSON(none_as_null=True))
    error: Mapped[str | None] = mapped_column(Text)
    completed_at: Mapped[float | None] = mapped_column(Float)


# === Examiner Portal Models ===

class Semester(Entity, Base):
    __tablename__ = "semesters"
    name: Mapped[str] = mapped_column(String(100))  # "Spring 2026"
    year: Mapped[int] = mapped_column(Integer)
    term: Mapped[str] = mapped_column(String(20))   # SPRING, SUMMER, FALL
    status: Mapped[str] = mapped_column(String(20), default="DRAFT")  # DRAFT, ACTIVE, COMPLETED
    start_date: Mapped[float] = mapped_column(Float)  # Unix timestamp
    end_date: Mapped[float] = mapped_column(Float)    # Unix timestamp


class Section(Entity, Base):
    __tablename__ = "sections"
    course_id: Mapped[str] = mapped_column(ForeignKey("courses.id"))
    semester_id: Mapped[str | None] = mapped_column(ForeignKey("semesters.id"), nullable=True)
    name: Mapped[str] = mapped_column(String(200))     # "ENGO01 - Sáng T2"
    code: Mapped[str] = mapped_column(String(50))      # "ENGO01"
    teacher_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    day_of_week: Mapped[int] = mapped_column(Integer, default=0)  # 0=CN, 1=T2, ..., 6=T7
    time_slot: Mapped[str] = mapped_column(String(20), default="MORNING")  # MORNING, AFTERNOON, EVENING
    max_students: Mapped[int] = mapped_column(Integer, default=50)
    status: Mapped[str] = mapped_column(String(20), default="DRAFT")  # DRAFT, ACTIVE, ARCHIVED


class ScheduleSlot(Entity, Base):
    __tablename__ = "schedule_slots"
    exam_id: Mapped[str] = mapped_column(ForeignKey("exams.id"))
    batch_id: Mapped[str | None] = mapped_column(ForeignKey("exam_batches.id", ondelete="CASCADE"), nullable=True)
    slot_number: Mapped[int] = mapped_column(Integer)
    date: Mapped[str] = mapped_column(String(20))
    start_time: Mapped[str] = mapped_column(String(10))  # "08:00"
    end_time: Mapped[str] = mapped_column(String(10))    # "10:00"
    room: Mapped[str] = mapped_column(String(50))        # "A301"
    max_students: Mapped[int] = mapped_column(Integer)
    assigned_students_count: Mapped[int] = mapped_column(Integer, default=0)
    exam_variant_id: Mapped[str | None] = mapped_column(ForeignKey("exam_variants.id"))
    status: Mapped[str] = mapped_column(String(20), default="PENDING")  # PENDING, READY, IN_PROGRESS, COMPLETED
    grade_locked: Mapped[bool] = mapped_column(default=False)


class ExamVariant(Entity, Base):
    __tablename__ = "exam_variants"
    exam_id: Mapped[str] = mapped_column(ForeignKey("exams.id"))
    name: Mapped[str] = mapped_column(String(100))       # "Đề A"
    questions: Mapped[list] = mapped_column(JSON)        # Array of question objects
    created_by: Mapped[str] = mapped_column(ForeignKey("users.id"))
    status: Mapped[str] = mapped_column(String(20), default="CREATING")  # CREATING, READY, ASSIGNED


class ReEvaluation(Entity, Base):
    __tablename__ = "re_evaluations"
    attempt_id: Mapped[str] = mapped_column(ForeignKey("question_attempts.id"))
    teacher_id_1: Mapped[str] = mapped_column(ForeignKey("users.id"))  # Original grader
    teacher_id_2: Mapped[str] = mapped_column(ForeignKey("users.id"))  # Blind marker
    reason: Mapped[str] = mapped_column(String(50))      # RECONTROLL, GRADE_DISPUTE, EXAMINER_REQUEST
    reason_detail: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="PENDING")  # PENDING, IN_PROGRESS, COMPLETED
    score_1: Mapped[float | None] = mapped_column(Float)
    score_2: Mapped[float | None] = mapped_column(Float)
    final_score: Mapped[float | None] = mapped_column(Float)
    blind_marking: Mapped[bool] = mapped_column(default=True)
    completed_at: Mapped[float | None] = mapped_column(Float)


class ExamEnrollment(Entity, Base):
    __tablename__ = "exam_enrollments"
    __table_args__ = (UniqueConstraint("section_id", "student_id"),)
    section_id: Mapped[str] = mapped_column(ForeignKey("sections.id"))
    student_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE")  # PENDING, ACTIVE, DROPPED
    enrolled_at: Mapped[float] = mapped_column(Float, default=time.time)


class SlotAssignment(Entity, Base):
    __tablename__ = "slot_assignments"
    __table_args__ = (UniqueConstraint("slot_id", "student_id"),)
    slot_id: Mapped[str] = mapped_column(ForeignKey("schedule_slots.id"))
    student_id: Mapped[str] = mapped_column(ForeignKey("users.id"))


# === Examiner Candidate Pool Models ===

class MasterCourse(Entity, Base):
    __tablename__ = "master_courses"
    code: Mapped[str] = mapped_column(String(50), unique=True)
    name: Mapped[str] = mapped_column(String(200))
    department_code: Mapped[str] = mapped_column(String(20))
    credits: Mapped[int] = mapped_column(Integer, default=3)
    description: Mapped[str | None] = mapped_column(Text)


class CourseCandidate(Entity, Base):
    __tablename__ = "course_candidates"
    __table_args__ = (UniqueConstraint("course_id", "roll_number", name="uq_course_candidate_roll"),)
    course_id: Mapped[str] = mapped_column(ForeignKey("courses.id", ondelete="CASCADE"))
    student_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    roll_number: Mapped[str] = mapped_column(String(50))
    full_name: Mapped[str] = mapped_column(String(100))
    eligibility_status: Mapped[str] = mapped_column(String(20), default="ELIGIBLE")  # ELIGIBLE, DISQUALIFIED
    allocation_status: Mapped[str] = mapped_column(String(20), default="UNASSIGNED")  # UNASSIGNED, ASSIGNED
    assigned_slot_id: Mapped[str | None] = mapped_column(ForeignKey("schedule_slots.id", ondelete="SET NULL"))
    updated_at: Mapped[float] = mapped_column(Float, default=time.time)


class ExamBatch(Entity, Base):
    __tablename__ = "exam_batches"
    exam_id: Mapped[str] = mapped_column(ForeignKey("exams.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(100))
    date: Mapped[float] = mapped_column(Float)
    start_time: Mapped[str] = mapped_column(String(10))
    end_time: Mapped[str] = mapped_column(String(10))
    max_students_per_room: Mapped[int] = mapped_column(Integer, default=15)
    assigned_teacher_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    total_assigned: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(20), default="SCHEDULED")  # SCHEDULED, IN_PROGRESS, COMPLETED
    updated_at: Mapped[float] = mapped_column(Float, default=time.time)

