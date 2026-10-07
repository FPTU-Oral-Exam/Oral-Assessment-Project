from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class Login(Input):
    username: str = Field(min_length=1, max_length=80)
    password: str = Field(min_length=1, max_length=128)


class UserIn(Login):
    password: str = Field(min_length=12, max_length=128)
    name: str = Field(min_length=1, max_length=150)
    role: Literal["SYSTEM_ADMIN", "ACADEMY", "EXAMINER", "TEACHER", "STUDENT", "ADMIN", "REVIEWER"] = "STUDENT"


class CourseIn(Input):
    code: str = Field(min_length=1, max_length=50)
    name: str = Field(min_length=1, max_length=200)
    description: str = Field(default="", max_length=10000)


class CourseDeleteIn(Input):
    confirm_code: str = Field(min_length=1, max_length=50)


class LOIn(Input):
    code: str = Field(min_length=1, max_length=50)
    description: str = Field(min_length=1, max_length=3000)
    weight: float = Field(default=1, gt=0, le=100)


class TopicIn(Input):
    learning_outcome_id: str | None = None
    learning_outcome_ids: list[str] = Field(default_factory=list, max_length=100)
    chapter_ids: list[str] = Field(default_factory=list, max_length=500)
    document_ids: list[str] = Field(default_factory=list, max_length=100)
    name: str = Field(min_length=1, max_length=200)
    description: str = Field(default="", max_length=3000)

    @model_validator(mode="after")
    def mappings(self):
        if not self.learning_outcome_ids and self.learning_outcome_id:
            self.learning_outcome_ids = [self.learning_outcome_id]
        if not self.learning_outcome_ids:
            raise ValueError("Chọn ít nhất một LO")
        return self


class BookSectionIn(Input):
    title: str = Field(min_length=1, max_length=300)
    level: int = Field(default=1, ge=1, le=6)
    start_page: int = Field(ge=1)
    end_page: int = Field(ge=1)

    @model_validator(mode="after")
    def page_range(self):
        if self.end_page < self.start_page:
            raise ValueError("Trang kết thúc phải từ trang bắt đầu trở đi")
        return self


# === Examiner Portal Schemas ===

class SemesterIn(Input):
    name: str = Field(min_length=1, max_length=100)
    year: int = Field(ge=2020, le=2100)
    term: Literal["SPRING", "SUMMER", "FALL"]
    start_date: float = Field(gt=0)
    end_date: float = Field(gt=0)

    @model_validator(mode="after")
    def validate_dates(self):
        if self.end_date <= self.start_date:
            raise ValueError("Ngày kết thúc phải sau ngày bắt đầu")
        return self


class SectionIn(Input):
    name: str = Field(min_length=1, max_length=200)
    code: str = Field(min_length=1, max_length=50)
    teacher_id: str | None = Field(default=None)
    day_of_week: int = Field(ge=0, le=6)
    time_slot: Literal["MORNING", "AFTERNOON", "EVENING"] = "MORNING"
    max_students: int = Field(default=50, ge=1, le=500)


class SectionUpdateIn(Input):
    name: str | None = Field(default=None, max_length=200)
    code: str | None = Field(default=None, max_length=50)
    teacher_id: str | None = Field(default=None)
    day_of_week: int | None = Field(default=None, ge=0, le=6)
    time_slot: Literal["MORNING", "AFTERNOON", "EVENING"] | None = None
    max_students: int | None = Field(default=None, ge=1, le=500)


class CourseIn(Input):
    name: str = Field(min_length=1, max_length=200)
    code: str = Field(min_length=1, max_length=50)
    description: str = Field(default="", max_length=1000)
    credits: int = Field(default=3, ge=1, le=10)
    teacher_id: str | None = Field(default=None)


class CourseUpdateIn(Input):
    name: str | None = Field(default=None, max_length=200)
    code: str | None = Field(default=None, max_length=50)
    description: str | None = Field(default=None, max_length=1000)
    credits: int | None = Field(default=None, ge=1, le=10)
    teacher_id: str | None = Field(default=None)


