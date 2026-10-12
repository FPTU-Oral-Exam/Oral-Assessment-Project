"""
PTE Academic - Part 5: Answer Short Question (ASQ) Evaluation Engine
=====================================================================

Standardized Pearson PTE scoring for Answer Short Question (1-3 words response):
1. Content / Vocabulary (0 or 1 point):
   - 1/1: Appropriate word choice in response.
   - 0/1: Inappropriate or incorrect word choice in response.

2. Oral Fluency (0 - 5):
   - 5/5: Immediate, smooth response with natural delivery (no hesitations).
   - 4/5: Continuous response with minimal latency.
   - 3/5: Acceptable response but with slight delay or hesitation.
   - 2/5: Hesitant response with filled pauses ('um', 'uh') or false starts.
   - 1/5: Long pause before answering or labored utterance.
   - 0/5: No speech detected.

3. Pronunciation (0 - 5):
   - 5/5: Native-like phonetic clarity on target word.
   - 4/5: Target word easily intelligible with clear vowels/consonants.
   - 3/5: Minor distortion on target word, but still recognizable.
   - 2/5: Noticeable distortion requiring listener adjustment.
   - 1/5: Severe distortion or unintelligible pronunciation.
   - 0/5: No speech detected.

Total Points: 11 (Content 1 + Fluency 5 + Pronunciation 5)
Scaled PTE Score: 10 - 90
"""

import re
from typing import Dict, List, Any, Optional

DEFAULT_ASQ_QUESTION = "A specialist who repairs leaking water pipes is called as?"
DEFAULT_ASQ_TARGETS = ["plumber", "a plumber", "the plumber"]


def clean_text(text: str) -> str:
    """Normalize text for case- and punctuation-insensitive comparison."""
    if not text:
        return ""
    return re.sub(r'[^a-zA-Z0-9\s]', '', text).lower().strip()


def strip_articles(text: str) -> str:
    """Remove leading indefinite/definite articles ('a', 'an', 'the')."""
    cleaned = clean_text(text)
    tokens = cleaned.split()
    if tokens and tokens[0] in ["a", "an", "the"]:
        return " ".join(tokens[1:])
    return cleaned


def check_answer_correctness(student_transcript: str, target_answers: List[str]) -> bool:
    """
    Check if the student's transcript matches any of the acceptable target answers.
    Handles exact match, stripped-article match, and token containment.
    """
    student_clean = clean_text(student_transcript)
    student_bare = strip_articles(student_transcript)

    if not student_clean:
        return False

    student_words = set(student_clean.split())

    for target in target_answers:
        target_clean = clean_text(target)
        target_bare = strip_articles(target)

        # 1. Exact or stripped match
        if student_clean == target_clean or student_bare == target_bare:
            return True

        # 2. Substring match (e.g. "he is a plumber" -> contains "plumber")
        if target_clean and target_clean in student_clean:
            return True
        if target_bare and target_bare in student_clean:
            return True

        # 3. Single-word target contained in student words
        if " " not in target_bare and target_bare in student_words:
            return True

    return False


def score_asq_content(is_correct: bool, target_answers: List[str]) -> Dict[str, Any]:
    """Score Content / Vocabulary on Pearson 0-1 scale."""
    if is_correct:
        return {
            "score": 1,
            "max_score": 1,
            "comment": "Appropriate word choice in response.",
            "is_correct": True
        }
    return {
        "score": 0,
        "max_score": 1,
        "comment": f"Inappropriate or incorrect word choice. Target: {target_answers[0] if target_answers else 'N/A'}",
        "is_correct": False
    }


def score_asq_fluency(
    duration_seconds: float,
    student_transcript: str
) -> Dict[str, Any]:
    """Score Oral Fluency on 0-5 scale based on response latency and hesitations."""
    text_lower = student_transcript.lower()
    has_hesitation = bool(re.search(r'\b(um|uh|er|ah|erm)\b', text_lower))

    if not student_transcript.strip():
        score = 0
        comment = "No speech detected."
    elif has_hesitation:
        score = 2
        comment = "Hesitant response with filled pauses or false starts."
    elif duration_seconds <= 3.0:
        score = 5
        comment = "Immediate, smooth response with natural delivery."
    elif duration_seconds <= 4.5:
        score = 4
        comment = "Continuous response with minimal latency."
    elif duration_seconds <= 7.0:
        score = 3
        comment = "Acceptable response but with slight delay before answering."
    else:
        score = 1
        comment = "Long pause before answering or labored utterance."

    return {
        "score": score,
        "max_score": 5,
        "duration_seconds": round(duration_seconds, 2),
        "comment": comment
    }


