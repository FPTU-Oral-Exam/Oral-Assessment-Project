"""
Grading for FREE RESPONSE (Part 1)
Simple grading for English Speaking Assessment Demo
"""

from typing import Optional
from . import fluency, metrics


def grade_free_response(
    transcript: str,
    question: dict,
    fluency_result: Optional[dict] = None,
    lexical_result: Optional[dict] = None,
    stt_confidence: float = 0.0,
) -> dict:
    """
    Grade Part 1: Free Response

    Uses:
    - Fluency metrics (WPS, pauses, filled pauses)
    - Lexical diversity (TTR)
    - Content evaluation (via LLM prompt - simplified)

    Args:
        transcript: The student's spoken response (from Whisper)
        question: Question dict with expected_points, hints, etc.
        fluency_result: Output from fluency.analyze_fluency()
        lexical_result: Output from metrics.analyze_lexical_diversity()
        stt_confidence: Whisper confidence score

    Returns:
        dict with score, breakdown, and feedback
    """
    # ============================================================
    # 1. FLUENCY SCORE
    # ============================================================
    fluency_score = 0
    fluency_breakdown = {}

    if fluency_result:
        # Fluency score từ speech metrics (0-100)
        raw_fluency = fluency_result.get("fluency_score", 50)
        # Convert to 0-10 scale
        fluency_score = round(raw_fluency / 10, 2)

        fluency_breakdown = {
            "speech_rate_wps": fluency_result.get("speech_rate_wps", 0),
            "speech_rate_status": fluency_result.get("speech_rate_status", "UNKNOWN"),
            "pause_count": fluency_result.get("pause_count", 0),
            "pause_ratio": fluency_result.get("pause_ratio_per_word", 0),
            "filled_pause_count": fluency_result.get("filled_pause_count", 0),
            "fluency_raw_score": raw_fluency,
        }
    else:
        # Default score nếu không có fluency data
        fluency_score = 5.0
        fluency_breakdown = {
            "speech_rate_wps": 0,
            "speech_rate_status": "UNKNOWN",
            "pause_count": 0,
            "pause_ratio": 0,
            "filled_pause_count": 0,
            "fluency_raw_score": 50,
        }

    # ============================================================
    # 2. LEXICAL SCORE (Vocabulary)
    # ============================================================
    lexical_score = 0
    lexical_breakdown = {}

    if lexical_result:
        # TTR score (0-100) -> convert to 0-10
        raw_lexical = lexical_result.get("ttr_score", 50)
        lexical_score = round(raw_lexical / 10, 2)

        lexical_breakdown = {
            "total_words": lexical_result.get("total_words", 0),
            "unique_words": lexical_result.get("unique_words", 0),
            "ttr": lexical_result.get("ttr", 0),
            "ttr_score": raw_lexical,
            "vocabulary_level": lexical_result.get("vocabulary_level", "AVERAGE"),
        }
    else:
        # Default score
        lexical_score = 5.0
        lexical_breakdown = {
            "total_words": len(transcript.split()) if transcript else 0,
            "unique_words": 0,
            "ttr": 0,
            "ttr_score": 50,
            "vocabulary_level": "AVERAGE",
        }

    # ============================================================
    # 3. CONTENT SCORE (Simplified - based on transcript length)
    # ============================================================
    content_score = 5.0
    content_breakdown = {}

    if transcript and len(transcript.strip()) > 0:
        word_count = len(transcript.split())

        # Check if answered the question (basic check)
        answered = word_count >= 20  # At least 20 words

        # Estimate content score based on length and keywords
        if word_count >= 50:
            content_score = 8.0
        elif word_count >= 30:
            content_score = 7.0
        elif word_count >= 20:
            content_score = 6.0
        elif word_count >= 10:
            content_score = 4.0
        else:
            content_score = 2.0

        content_breakdown = {
            "word_count": word_count,
            "answered": answered,
            "estimated_score": content_score,
        }

        # Simple keyword check (if expected_points provided)
        expected_points = question.get("expected_points", []) if question else []
        if expected_points:
            # Count how many expected points might be covered
            covered_points = 0
            transcript_lower = transcript.lower()
            for point in expected_points:
                # Simple keyword matching
                keywords = [w.strip().lower() for w in point.split() if len(w) > 3]
                if any(kw in transcript_lower for kw in keywords):
                    covered_points += 1

            coverage = covered_points / len(expected_points) if expected_points else 0
            content_breakdown["expected_points_covered"] = covered_points
            content_breakdown["total_expected_points"] = len(expected_points)
            content_breakdown["coverage"] = coverage

            # Adjust score based on coverage
            content_score = round(content_score * (0.5 + 0.5 * coverage), 2)

    # ============================================================
    # 4. WEIGHTED FINAL SCORE
    # ============================================================
    weights = {
        "fluency": 0.30,
        "vocabulary": 0.30,
        "content": 0.40,
    }

    final_score = round(
        fluency_score * weights["fluency"] +
        lexical_score * weights["vocabulary"] +
        content_score * weights["content"],
        2
    )

    # ============================================================
    # 5. GENERATE FEEDBACK
    # ============================================================
    feedback_parts = []

    # Fluency feedback
    if fluency_result:
        wps = fluency_result.get("speech_rate_wps", 0)
        status = fluency_result.get("speech_rate_status", "")
        if status == "OPTIMAL":
            feedback_parts.append(f"Tốc độ nói tốt ({wps:.1f} wps)")
        elif status == "SLOW":
            feedback_parts.append(f"Tốc độ hơi chậm ({wps:.1f} wps)")
        elif status == "TOO_SLOW":
            feedback_parts.append(f"Tốc độ quá chậm ({wps:.1f} wps)")

        pauses = fluency_result.get("pause_count", 0)
        if pauses > 5:
            feedback_parts.append(f"Có {pauses} khoảng dừng - có thể cải thiện")
        elif pauses <= 3:
            feedback_parts.append("Nói trôi chảy, ít dừng")

    # Vocabulary feedback
    if lexical_result:
        level = lexical_result.get("vocabulary_level", "AVERAGE")
        ttr = lexical_result.get("ttr", 0)
        if level == "RICH":
            feedback_parts.append(f"Vốn từ phong phú (TTR: {ttr:.2f})")
        elif level == "GOOD":
            feedback_parts.append(f"Vốn từ tốt (TTR: {ttr:.2f})")
        elif level == "LIMITED":
            feedback_parts.append("Nên sử dụng đa dạng từ vựng hơn")

    # Content feedback
    if transcript and len(transcript.split()) < 20:
        feedback_parts.append("Câu trả lời hơi ngắn - nên nói chi tiết hơn")

    feedback = ". ".join(feedback_parts) if feedback_parts else "Câu trả lời ở mức trung bình"

    # ============================================================
    # 6. RETURN RESULT
    # ============================================================
    return {
        "score": final_score,
        "part_type": "FREE_RESPONSE",
        "criteria": [
            {
                "name": "Fluency",
                "score": fluency_score,
                "max_score": 10,
                "weight": weights["fluency"],
                "comment": feedback_parts[0] if feedback_parts else "Độ trôi chảy ở mức trung bình",
                "details": fluency_breakdown,
            },
            {
                "name": "Vocabulary",
                "score": lexical_score,
                "max_score": 10,
                "weight": weights["vocabulary"],
                "comment": feedback_parts[1] if len(feedback_parts) > 1 else "Vốn từ ở mức trung bình",
                "details": lexical_breakdown,
            },
            {
                "name": "Content",
                "score": content_score,
                "max_score": 10,
                "weight": weights["content"],
                "comment": "Đề cập đủ ý chính" if content_score >= 6 else "Cần nói chi tiết hơn",
                "details": content_breakdown,
            },
        ],
        "enhanced_metrics": {
            "fluency": fluency_result,
            "pronunciation": None,  # Part 1 không có pronunciation WER
            "lexical": lexical_result,
        },
        "reasoning_summary": feedback,
        "stt_confidence": stt_confidence,
        "transcript_length": len(transcript.split()) if transcript else 0,
    }