class SlotIn(Input):
    slot_number: int = Field(ge=1)
    date: float = Field(gt=0)
    start_time: str = Field(min_length=1, max_length=10)
    end_time: str = Field(min_length=1, max_length=10)
    room: str = Field(min_length=1, max_length=50)
    max_students: int = Field(ge=1)


class CreateSlotsIn(Input):
    slots: list[SlotIn] = Field(min_length=1, max_length=50)


class QuestionItem(Input):
    sequence: int = Field(ge=1)
    text: str = Field(min_length=10, max_length=4000)
    topic: str = Field(min_length=1, max_length=200)
    difficulty: Literal["EASY", "MEDIUM", "HARD"]


class ExamVariantIn(Input):
    name: str = Field(min_length=1, max_length=100)
    questions: list[QuestionItem] = Field(min_length=1, max_length=50)


class ReEvaluationIn(Input):
    teacher_id_2: str
    reason: Literal["RECONTROLL", "GRADE_DISPUTE", "EXAMINER_REQUEST"]
    reason_detail: str | None = Field(default=None, min_length=5, max_length=2000)
    blind_marking: bool = True


class CriterionScoreIn(Input):
    name: str = Field(min_length=1, max_length=100)
    score: float = Field(ge=0, le=100)
    feedback: str | None = None


class ScoreOverrideIn(Input):
    score: float = Field(ge=0, le=10)
    reason: str = Field(min_length=3, max_length=2000)
    criteria: list[CriterionScoreIn] | None = None


class RegradeTranscriptIn(Input):
    corrected_transcript: str = Field(min_length=1, max_length=10000)
    reason: str = Field(min_length=3, max_length=2000)


class ReEvaluationSubmitIn(Input):
    score_2: float = Field(ge=0, le=10)
    feedback: str | None = Field(default=None, max_length=2000)


class ExaminerExamIn(Input):
    """Simplified Exam schema for Examiner Portal (1 exam per course)."""
    name: str = Field(min_length=1, max_length=200)
    description: str = Field(default="", max_length=2000)
    time_limit: int = Field(default=30, ge=5, le=180)  # minutes
    question_count: int = Field(default=3, ge=1, le=10)
    rubric_id: str | None = Field(default=None)  # Optional for MVP


class EnrollmentImportIn(Input):
    course_id: str
    file_data: str


class SpeechPolicy(Input):
    provider: Literal["local", "google", "gemini", "local_server"] = "local_server"
    preprocessing: Literal["off", "denoise"] = "denoise"
    language: Literal["vi", "en"] = "vi"


class ReviewIn(Input):
    reason: str = Field(min_length=5, max_length=2000)


class GradeReviewIn(ReviewIn):
    target_exam_id: str


class Criterion(Input):
    name: str = Field(min_length=1, max_length=100)
    description: str = Field(min_length=1, max_length=3000)
    max_score: float = Field(gt=0, le=100)
    weight: float = Field(default=1, gt=0, le=100)


class RubricIn(Input):
    name: str = Field(min_length=1, max_length=200)
    criteria: list[Criterion] = Field(min_length=1, max_length=20)

    @model_validator(mode="after")
    def unique_names(self):
        if len({c.name for c in self.criteria}) != len(self.criteria):
            raise ValueError("Tên tiêu chí phải duy nhất")
        return self


class Blueprint(Input):
    topic_id: str
    difficulty: Literal["EASY", "MEDIUM", "HARD"]
    count: int = Field(ge=1, le=20)


class ExamIn(Input):
    course_id: str
    rubric_id: str
    name: str = Field(min_length=1, max_length=200)
    description: str = Field(default="", max_length=2000)
    time_limit: int = Field(ge=60, le=10800)
    question_count: int = Field(default=3, ge=1, le=10)
    blueprint: list[Blueprint] = Field(min_length=1, max_length=20)
    max_attempts: int | None = Field(default=1, ge=1, le=1001)

    @model_validator(mode="after")
    def limit_questions(self):
        if sum(row.count for row in self.blueprint) > 20:
            raise ValueError("MVP giới hạn 20 câu mỗi bài")
        return self


