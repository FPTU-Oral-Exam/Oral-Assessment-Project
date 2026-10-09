"""
Grading Types Module
Định nghĩa các loại part trong bài thi Speaking
"""

from enum import Enum
from dataclasses import dataclass
from typing import Optional


class PartType(str, Enum):
    """Các loại part trong bài thi"""
    FREE_RESPONSE = "FREE_RESPONSE"      # Part 1: Trả lời tự do
    READ_ALOUD = "READ_ALOUD"          # Part 2: Đọc to
    TOPIC_DESCRIPTION = "TOPIC_DESCRIPTION"  # Part 3: Mô tả chủ đề (future)
    SITUATIONAL = "SITUATIONAL"        # Part 4: Đóng vai tình huống (future)
    SOCRATIC = "SOCRATIC"             # Part 5: Vấn đáp Socratic (future)


@dataclass
class PartConfig:
    """Cấu hình cho từng loại part"""
    part_type: PartType
    name: str
    description: str
    time_prep_seconds: int
    time_speak_seconds: int
    rubric_weights: dict
    has_reference_text: bool  # Part 2 có reference text
    has_socratic_followup: bool  # Part 5 có câu hỏi phụ

    def to_dict(self) -> dict:
        return {
            "part_type": self.part_type.value,
            "name": self.name,
            "description": self.description,
            "time_prep": self.time_prep_seconds,
            "time_speak": self.time_speak_seconds,
            "rubric_weights": self.rubric_weights,
        }


# Cấu hình DEMO - 2 Part đơn giản
DEMO_PART_1 = PartConfig(
    part_type=PartType.FREE_RESPONSE,
    name="Part 1: Free Response",
    description="Answer the question about a familiar topic",
    time_prep_seconds=30,
    time_speak_seconds=60,
    rubric_weights={
        "fluency": 0.30,
        "vocabulary": 0.30,
        "content": 0.40,
    },
    has_reference_text=False,
    has_socratic_followup=False,
)

DEMO_PART_2 = PartConfig(
    part_type=PartType.READ_ALOUD,
    name="Part 2: Read Aloud",
    description="Read the passage aloud clearly and naturally",
    time_prep_seconds=0,
    time_speak_seconds=30,
    rubric_weights={
        "wer": 0.60,      # 60% WER score
        "fluency": 0.40,  # 40% Fluency
    },
    has_reference_text=True,  # Có reference text để so sánh
    has_socratic_followup=False,
)


# Demo exam structure
DEMO_EXAM_CONFIG = {
    "id": "demo-speaking-001",
    "name": "English Speaking Assessment - Demo",
    "total_parts": 2,
    "parts": [
        DEMO_PART_1.to_dict(),
        DEMO_PART_2.to_dict(),
    ],
    "grading": {
        "auto_score_weight": 0.7,  # 70% AI score
        "human_review_required": True,
    }
}


# Sample questions cho demo
DEMO_QUESTIONS = {
    PartType.FREE_RESPONSE: {
        "id": "demo-q1",
        "part_type": PartType.FREE_RESPONSE.value,
        "text": "Tell me about your favorite hobby. Why do you enjoy it?",
        "topic": "Personal / Hobbies",
        "cefr_level": "B1",
        "expected_points": [
            "State the hobby clearly",
            "Explain why they enjoy it",
            "Give at least one specific detail",
        ],
        "key_terms": [],
        "hints": [
            "What is your hobby?",
            "Why do you like it?",
            "How often do you do it?",
        ],
    },
    PartType.READ_ALOUD: {
        "id": "demo-q2",
        "part_type": PartType.READ_ALOUD.value,
        "text": "The quick brown fox jumps over the lazy dog. "
                 "This sentence contains every letter of the alphabet "
                 "and is commonly used for typing practice.",
        "reference_text": "The quick brown fox jumps over the lazy dog. "
                          "This sentence contains every letter of the alphabet "
                          "and is commonly used for typing practice.",
        "topic": "Pangram",
        "cefr_level": "A2",
        "word_count": 26,
    },
}


def get_part_type_from_question(question: dict) -> PartType:
    """
    Lấy part type từ question object

    Args:
        question: Question dict từ database

    Returns:
        PartType enum value
    """
    if isinstance(question, dict):
        part_type_str = question.get("part_type", "")
        if part_type_str == PartType.READ_ALOUD.value:
            return PartType.READ_ALOUD
        elif part_type_str == PartType.FREE_RESPONSE.value:
            return PartType.FREE_RESPONSE
        elif part_type_str == PartType.TOPIC_DESCRIPTION.value:
            return PartType.TOPIC_DESCRIPTION
        elif part_type_str == PartType.SITUATIONAL.value:
            return PartType.SITUATIONAL
        elif part_type_str == PartType.SOCRATIC.value:
            return PartType.SOCRATIC

        # Fallback: check if has reference_text
        if question.get("reference_text"):
            return PartType.READ_ALOUD

        # Default to FREE_RESPONSE
        return PartType.FREE_RESPONSE

    return PartType.FREE_RESPONSE


def get_rubric_for_part_type(part_type: PartType) -> list[dict]:
    """
    Lấy rubric criteria cho từng part type

    Returns:
        List of criteria dicts
    """
    if part_type == PartType.READ_ALOUD:
        return [
            {
                "name": "Pronunciation Accuracy",
                "max_score": 10,
                "weight": 0.60,
                "description": "Word Error Rate (WER) - how accurately the text was read"
            },
            {
                "name": "Fluency",
                "max_score": 10,
                "weight": 0.40,
                "description": "Speech rate and natural flow"
            },
        ]
    else:
        # FREE_RESPONSE và các part khác
        return [
            {
                "name": "Fluency",
                "max_score": 10,
                "weight": 0.30,
                "description": "Speech rate, pauses, and natural flow"
            },
            {
                "name": "Vocabulary",
                "max_score": 10,
                "weight": 0.30,
                "description": "Lexical diversity and accuracy"
            },
            {
                "name": "Content",
                "max_score": 10,
                "weight": 0.40,
                "description": "Relevance, completeness, and depth of response"
            },
        ]


def get_part_config(part_type: PartType) -> PartConfig:
    """Lấy cấu hình cho part type"""
    configs = {
        PartType.FREE_RESPONSE: DEMO_PART_1,
        PartType.READ_ALOUD: DEMO_PART_2,
    }
    return configs.get(part_type, DEMO_PART_1)
