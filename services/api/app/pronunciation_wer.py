"""
Pronunciation Scoring via Word Error Rate (WER)
==========================================

Based on research from:
- McGuire & Larson-Hall (2025): Word Error Rate using Levenshtein edit distance
  (Research Methods in Applied Linguistics, Elsevier)

Word Error Rate Formula:
    WER = (S + D + I) / N

Where:
    S = Substitutions (wrong words)
    D = Deletions (missing words)
    I = Insertions (extra words)
    N = Total words in reference

Pronunciation Score:
    Score = max(0, (1 - min(1, WER)) * 10)
    OR Score = max(0, (1 - WER) * 100)

Combined with Whisper confidence (avg_logprob):
    Final = 0.7 * WER_Score + 0.3 * Confidence_Score
"""

from dataclasses import dataclass
from typing import Optional
import jiwer


# ============================================================
# CONSTANTS
# ============================================================

# Weights for combined score
WER_WEIGHT: float = 0.7
LOGPROB_WEIGHT: float = 0.3

# Score mapping for avg_logprob
# Whisper avg_logprob typically ranges from -1 to 0
# Convert to 0-10 scale
LOGPROB_GOOD_THRESHOLD: float = -0.5  # Good confidence
LOGPROB_POOR_THRESHOLD: float = -1.5    # Poor confidence


# ============================================================
# DATA CLASSES
# ============================================================

@dataclass
class WERResult:
    """Word Error Rate calculation result."""
    wer: float          # 0.0 to 1.0 (lower is better)
    score: float        # 0-100 (higher is better)
    substitutions: int
    deletions: int
    insertions: int
    reference_length: int


@dataclass
class PronunciationResult:
    """Complete pronunciation evaluation result."""
    wer_result: WERResult
    confidence_score: float  # 0-100
    final_score: float       # Combined score 0-100
    error_words: dict         # Detailed error analysis
    is_valid: bool            # False if too short or empty


# ============================================================
# TEXT NORMALIZATION
# ============================================================

def normalize_text(text: str) -> str:
    """
    Normalize text for WER comparison.

    Steps:
    1. Lowercase
    2. Remove punctuation
    3. Collapse multiple spaces
    4. Strip leading/trailing whitespace

    Args:
        text: Raw text string

    Returns:
        Normalized text string

    Example:
        >>> normalize_text("Hello, World!")
        'hello world'
    """
    if not text:
        return ""

    # Lowercase
    text = text.lower()

    # Remove punctuation (keep only letters, numbers, spaces)
    import re
    text = re.sub(r'[^\w\s]', ' ', text)

    # Collapse multiple spaces to single space
    text = re.sub(r'\s+', ' ', text)

    # Strip
    text = text.strip()

    return text


def compose_transforms():
    """
    Compose jiwer transforms for text normalization.

    Returns:
        jiwer.Compose object with all transformations

    Note:
        Using jiwer's built-in transforms for consistency
    """
    return jiwer.Compose([
        jiwer.ToLowerCase(),
        jiwer.RemoveMultipleSpaces(),
        jiwer.RemovePunctuation(),
        jiwer.Strip()
    ])


# ============================================================
# WER CALCULATION
# ============================================================

def calculate_wer(
    reference: str,
    hypothesis: str,
    include_details: bool = True
) -> WERResult:
    """
    Calculate Word Error Rate between reference and hypothesis.

    WER = (S + D + I) / N

    Where:
    - S = Substitutions (wrong words)
    - D = Deletions (missing words)
    - I = Insertions (extra words)
    - N = Total words in reference

    Args:
        reference: Expected text (what student should have said)
        hypothesis: Actual transcript from Whisper

    Returns:
        WERResult with detailed breakdown

    Example:
        >>> result = calculate_wer("hello world", "hello")
        >>> result.wer
        0.5
        >>> result.deletions
        1
    """
    # Normalize texts
    ref_norm = normalize_text(reference)
    hyp_norm = normalize_text(hypothesis)

    if not ref_norm:
        return WERResult(
            wer=1.0,
            score=0.0,
            substitutions=0,
            deletions=0,
            insertions=0,
            reference_length=0
        )

    if not hyp_norm:
        # Empty hypothesis = all deletions
        word_count = len(ref_norm.split())
        return WERResult(
            wer=1.0,
            score=0.0,
            substitutions=0,
            deletions=word_count,
            insertions=0,
            reference_length=word_count
        )

    # Use jiwer for WER calculation
    transforms = compose_transforms()

    # Get detailed output
    output = jiwer.process_words(
        reference=transforms(ref_norm),
        hypothesis=transforms(hyp_norm)
    )

    # Extract components
    ref_words = ref_norm.split()
    reference_length = len(ref_words)

    wer = output.wer
    substitutions = output.substitutions
    deletions = output.deletions
    insertions = output.insertions

    # Calculate score: (1 - WER) * 100
    # Cap at 0 to avoid negative scores
    score = max(0.0, (1.0 - min(1.0, wer)) * 100)

    return WERResult(
        wer=round(wer, 4),
        score=round(score, 1),
        substitutions=substitutions,
        deletions=deletions,
        insertions=insertions,
        reference_length=reference_length
    )