def grade_reading_aloud_with_fluency(
    transcript: str,
    reference_text: str,
    fluency_result: Optional[dict] = None,
    pronunciation_result: Optional[dict] = None,
    stt_confidence: float = 0.0,
) -> dict:
    """
    Grade Part 2: Read Aloud - kết hợp WER + Fluency

    Args:
        transcript: Student's reading (from Whisper)
        reference_text: Original text to compare
        fluency_result: Output from fluency.analyze_fluency()
        pronunciation_result: Output from pronunciation_wer.grade_reading_aloud()
        stt_confidence: Whisper confidence

    Returns:
        dict with score, breakdown, and feedback
    """
    # ============================================================
    # 1. PRONUNCIATION SCORE (WER-based)
    # ============================================================
    if pronunciation_result is None:
        # Import here to avoid circular dependency
        from . import pronunciation_wer
        pronunciation_result = pronunciation_wer.grade_reading_aloud(
            reference_text=reference_text,
            hypothesis_text=transcript,
            avg_logprob=stt_confidence,
        )

    # WER score (0-100) -> convert to 0-10
    wer_score_raw = pronunciation_result.get("score", 0)
    pronunciation_score = round(wer_score_raw / 10, 2)

    # ============================================================
    # 2. FLUENCY SCORE
    # ============================================================
    fluency_score = 0

    if fluency_result:
        raw_fluency = fluency_result.get("fluency_score", 50)
        fluency_score = round(raw_fluency / 10, 2)
    else:
        fluency_score = 5.0

    # ============================================================
    # 3. WEIGHTED FINAL SCORE
    # ============================================================
    weights = {
        "pronunciation": 0.60,  # WER quan trọng hơn
        "fluency": 0.40,
    }

    final_score = round(
        pronunciation_score * weights["pronunciation"] +
        fluency_score * weights["fluency"],
        2
    )

    # ============================================================
    # 4. GENERATE FEEDBACK
    # ============================================================
    feedback_parts = []

    # WER feedback
    wer = pronunciation_result.get("wer", 0)
    if wer <= 0.05:
        feedback_parts.append("Phát âm xuất sắc! Gần như hoàn hảo.")
    elif wer <= 0.10:
        feedback_parts.append("Phát âm tốt, có một vài lỗi nhỏ.")
    elif wer <= 0.20:
        feedback_parts.append("Phát âm khá, cần cải thiện một số từ.")
    else:
        feedback_parts.append(f"Cần luyện tập thêm. WER: {wer*100:.1f}%")

    # Fluency feedback
    if fluency_result:
        wps = fluency_result.get("speech_rate_wps", 0)
        status = fluency_result.get("speech_rate_status", "")
        if status == "OPTIMAL":
            feedback_parts.append(f"Tốc độ tốt ({wps:.1f} wps)")
        elif status == "SLOW":
            feedback_parts.append(f"Hơi chậm ({wps:.1f} wps)")

    # ============================================================
    # 5. RETURN RESULT
    # ============================================================
    return {
        "score": final_score,
        "part_type": "READ_ALOUD",
        "criteria": [
            {
                "name": "Pronunciation Accuracy",
                "score": pronunciation_score,
                "max_score": 10,
                "weight": weights["pronunciation"],
                "comment": feedback_parts[0] if feedback_parts else "Phát âm ở mức trung bình",
                "details": {
                    "wer": wer,
                    "wer_percentage": round(wer * 100, 1),
                    "wer_score": wer_score_raw,
                    "grade": pronunciation_result.get("grade", "UNKNOWN"),
                    "errors": pronunciation_result.get("errors", {}),
                },
            },
            {
                "name": "Fluency",
                "score": fluency_score,
                "max_score": 10,
                "weight": weights["fluency"],
                "comment": feedback_parts[1] if len(feedback_parts) > 1 else "Độ trôi chảy ở mức trung bình",
                "details": fluency_result or {},
            },
        ],
        "enhanced_metrics": {
            "fluency": fluency_result,
            "pronunciation": pronunciation_result,
            "lexical": None,  # Part 2 không đánh giá lexical
        },
        "reasoning_summary": " ".join(feedback_parts),
        "stt_confidence": stt_confidence,
        "reference_length": len(reference_text.split()),
        "transcript_length": len(transcript.split()) if transcript else 0,
    }
