"""
Demo Seed Data for English Speaking Assessment
Tạo dữ liệu demo cho buổi presentation ngày mai
"""

# Demo exam configuration
DEMO_EXAM = {
    "name": "English Speaking Demo - Presentation",
    "course_name": "English 101",
    "course_code": "ENG101",
    "description": "Demo bài thi Speaking với AI chấm điểm tự động",
    "time_limit": 600,  # 10 minutes total
}

# Demo questions cho 2 Part
DEMO_QUESTIONS = {
    "part1": {
        "id": "demo-part1-001",
        "part_type": "FREE_RESPONSE",
        "sequence": 1,
        "text": "Tell me about your favorite hobby. Why do you enjoy it?",
        "topic": "Personal / Hobbies",
        "cefr_level": "B1",
        "expected_points": [
            "State the hobby clearly",
            "Explain why they enjoy it",
            "Give at least one specific detail",
        ],
        "key_terms": [],
        "time_prep": 30,
        "time_speak": 60,
    },
    "part2": {
        "id": "demo-part2-001",
        "part_type": "READ_ALOUD",
        "sequence": 2,
        "text": "The quick brown fox jumps over the lazy dog. "
                "This sentence contains every letter of the alphabet "
                "and is commonly used for typing practice.",
        "reference_text": "The quick brown fox jumps over the lazy dog. "
                         "This sentence contains every letter of the alphabet "
                         "and is commonly used for typing practice.",
        "topic": "Pangram",
        "cefr_level": "A2",
        "word_count": 26,
        "time_prep": 0,
        "time_speak": 30,
    },
}

