from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


# ==========================================
# 1. NGÂN HÀNG CÂU HỎI (QUESTION BANK SCHEMAS)
# ==========================================

class AcademicQuestionIn(BaseModel):
    code: str = Field(..., min_length=2, max_length=50, description="Mã định danh câu hỏi, ví dụ: RA-101")
    skill: str = Field(default="SPEAKING", description="Kỹ năng: SPEAKING, WRITING, READING, LISTENING")
    type: str = Field(..., description="Dạng câu hỏi: RA, RS, GD, DI, SI, RL")
    title: str = Field(..., min_length=2, max_length=250, description="Tiêu đề câu hỏi")
    prompt: str = Field(..., min_length=5, description="Nội dung câu hỏi hoặc đề bài")
    media_url: Optional[str] = Field(default=None, description="URL âm thanh/hình ảnh đề bài")
    audio_script: Optional[str] = Field(default=None, description="Transcript bài giảng/hội thoại")
    prep_time: int = Field(default=30, ge=0, le=300, description="Thời gian chuẩn bị (giây)")
    response_time: int = Field(default=40, ge=5, le=600, description="Thời gian trả lời (giây)")
    difficulty: str = Field(default="MEDIUM", description="Độ khó: EASY, MEDIUM, HARD")
    status: str = Field(default="APPROVED", description="Trạng thái: DRAFT, APPROVED, IN_USE, ARCHIVED")
    is_predicted: bool = Field(default=False, description="Đánh dấu câu hỏi dự đoán thi")
    tags: List[str] = Field(default_factory=list, description="Thẻ phân loại")
    sample_answer: Optional[str] = Field(default=None, description="Câu trả lời mẫu")
    key_points: List[str] = Field(default_factory=list, description="Các ý chính cần có")


class AcademicQuestionUpdate(BaseModel):
    code: Optional[str] = None
    skill: Optional[str] = None
    type: Optional[str] = None
    title: Optional[str] = None
    prompt: Optional[str] = None
    media_url: Optional[str] = None
    audio_script: Optional[str] = None
    prep_time: Optional[int] = None
    response_time: Optional[int] = None
    difficulty: Optional[str] = None
    status: Optional[str] = None
    is_predicted: Optional[bool] = None
    tags: Optional[List[str]] = None
    sample_answer: Optional[str] = None
    key_points: Optional[List[str]] = None


class AcademicQuestionOut(BaseModel):
    id: str
    code: str
    skill: str
    type: str
    title: str
    prompt: str
    media_url: Optional[str] = None
    audio_script: Optional[str] = None
    prep_time: int
    response_time: int
    difficulty: str
    status: str
    is_predicted: bool = False
    usage_count: int = 0
    tags: List[str] = []
    sample_answer: Optional[str] = None
    key_points: List[str] = []
    created_at: float
    updated_at: float


class AcademicQuestionsStatsOut(BaseModel):
    total: int
    by_type: Dict[str, int]
    by_difficulty: Dict[str, int]
    by_status: Dict[str, int]


# ==========================================
# 2. MA TRẬN ĐỀ THI (EXAM BLUEPRINT MATRIX SCHEMAS)
# ==========================================

class ExamMatrixRule(BaseModel):
    type: str = Field(..., description="Dạng bài: RA, RS, GD, DI, SI, RL")
    question_count: int = Field(..., ge=1, le=50, description="Số câu hỏi trong đề")
    prep_time: int = Field(default=30, ge=0, description="Thời gian chuẩn bị (giây)")
    response_time: int = Field(default=40, ge=5, description="Thời gian trả lời (giây)")
    target_difficulty: str = Field(default="MEDIUM", description="Độ khó mục tiêu")
    weight_percentage: float = Field(..., ge=0, le=100, description="Tỷ trọng điểm (%)")


class AcademicMatrixIn(BaseModel):
    code: str = Field(..., min_length=2, max_length=50, description="Mã ma trận đề thi")
    name: str = Field(..., min_length=2, max_length=200, description="Tên ma trận đề thi")
    description: Optional[str] = Field(default="", description="Mô tả cấu trúc đề")
    rubric_id: Optional[str] = Field(default=None, description="Khung Rubric áp dụng")
    rules: List[ExamMatrixRule] = Field(..., min_length=1, description="Danh sách quy tắc dạng bài")
    difficulty_ratio: Dict[str, Any] = Field(
        default_factory=lambda: {"easy": 40, "medium": 40, "hard": 20},
        description="Tỷ lệ phân bổ độ khó",
    )


class AcademicMatrixUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    rubric_id: Optional[str] = None
    rules: Optional[List[ExamMatrixRule]] = None
    difficulty_ratio: Optional[Dict[str, Any]] = None


class AcademicMatrixOut(BaseModel):
    id: str
    code: str
    name: str
    description: Optional[str] = ""
    rubric_id: Optional[str] = None
    rules: List[ExamMatrixRule] = []
    difficulty_ratio: Dict[str, Any] = {}
    created_at: float
    updated_at: float


class StockHealthItem(BaseModel):
    type: str
    required_count: int
    available_approved_count: int
    status: str  # HEALTHY, WARNING, CRITICAL
    deficit: int


class StockHealthOut(BaseModel):
    matrix_id: str
    is_ready_for_publishing: bool
    health_breakdown: List[StockHealthItem]


class SampleExamQuestionOut(BaseModel):
    sequence: int
    type: str
    code: str
    title: str
    prompt: str
    media_url: Optional[str] = None
    prep_time: int
    response_time: int
    difficulty: str


class GeneratedSampleExamOut(BaseModel):
    exam_sample_id: str
    matrix_id: str
    matrix_name: str
    total_questions: int
    total_duration_seconds: int
    questions: List[SampleExamQuestionOut]


# ==========================================
# 3. TIÊU CHUẨN RUBRICS (RUBRICS SCHEMAS)
# ==========================================

class RubricCriterion(BaseModel):
    id: Optional[str] = Field(default=None, description="Mã định danh tiêu chí")
    name: str = Field(..., min_length=1, description="Tên tiêu chí (Content, Pronunciation...)")
    max_score: float = Field(default=5.0, ge=1.0, description="Điểm tối đa của tiêu chí")
    weight: float = Field(..., ge=0.0, le=100.0, description="Trọng số (%)")
    description: Optional[str] = Field(default="", description="Mô tả tiêu chí")
    guiding_question: Optional[str] = Field(default=None, description="Câu hỏi định hướng chấm điểm")
    scoring_method: Optional[str] = Field(default=None, description="Phương pháp tính điểm")
    descriptors: Optional[Any] = Field(default=None, description="Mô tả các band điểm")


class RubricIn(BaseModel):
    name: str = Field(..., min_length=2, max_length=200, description="Tên bộ Rubric")
    description: Optional[str] = Field(default="", description="Mô tả khung đánh giá")
    course_id: Optional[str] = Field(default=None, description="Môn học liên kết (tùy chọn)")
    criteria: List[RubricCriterion] = Field(..., min_length=1, description="Danh sách các tiêu chí")


class RubricUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    course_id: Optional[str] = None
    criteria: Optional[List[RubricCriterion]] = None


class RubricOut(BaseModel):
    id: str
    name: str
    description: Optional[str] = ""
    course_id: Optional[str] = None
    criteria: List[RubricCriterion]
    version: int = 1
    created_at: float
    updated_at: float


# ==========================================
# 4. QUY CHUẨN DẠNG BÀI (QUESTION TYPE CONFIGS)
# ==========================================

class QuestionTypeConfigIn(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    vietnamese_name: Optional[str] = Field(default="")
    description: str = Field(default="")
    default_prep_time: int = Field(default=30, ge=0)
    default_response_time: int = Field(default=40, ge=5)
    audio_instruction_url: Optional[str] = None
    max_score: float = Field(default=10.0, ge=1.0)
    is_active: bool = Field(default=True)
    requires_image: bool = Field(default=False)
    requires_audio_prompt: bool = Field(default=False)
    requires_audio_script: bool = Field(default=False)
    requires_key_points: bool = Field(default=False)
    recommended_question_count: int = Field(default=2, ge=1, le=10)


class QuestionTypeCreateIn(QuestionTypeConfigIn):
    type: str = Field(..., min_length=2, max_length=10)


class QuestionTypeConfigOut(BaseModel):
    type: str
    name: str
    vietnamese_name: Optional[str] = ""
    description: str
    default_prep_time: int
    default_response_time: int
    audio_instruction_url: Optional[str] = None
    max_score: float
    is_active: bool = True
    requires_image: bool = False
    requires_audio_prompt: bool = False
    requires_audio_script: bool = False
    requires_key_points: bool = False
    recommended_question_count: int = 2
    question_count: int = 0
    created_at: float
    updated_at: float