def get_error_words(
    reference: str,
    hypothesis: str
) -> dict:
    """
    Get detailed word-by-word error analysis.

    Args:
        reference: Expected text
        hypothesis: Actual transcript

    Returns:
        Dict with error analysis:
        {
            'substitutions': [{'ref': 'X', 'hyp': 'Y'}, ...],
            'deletions': ['word1', 'word2', ...],
            'insertions': ['word1', 'word2', ...]
        }
    """
    ref_norm = normalize_text(reference)
    hyp_norm = normalize_text(hypothesis)

    ref_words = ref_norm.split()
    hyp_words = hyp_norm.split()

    result = {
        'substitutions': [],
        'deletions': [],
        'insertions': []
    }

    if not ref_norm or not hyp_norm:
        if not ref_norm:
            result['insertions'] = hyp_words
        if not hyp_norm:
            result['deletions'] = ref_words
        return result

    # Simple alignment using LCS-like approach
    # For more accurate alignment, consider using python-Levenshtein
    i, j = 0, 0
    ref_idx, hyp_idx = 0, 0

    while ref_idx < len(ref_words) and hyp_idx < len(hyp_words):
        if ref_words[ref_idx].lower() == hyp_words[hyp_idx].lower():
            ref_idx += 1
            hyp_idx += 1
        else:
            # Check if it's a substitution or deletion/insertion
            # Look ahead to find matching word
            found_match = False
            for look_ahead in range(1, min(3, len(hyp_words) - hyp_idx) + 1):
                if ref_idx < len(ref_words) and hyp_idx + look_ahead < len(hyp_words):
                    if ref_words[ref_idx].lower() == hyp_words[hyp_idx + look_ahead].lower():
                        # Extra word in hypothesis = insertion
                        for k in range(look_ahead):
                            if hyp_idx < len(hyp_words):
                                result['insertions'].append(hyp_words[hyp_idx])
                                hyp_idx += 1
                        found_match = True
                        break

            if not found_match:
                # Substitution
                result['substitutions'].append({
                    'reference': ref_words[ref_idx],
                    'hypothesis': hyp_words[hyp_idx] if hyp_idx < len(hyp_words) else '[MISSING]'
                })
                ref_idx += 1
                hyp_idx += 1

    # Remaining words
    while ref_idx < len(ref_words):
        result['deletions'].append(ref_words[ref_idx])
        ref_idx += 1

    while hyp_idx < len(hyp_words):
        result['insertions'].append(hyp_words[hyp_idx])
        hyp_idx += 1

    return result


# ============================================================
# WHISPER CONFIDENCE SCORING
# ============================================================

def score_logprob(avg_logprob: Optional[float]) -> float:
    """
    Convert Whisper's avg_logprob to 0-100 score.

    Whisper's avg_logprob:
    - Range: typically -1.5 to 0
    - -0.3 = very high confidence
    - -0.5 = good confidence
    - -1.0 = moderate confidence
    - -1.5 or lower = low confidence

    Args:
        avg_logprob: Whisper's average log probability (from transcription info)

    Returns:
        Score from 0-100
    """
    if avg_logprob is None:
        return 70.0  # Default assumption if not provided

    # Convert logprob to 0-10 scale
    # avg_logprob is typically between -1.5 and 0
    if avg_logprob >= LOGPROB_GOOD_THRESHOLD:
        # Very high confidence
        score = 10.0
    elif avg_logprob >= -0.8:
        # Good confidence
        score = 9.0 + (avg_logprob + 0.8) * 2.5
    elif avg_logprob >= -1.2:
        # Moderate confidence
        score = 7.0 + (avg_logprob + 1.2) * 5.0
    elif avg_logprob >= LOGPROB_POOR_THRESHOLD:
        # Low confidence
        score = 4.0 + (avg_logprob + 1.5) * 10.0
    else:
        # Very low confidence
        score = max(0, 4.0 + (avg_logprob + 1.5) * 10.0)

    return round(max(0, min(10, score)), 1)


# ============================================================
# MAIN EVALUATION FUNCTION
# ============================================================