# Sample student attempts for demo
DEMO_ATTEMPTS = [
    {
        "student_name": "Nguyễn Văn An",
        "student_id": "SV001",
        "part1": {
            "transcript": "My favorite hobby is playing guitar. I started learning when I was fifteen years old. I play every day because it helps me relax after school. Music makes me happy and helps me express my feelings. Sometimes I play with my friends at local cafe events.",
            "stt_confidence": 0.92,
            "score": 7.8,
            "fluency_metrics": {
                "speech_rate_wps": 2.1,
                "speech_rate_status": "OPTIMAL",
                "pause_count": 3,
                "pause_ratio_per_word": 0.08,
                "filled_pause_count": 1,
                "fluency_score": 85,
            },
            "lexical_metrics": {
                "total_words": 48,
                "unique_words": 35,
                "ttr": 0.73,
                "ttr_score": 95,
                "vocabulary_level": "RICH",
            },
            "criteria": [
                {"name": "Fluency", "score": 7.8, "max_score": 10, "weight": 0.30},
                {"name": "Vocabulary", "score": 8.2, "max_score": 10, "weight": 0.30},
                {"name": "Content", "score": 7.5, "max_score": 10, "weight": 0.40},
            ],
            "reasoning_summary": "Câu trả lời tốt. Tốc độ nói ổn định (2.1 wps). Vốn từ phong phú với TTR cao (0.73). Đề cập đủ 3 ý: hobby là gì, tại sao thích, chi tiết cụ thể.",
        },
        "part2": {
            "transcript": "the quick brown fox jumps over the lazy dog this sentence contains every letter of the alphabet and is commonly used for typing practice",
            "stt_confidence": 0.95,
            "score": 8.5,
            "wer": 0.03,
            "wer_percentage": 3.2,
            "pronunciation_grade": "EXCELLENT",
            "fluency_metrics": {
                "speech_rate_wps": 2.3,
                "speech_rate_status": "OPTIMAL",
                "pause_count": 2,
                "pause_ratio_per_word": 0.05,
                "filled_pause_count": 0,
                "fluency_score": 92,
            },
            "criteria": [
                {"name": "Pronunciation Accuracy", "score": 8.8, "max_score": 10, "weight": 0.60},
                {"name": "Fluency", "score": 8.2, "max_score": 10, "weight": 0.40},
            ],
            "reasoning_summary": "Phát âm xuất sắc! WER chỉ 3.2% - gần như hoàn hảo. Tốc độ đọc đều và tự nhiên.",
        },
    },
    {
        "student_name": "Trần Thị Bình",
        "student_id": "SV002",
        "part1": {
            "transcript": "I like reading books. My favorite is Harry Potter. It is very interesting story. I read every night before sleeping. The books are exciting and teach me many things about friendship and bravery.",
            "stt_confidence": 0.88,
            "score": 6.5,
            "fluency_metrics": {
                "speech_rate_wps": 1.7,
                "speech_rate_status": "SLOW",
                "pause_count": 5,
                "pause_ratio_per_word": 0.14,
                "filled_pause_count": 2,
                "fluency_score": 68,
            },
            "lexical_metrics": {
                "total_words": 38,
                "unique_words": 24,
                "ttr": 0.63,
                "ttr_score": 82,
                "vocabulary_level": "GOOD",
            },
            "criteria": [
                {"name": "Fluency", "score": 6.2, "max_score": 10, "weight": 0.30},
                {"name": "Vocabulary", "score": 7.0, "max_score": 10, "weight": 0.30},
                {"name": "Content", "score": 6.2, "max_score": 10, "weight": 0.40},
            ],
            "reasoning_summary": "Câu trả lời khá tốt nhưng tốc độ hơi chậm (1.7 wps). Vốn từ tốt. Nên cải thiện tốc độ nói và giảm các khoảng dừng.",
        },
        "part2": {
            "transcript": "the quick brown fox jumps over the lazy dog this sentence contains every letter",
            "stt_confidence": 0.90,
            "score": 7.2,
            "wer": 0.15,
            "wer_percentage": 15.0,
            "pronunciation_grade": "GOOD",
            "fluency_metrics": {
                "speech_rate_wps": 1.9,
                "speech_rate_status": "SLOW",
                "pause_count": 4,
                "pause_ratio_per_word": 0.11,
                "filled_pause_count": 1,
                "fluency_score": 72,
            },
            "criteria": [
                {"name": "Pronunciation Accuracy", "score": 7.0, "max_score": 10, "weight": 0.60},
                {"name": "Fluency", "score": 7.2, "max_score": 10, "weight": 0.40},
            ],
            "reasoning_summary": "Đọc khá tốt với WER 15%. Cần cải thiện tốc độ và phát âm một số từ cuối câu.",
        },
    },
    {
        "student_name": "Lê Minh Cường",
        "student_id": "SV003",
        "part1": {
            "transcript": "My hobby is playing video games. I like games because they are fun and help me relax. I play games every weekend with my friends online. Games teach me strategy and quick thinking.",
            "stt_confidence": 0.85,
            "score": 5.8,
            "fluency_metrics": {
                "speech_rate_wps": 1.4,
                "speech_rate_status": "TOO_SLOW",
                "pause_count": 7,
                "pause_ratio_per_word": 0.20,
                "filled_pause_count": 3,
                "fluency_score": 55,
            },
            "lexical_metrics": {
                "total_words": 35,
                "unique_words": 20,
                "ttr": 0.57,
                "ttr_score": 75,
                "vocabulary_level": "AVERAGE",
            },
            "criteria": [
                {"name": "Fluency", "score": 5.5, "max_score": 10, "weight": 0.30},
                {"name": "Vocabulary", "score": 5.8, "max_score": 10, "weight": 0.30},
                {"name": "Content", "score": 6.0, "max_score": 10, "weight": 0.40},
            ],
            "reasoning_summary": "Câu trả lời đủ ý nhưng tốc độ quá chậm (1.4 wps). Có nhiều khoảng dừng và từ đệm. Cần luyện tập nói nhanh hơn và mạch lạc hơn.",
        },
        "part2": {
            "transcript": "the quick brown fox jumps over the lazy dog",
            "stt_confidence": 0.82,
            "score": 6.0,
            "wer": 0.35,
            "wer_percentage": 35.0,
            "pronunciation_grade": "FAIR",
            "fluency_metrics": {
                "speech_rate_wps": 1.2,
                "speech_rate_status": "TOO_SLOW",
                "pause_count": 3,
                "pause_ratio_per_word": 0.15,
                "filled_pause_count": 2,
                "fluency_score": 58,
            },
            "criteria": [
                {"name": "Pronunciation Accuracy", "score": 5.5, "max_score": 10, "weight": 0.60},
                {"name": "Fluency", "score": 6.5, "max_score": 10, "weight": 0.40},
            ],
            "reasoning_summary": "Đọc ngắn hơn đoạn gốc và có WER cao (35%). Cần luyện phát âm đầy đủ các từ cuối câu và tăng tốc độ đọc.",
        },
    },
]

# Summary for demo display
DEMO_SUMMARY = {
    "total_students": 3,
    "average_score": 6.9,
    "score_range": {"min": 5.8, "max": 8.5},
    "fluency_stats": {
        "optimal": 1,
        "slow": 1,
        "too_slow": 1,
    },
    "pronunciation_stats": {
        "excellent": 1,
        "good": 1,
        "fair": 1,
    },
}


def get_demo_question(part: int) -> dict:
    """Get demo question by part number"""
    if part == 1:
        return DEMO_QUESTIONS["part1"]
    elif part == 2:
        return DEMO_QUESTIONS["part2"]
    return DEMO_QUESTIONS["part1"]


def get_demo_attempts() -> list:
    """Get all demo student attempts"""
    return DEMO_ATTEMPTS


def get_demo_attempt_by_student_id(student_id: str) -> dict | None:
    """Get demo attempt by student ID"""
    for attempt in DEMO_ATTEMPTS:
        if attempt["student_id"] == student_id:
            return attempt
    return None
