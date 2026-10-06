"""Pydantic schemas for Examiner Exam Management API."""
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List


# === Master Course ===

class MasterCourseOut(BaseModel):
    id: str
    code: str
    name: str
    department_code: str
    credits: int
    description: Optional[str] = None


# === Semester ===

class SemesterCreateIn(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    year: int = Field(..., ge=2020, le=2100)
    term: str = Field(..., pattern="^(SPRING|SUMMER|FALL)$")
    start_date: float
    end_date: float

    @field_validator('end_date')
    @classmethod
    def end_after_start(cls, v, info):
        if 'start_date' in info.data and v <= info.data['start_date']:
            raise ValueError('end_date must be after start_date')
        return v


class SemesterOut(BaseModel):
    id: str
    name: str
    year: int
    term: str
    status: str
    start_date: float
    end_date: float
    course_count: int = 0


class SemesterDetailOut(SemesterOut):
    courses: List[dict] = []
    total_candidates: int = 0
    total_batches: int = 0


# === Course ===

class CourseAddIn(BaseModel):
    """Add course to semester - either from master catalog or manual entry."""
    master_course_id: Optional[str] = None
    department_code: Optional[str] = None
    code: Optional[str] = None
    name: Optional[str] = None
    credits: int = 3
    description: Optional[str] = None
    teacher_id: Optional[str] = None


class CourseDetailOut(BaseModel):
    id: str
    name: str
    code: str
    description: Optional[str] = None
    credits: int
    department_code: Optional[str] = None
    status: str
    stats: dict


# === Candidate Pool ===

class CandidateImportOut(BaseModel):
    total_rows: int
    imported: int
    skipped: int
    errors: List[str] = []


class CandidateOut(BaseModel):
    id: str
    roll_number: str
    full_name: str
    eligibility_status: str
    allocation_status: str
    slot_room: Optional[str] = None
    batch_name: Optional[str] = None


# === Exam ===

class ExamCreateIn(BaseModel):
    name: str = Field(..., min_length=1)
    exam_type: str = Field(default='FINAL', pattern="^(FINAL|MIDTERM|RESIT)$")
    time_limit: int = Field(..., ge=5, le=180)
    question_count: int = Field(..., ge=1, le=10)


class ExamOut(BaseModel):
    id: str
    name: str
    exam_type: str
    time_limit: int
    question_count: int
    batch_count: int = 0


# === Batch (Exam Session) ===

class BatchCreateIn(BaseModel):
    name: str = Field(..., min_length=1)
    date: float
    start_time: str = Field(..., pattern=r"^\d{2}:\d{2}$")
    end_time: str = Field(..., pattern=r"^\d{2}:\d{2}$")
    rooms: List[str] = Field(..., min_length=1)
    max_students_per_room: int = Field(default=15, ge=1, le=50)
    assigned_teacher_id: str


class RoomAllocation(BaseModel):
    room: str
    assigned_count: int


class BatchOut(BaseModel):
    batch_id: str
    name: str
    date: float
    start_time: str
    end_time: str
    assigned_teacher_id: str
    total_assigned: int
    status: str
    rooms: List[RoomAllocation]
    remaining_unassigned: int


class BatchStudentOut(BaseModel):
    roll_number: str
    full_name: str
    room: str
    eligibility_status: str