class AssignIn(Input):
    student_ids: list[str] = Field(min_length=1, max_length=500)


class SessionIn(Input):
    exam_id: str
    new_attempt: bool = False


class AttemptPolicyIn(Input):
    max_attempts: int | None = Field(ge=1, le=1001)


class RetakeIn(Input):
    additional_attempts: int = Field(default=1, ge=1, le=1000)


class TranscriptIn(Input):
    transcript: str = Field(min_length=1, max_length=30000)
    stt_confidence: float = Field(ge=0, le=1)


class SubmitAudioIn(Input):
    upload_id: str
    kind: Literal["AUDIO", "VIDEO"] = "AUDIO"


class UploadIn(Input):
    attempt_id: str
    kind: Literal["AUDIO", "VIDEO"]
    mime_type: str = Field(min_length=3, max_length=100)
    size: int = Field(gt=0)
    sha256: str = Field(pattern=r"^[a-f0-9]{64}$")

    @field_validator("mime_type")
    @classmethod
    def clean_mime(cls, v: str) -> str:
        base = v.split(";")[0].strip()
        allowed = {"audio/webm", "video/webm", "audio/mp4", "video/mp4", "audio/ogg"}
        if base not in allowed:
            raise ValueError(f"MIME type {base} không được hỗ trợ")
        return base


class EnglishTerm(Input):
    term: str = Field(min_length=1, max_length=100, pattern=r"[A-Za-z]")
    meaning: str = Field(min_length=1, max_length=300)


class QuestionOutput(Input):
    text: str = Field(min_length=10, max_length=4000)
    expected_concepts: list[str] = Field(min_length=1, max_length=30)
    reference_chunk_ids: list[str] = Field(min_length=1, max_length=20)
    english_terms: list[EnglishTerm] = Field(max_length=20)

    @model_validator(mode="after")
    def unique_terms(self):
        seen = set()
        terms = []
        for term in self.english_terms:
            key = term.term.casefold()
            if key not in seen:
                terms.append(term)
                seen.add(key)
        self.english_terms = terms
        return self


class GradeCriterion(Input):
    model_config = ConfigDict(extra="ignore", str_strip_whitespace=True)
    name: str
    score: float = Field(ge=0, le=100)
    comment: str = Field(default="", max_length=2000)


class GradeOutput(Input):
    model_config = ConfigDict(extra="ignore", str_strip_whitespace=True)
    confidence: float = Field(default=0.8, ge=0, le=1)
    criteria: list[GradeCriterion]
    missing_concepts: list[str] = Field(default_factory=list)
    reasoning_summary: str = Field(default="", max_length=3000)
    reference_chunk_ids: list[str] = Field(min_length=1)

    @field_validator("confidence", mode="before")
    @classmethod
    def normalize_confidence(cls, v):
        if isinstance(v, (int, float)):
            if v > 10:
                v = v / 100.0
            elif v > 1:
                v = v / 5.0
            return min(1.0, max(0.0, float(v)))
        return v


class RoleIn(Input):
    role: Literal["SYSTEM_ADMIN", "EXAMINER", "TEACHER", "STUDENT", "ADMIN", "REVIEWER"]


class QuestionBankItemIn(Input):
    topic_id: str
    learning_outcome_id: str | None = None
    difficulty: Literal["EASY", "MEDIUM", "HARD"] = "MEDIUM"
    prompt: str = Field(min_length=5, max_length=5000)
    expected_points: list[str] = Field(default_factory=list)
    key_terms: list[str] = Field(default_factory=list)
    status: Literal["DRAFT", "APPROVED"] = "APPROVED"


class QuestionBankItemImportIn(Input):
    items: list[QuestionBankItemIn]