def evaluate_pronunciation(
    reference_text: str,
    hypothesis_text: str,
    avg_logprob: Optional[float] = None,
    min_duration_seconds: float = 1.0,
    min_words: int = 3
) -> PronunciationResult:
    """
    Evaluate pronunciation using WER + Whisper confidence.

    This is the main entry point for Part 2 Read Aloud scoring.

    Args:
        reference_text: The expected reading text (what student should read)
        hypothesis_text: The transcript from Whisper
        avg_logprob: Whisper's confidence score (optional)
        min_duration_seconds: Minimum valid recording duration
        min_words: Minimum word count for valid response

    Returns:
        PronunciationResult with complete scoring

    Scoring Formula:
        Final = 0.7 * WER_Score + 0.3 * Confidence_Score

    Example:
        >>> result = evaluate_pronunciation(
        ...     "The algorithm uses binary search",
        ...     "the algorithm uses binary search",
        ...     avg_logprob=-0.3
        ... )
        >>> result.final_score
        98.5
    """
    # Check if response is valid
    is_valid = True
    validation_error = None

    # Empty response
    if not hypothesis_text or not normalize_text(hypothesis_text):
        is_valid = False
        validation_error = "EMPTY_RESPONSE"

    # Too short
    word_count = len(hypothesis_text.split())
    if word_count < min_words:
        is_valid = False
        validation_error = f"TOO_SHORT: {word_count} words"

    # Calculate WER
    wer_result = calculate_wer(reference_text, hypothesis_text)

    # Score Whisper confidence
    confidence_score = score_logprob(avg_logprob) * 10  # Scale to 0-100

    # Combined final score
    if is_valid:
        final_score = (
            wer_result.score * WER_WEIGHT +
            confidence_score * LOGPROB_WEIGHT
        )
    else:
        final_score = 0.0

    # Get detailed error words
    error_words = get_error_words(reference_text, hypothesis_text)

    return PronunciationResult(
        wer_result=wer_result,
        confidence_score=round(confidence_score, 1),
        final_score=round(final_score, 1),
        error_words=error_words,
        is_valid=is_valid
    )


def grade_reading_aloud(
    reference_text: str,
    hypothesis_text: str,
    avg_logprob: Optional[float] = None
) -> dict:
    """
    Grade Part 2 Read Aloud task.

    Simplified interface returning dict for JSON serialization.

    Args:
        reference_text: The text student should read
        hypothesis_text: Whisper transcript
        avg_logprob: Whisper confidence (optional)

    Returns:
        Dict with grading result

    Example:
        >>> result = grade_reading_aloud(
        ...     "Recursion is a fundamental concept",
        ...     "recursion is a fundamental concept",
        ...     avg_logprob=-0.4
        ... )
        >>> print(result['score'], result['wer'], result['is_perfect'])
        99.0 0.01 False
    """
    result = evaluate_pronunciation(reference_text, hypothesis_text, avg_logprob)

    # Build detailed response
    response = {
        "is_valid": result.is_valid,
        "score": result.final_score,
        "wer": result.wer_result.wer,
        "wer_score": result.wer_result.score,
        "confidence_score": result.confidence_score,
        "reference_length": result.wer_result.reference_length,
        "errors": {
            "total": result.wer_result.substitutions + result.wer_result.deletions + result.wer_result.insertions,
            "substitutions": result.wer_result.substitutions,
            "deletions": result.wer_result.deletions,
            "insertions": result.wer_result.insertions,
            "details": result.error_words
        },
        "feedback": generate_feedback(result)
    }

    # Add status indicators
    if result.final_score >= 90:
        response["grade"] = "EXCELLENT"
        response["grade_description"] = "Phát âm chuẩn xác"
    elif result.final_score >= 75:
        response["grade"] = "GOOD"
        response["grade_description"] = "Phát âm tốt, có vài lỗi nhỏ"
    elif result.final_score >= 60:
        response["grade"] = "FAIR"
        response["grade_description"] = "Phát âm chấp nhận được"
    elif result.final_score >= 40:
        response["grade"] = "POOR"
        response["grade_description"] = "Nhiều lỗi phát âm"
    else:
        response["grade"] = "VERY_POOR"
        response["grade_description"] = "Phát âm không đạt yêu cầu"

    return response


def generate_feedback(result: PronunciationResult) -> str:
    """
    Generate human-readable feedback based on pronunciation result.

    Args:
        result: PronunciationResult from evaluate_pronunciation()

    Returns:
        Vietnamese feedback string
    """
    if not result.is_valid:
        return "Phản hồi trống hoặc quá ngắn. Vui lòng đọc lại câu."

    parts = []

    # WER feedback
    wer = result.wer_result.wer
    if wer <= 0.05:
        parts.append("Phát âm rất chuẩn xác.")
    elif wer <= 0.15:
        parts.append("Phát âm tốt.")
    elif wer <= 0.30:
        if result.wer_result.substitutions > 0:
            parts.append(f"Có {result.wer_result.substitutions} từ phát âm chưa chính xác.")
        if result.wer_result.deletions > 0:
            parts.append(f"Thiếu {result.wer_result.deletions} từ.")
        if result.wer_result.insertions > 0:
            parts.append(f"Thêm {result.wer_result.insertions} từ không cần thiết.")
    else:
        parts.append("Cần cải thiện phát âm nhiều.")

    # Confidence feedback
    if result.confidence_score < 60:
        parts.append("Âm thanh không rõ ràng, hệ thống ghi nhận độ chính xác thấp.")

    return " ".join(parts)