def score_asq_pronunciation(
    stt_confidence: float = 0.85,
    is_correct: bool = True
) -> Dict[str, Any]:
    """Score Pronunciation on 0-5 scale based on acoustic clarity of response."""
    conf = max(0.0, min(1.0, stt_confidence))

    if not is_correct and conf < 0.60:
        score = 1
        comment = "Target word unclear or unintelligible."
    elif conf >= 0.90:
        score = 5
        comment = "Native-like phonetic clarity on target word."
    elif conf >= 0.80:
        score = 4
        comment = "Target word easily intelligible with clear vowels and consonants."
    elif conf >= 0.65:
        score = 3
        comment = "Minor distortion on target word, but still recognizable."
    elif conf >= 0.45:
        score = 2
        comment = "Noticeable distortion requiring listener adjustment."
    else:
        score = 1
        comment = "Severe distortion or unintelligible pronunciation."

    return {
        "score": score,
        "max_score": 5,
        "stt_confidence": round(stt_confidence, 2),
        "comment": comment
    }


def evaluate_pte_asq(
    student_transcript: str,
    target_answers: Optional[List[str]] = None,
    question_prompt: Optional[str] = None,
    duration_seconds: Optional[float] = None,
    segments: Optional[List[Dict[str, Any]]] = None,
    stt_confidence: float = 0.85,
    student_audio_url: Optional[str] = None
) -> Dict[str, Any]:
    """Complete evaluation function for PTE Part 5: Answer Short Question."""
    effective_targets = target_answers if (target_answers and len(target_answers) > 0) else DEFAULT_ASQ_TARGETS
    effective_question = question_prompt or DEFAULT_ASQ_QUESTION
    effective_duration = duration_seconds or 2.0

    # 1. Check correctness
    is_correct = check_answer_correctness(student_transcript, effective_targets)

    # 2. Token tagging (Green for correct, Red for incorrect)
    words = student_transcript.strip().split()
    student_tokens = [
        {
            "word": w,
            "is_correct": is_correct,
            "status": "correct" if is_correct else "incorrect"
        }
        for w in words
    ]

    # 3. Component Scoring
    content_res = score_asq_content(is_correct, effective_targets)
    fluency_res = score_asq_fluency(effective_duration, student_transcript)
    pronun_res = score_asq_pronunciation(stt_confidence, is_correct)

    # 4. Overall points (Max 11: Content 1 + Fluency 5 + Pronun 5)
    total_pts = content_res["score"] + fluency_res["score"] + pronun_res["score"]
    max_pts = 11
    score_10 = round((total_pts / max_pts) * 10.0, 1)
    score_90 = round(10.0 + (total_pts / max_pts) * 80.0, 1)
    score_100 = round((total_pts / max_pts) * 100.0, 1)

    return {
        "part_type": "PTE_ANSWER_SHORT_QUESTION",
        "transcript": student_transcript,
        "reference_text": effective_question,
        "sample_answer": effective_targets[0] if effective_targets else "N/A",
        "target_answers": effective_targets,
        "student_tokens": student_tokens,
        "student_audio_url": student_audio_url,
        "scores": {
            "content": content_res,
            "oral_fluency": fluency_res,
            "pronunciation": pronun_res,
        },
        "overall": {
            "total_points": total_pts,
            "max_points": max_pts,
            "score_10": score_10,
            "score_90": score_90,
            "score_100": score_100,
        },
        "fluency_metrics": {
            "speech_rate_wps": round(len(words) / max(0.5, effective_duration), 2),
            "speech_rate_status": "ACCEPTABLE",
            "pause_count": 0,
            "filled_pause_count": 0,
            "fluency_score": round(fluency_res["score"] * 20.0, 1)
        },
        "alignment_stats": {
            "is_correct": is_correct,
            "total_words": len(words),
            "target_answer": effective_targets[0]
        }
    }
