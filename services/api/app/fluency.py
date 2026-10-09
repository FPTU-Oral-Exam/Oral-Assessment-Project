"""
Fluency Metrics Engine
=====================

Based on research from:
- Singla et al. (2023): PDP/SHAP thresholds for speech rate (Int. Journal of AI in Education)
- Trouvain, Möbius & de Jong (2026): Utterance Fluency measurement (J. Second Language Pronunciation)

Metrics calculated:
1. Speech Rate (WPS) - Words Per Second
2. Silent Pause Ratio - pauses >= 250ms
3. Filled Pause Count - uh, um, er, ah

Scoring thresholds:
- Optimal speech rate: 2.0 - 2.4 words/second
- Slow penalty: < 1.35 wps
- Ceiling for fast speech: > 2.4 wps (anti-bullet-reading)
- Optimal pause ratio: <= 0.27 pauses per word
"""

from dataclasses import dataclass
from typing import Optional


# ============================================================
# CONSTANTS - Research-based thresholds
# ============================================================

# Speech Rate (Singla et al., 2023)
WPS_OPTIMAL_MIN: float = 2.0
WPS_OPTIMAL_MAX: float = 2.4
WPS_SLOW_THRESHOLD: float = 1.35
WPS_FAST_CEILING: float = 2.4

# Pause Detection (Trouvain et al., 2026)
MIN_SILENCE_DURATION_MS: float = 250  # 250ms = 0.25s minimum pause
PAUSE_RATIO_OPTIMAL: float = 0.27  # Max pauses per word

# Filled Pauses - Common English filled pauses
FILLED_PAUSE_PATTERNS: tuple = (
    r'\buh\b',      # "uh"
    r'\bum\b',      # "um"
    r'\bah\b',      # "ah"
    r'\ber\b',      # "er"
    r'\blike\b',    # "like" (as filler)
    r'\byou\s+know\b',  # "you know"
    r'\bwell\b',    # "well" (as filler)
)

# ============================================================
# DATA CLASSES
# ============================================================

@dataclass
class WordTiming:
    """Word with timing information from Whisper."""
    word: str
    start: float  # seconds
    end: float    # seconds


@dataclass
class PauseInfo:
    """Pause detection result."""
    count: int
    total_duration: float  # seconds
    pause_ratio_per_word: float


@dataclass
class FilledPauseInfo:
    """Filled pause detection result."""
    count: int
    words: list[str]


@dataclass
class FluencyMetrics:
    """Complete fluency metrics."""
    word_count: int
    duration_seconds: float
    speech_rate_wps: float
    speech_rate_score: float  # 0-100
    pause_info: PauseInfo
    filled_pause_info: FilledPauseInfo
    transcript_with_pauses: str


@dataclass
class SpeechRateAnalysis:
    """Detailed speech rate analysis."""
    wps: float
    status: str  # "OPTIMAL", "TOO_SLOW", "PLATEAU_RAPID"
    score: float  # 0-100


# ============================================================
# WORD TIMING EXTRACTION
# ============================================================

def extract_word_timing(segments: list) -> list[WordTiming]:
    """
    Extract word-level timing from Whisper segments.

    Args:
        segments: List of Whisper segments with .words attribute

    Returns:
        List of WordTiming objects sorted by start time

    Example:
        >>> segments = [
        ...     {'words': [{'word': 'Hello', 'start': 0.0, 'end': 0.3}, ...]},
        ...     {'words': [{'word': 'World', 'start': 0.4, 'end': 0.7}, ...]}
        ... ]
        >>> words = extract_word_timing(segments)
        >>> words[0].word
        'Hello'
    """
    words = []
    for segment in segments:
        # Handle both dict-style and object-style segments
        segment_words = segment.get('words', []) if isinstance(segment, dict) else getattr(segment, 'words', [])

        for w in segment_words:
            # Handle both dict-style and object-style words
            if isinstance(w, dict):
                word_text = w.get('word', '')
                start = float(w.get('start', 0))
                end = float(w.get('end', 0))
            else:
                word_text = getattr(w, 'word', '')
                start = float(getattr(w, 'start', 0))
                end = float(getattr(w, 'end', 0))

            # Clean and validate
            word_text = word_text.strip()
            if word_text:
                words.append(WordTiming(
                    word=word_text,
                    start=start,
                    end=end
                ))

    return sorted(words, key=lambda x: x.start)


def build_transcript_with_pauses(words: list[WordTiming], pause_threshold: float = 0.6) -> str:
    """
    Build transcript with [pause] markers at natural pause positions.

    Args:
        words: List of WordTiming objects
        pause_threshold: Seconds between words to count as pause (default 0.6s)

    Returns:
        Transcript string with [pause] markers inserted
    """
    if not words:
        return ""

    parts = []
    for i, w in enumerate(words):
        if i > 0:
            prev_end = words[i - 1].end
            gap = w.start - prev_end
            if gap >= pause_threshold:
                parts.append("[pause]")
        parts.append(w.word)

    return " ".join(parts)


# ============================================================
# SPEECH RATE CALCULATION
# ============================================================

def calculate_speech_rate_analysis(
    word_count: int,
    duration_seconds: float
) -> SpeechRateAnalysis:
    """
    Calculate speech rate in words per second (WPS) and normalize to score.

    Based on Singla et al. (2023) - Partial Dependence Plots analysis:
    - Optimal: 2.0 - 2.4 wps = full score
    - Slow: < 1.35 wps = penalty applied
    - Fast: > 2.4 wps = ceiling (anti-bullet-reading)

    Args:
        word_count: Total number of words spoken
        duration_seconds: Total speaking duration in seconds

    Returns:
        SpeechRateAnalysis with wps, status, and score

    Scoring Formula:
        - If 2.0 <= wps <= 2.4: score = 100
        - If 1.35 <= wps < 2.0: score = linear interpolation 70-100
        - If wps < 1.35: score = heavy penalty
        - If wps > 2.4: score = 100 (ceiling)
    """
    if duration_seconds <= 0 or word_count <= 0:
        return SpeechRateAnalysis(wps=0.0, status="INVALID", score=0.0)

    wps = word_count / duration_seconds

    # Determine status and calculate score
    if wps < WPS_SLOW_THRESHOLD:
        # Very slow - heavy penalty
        # Scale from 0 to ~50 based on how slow
        score = max(0, min(50, (wps / WPS_SLOW_THRESHOLD) * 50))
        status = "TOO_SLOW"
    elif wps < WPS_OPTIMAL_MIN:
        # Slightly slow - linear interpolation 70-100
        ratio = (wps - WPS_SLOW_THRESHOLD) / (WPS_OPTIMAL_MIN - WPS_SLOW_THRESHOLD)
        score = 70 + (ratio * 30)  # 70-100
        status = "SLOW"
    elif WPS_OPTIMAL_MIN <= wps <= WPS_OPTIMAL_MAX:
        # Optimal range - full score
        score = 100.0
        status = "OPTIMAL"
    else:
        # Fast (plateau) - ceiling, no bonus
        score = 100.0
        status = "PLATEAU_RAPID"

    return SpeechRateAnalysis(
        wps=round(wps, 2),
        status=status,
        score=round(score, 1)
    )


# ============================================================
# PAUSE DETECTION
# ============================================================

def detect_silent_pauses(
    words: list[WordTiming],
    min_silence_ms: float = MIN_SILENCE_DURATION_MS
) -> PauseInfo:
    """
    Detect silent pauses using Whisper word timestamps.

    A pause is detected when the gap between two consecutive words
    exceeds the threshold (default 250ms).

    Based on Trouvain et al. (2026):
    - Breakdown fluency measured by pause frequency
    - Optimal pause ratio: <= 0.27 pauses per word

    Args:
        words: List of WordTiming objects (must be sorted by start time)
        min_silence_ms: Minimum silence duration in milliseconds (default 250ms)

    Returns:
        PauseInfo with count, total duration, and ratio
    """
    if not words or len(words) < 2:
        return PauseInfo(count=0, total_duration=0.0, pause_ratio_per_word=0.0)

    min_silence_sec = min_silence_ms / 1000.0
    pause_count = 0
    total_pause_duration = 0.0
    word_count = len(words)

    for i in range(1, len(words)):
        prev_end = words[i - 1].end
        curr_start = words[i].start
        gap = curr_start - prev_end

        if gap >= min_silence_sec:
            pause_count += 1
            total_pause_duration += gap

    pause_ratio = pause_count / word_count if word_count > 0 else 0.0

    return PauseInfo(
        count=pause_count,
        total_duration=round(total_pause_duration, 2),
        pause_ratio_per_word=round(pause_ratio, 3)
    )


def calculate_pause_score(pause_ratio: float) -> float:
    """
    Calculate pause ratio score (0-100).

    Based on Trouvain et al. (2026):
    - Optimal: <= 0.27 pauses per word = 100
    - Higher ratio = lower score

    Args:
        pause_ratio: Pauses per word (e.g., 0.15 = 15 pauses per 100 words)

    Returns:
        Score from 0-100
    """
    if pause_ratio <= 0:
        return 100.0  # No pauses = perfect

    # Scale: 0.27 or less = 100, higher = lower
    if pause_ratio <= PAUSE_RATIO_OPTIMAL:
        return 100.0

    # Linear decrease beyond optimal
    # 0.27 -> 100, 0.5 -> ~50, 1.0 -> ~0
    excess = pause_ratio - PAUSE_RATIO_OPTIMAL
    score = 100 - (excess * 150)  # Steep penalty for excess pauses

    return max(0, min(100, round(score, 1)))


# ============================================================
# FILLED PAUSE DETECTION
# ============================================================

def detect_filled_pauses(transcript: str) -> FilledPauseInfo:
    """
    Detect filled pauses (uh, um, er, ah, like, etc.)

    These are NOT penalized heavily - they're natural planning markers
    (fluencemes) before technical content.

    Based on Trouvain et al. (2026):
    - Filled pauses indicate natural language production
    - Excessive filled pauses (> 5% of words) may indicate hesitation

    Args:
        transcript: Cleaned transcript text (lowercase)

    Returns:
        FilledPauseInfo with count and list of filled pause words
    """
    import re

    if not transcript:
        return FilledPauseInfo(count=0, words=[])

    transcript_lower = transcript.lower()
    found_pauses = []

    for pattern in FILLED_PAUSE_PATTERNS:
        matches = re.findall(pattern, transcript_lower, re.IGNORECASE)
        found_pauses.extend(matches)

    return FilledPauseInfo(
        count=len(found_pauses),
        words=found_pauses
    )


def calculate_filled_pause_score(filled_count: int, word_count: int) -> float:
    """
    Calculate filled pause score (0-100).

    Natural: 0-3% of words = fine
    Excessive: > 5% = penalty

    Args:
        filled_count: Number of filled pauses detected
        word_count: Total words spoken

    Returns:
        Score from 0-100
    """
    if word_count == 0:
        return 100.0

    ratio = filled_count / word_count

    if ratio <= 0.03:
        return 100.0  # Natural level
    elif ratio <= 0.05:
        return 90.0   # Acceptable
    elif ratio <= 0.10:
        return 75.0   # Getting excessive
    else:
        return max(50, 75 - (ratio - 0.10) * 300)  # Heavy penalty


# ============================================================
# MAIN FLUENCY SCORE CALCULATION
# ============================================================

def calculate_fluency_score(fluency_metrics: FluencyMetrics) -> dict:
    """
    Calculate overall fluency score from metrics.

    Weights:
    - Speech Rate: 50%
    - Pause Ratio: 30%
    - Filled Pauses: 20%

    Args:
        fluency_metrics: Complete fluency metrics from analyze_fluency()

    Returns:
        Dict with score, breakdown, and explanation
    """
    # Speech rate score (50%)
    speech_rate_score = calculate_speech_rate_analysis(
        fluency_metrics.word_count,
        fluency_metrics.duration_seconds
    )

    # Pause score (30%)
    pause_score = calculate_pause_score(fluency_metrics.pause_info.pause_ratio_per_word)

    # Filled pause score (20%)
    filled_score = calculate_filled_pause_score(
        fluency_metrics.filled_pause_info.count,
        fluency_metrics.word_count
    )

    # Weighted total
    total = (
        speech_rate_score.score * 0.50 +
        pause_score * 0.30 +
        filled_score * 0.20
    )

    # Generate explanation
    explanations = []

    if speech_rate_score.status == "OPTIMAL":
        explanations.append(f"Tốc độ nói tối ưu: {speech_rate_score.wps} từ/giây")
    elif speech_rate_score.status == "TOO_SLOW":
        explanations.append(f"Nói quá chậm: {speech_rate_score.wps} từ/giây (dưới ngưỡng 1.35)")
    elif speech_rate_score.status == "SLOW":
        explanations.append(f"Nói hơi chậm: {speech_rate_score.wps} từ/giây")
    elif speech_rate_score.status == "PLATEAU_RAPID":
        explanations.append(f"Nói nhanh nhưng ổn định: {speech_rate_score.wps} từ/giây")

    if fluency_metrics.pause_info.pause_ratio_per_word <= PAUSE_RATIO_OPTIMAL:
        explanations.append(f"Ngắt nghỉ tự nhiên: {fluency_metrics.pause_info.count} lần")
    else:
        explanations.append(f"Nhiều khoảng dừng bất thường: {fluency_metrics.pause_info.count} lần")

    if fluency_metrics.filled_pause_info.count > 0:
        explanations.append(f"Từ đệm tự nhiên: {fluency_metrics.filled_pause_info.count} lần")

    return {
        "total_score": round(total, 1),
        "breakdown": {
            "speech_rate": {
                "score": speech_rate_score.score,
                "wps": speech_rate_score.wps,
                "status": speech_rate_score.status,
                "weight": 0.50
            },
            "pause_ratio": {
                "score": pause_score,
                "count": fluency_metrics.pause_info.count,
                "ratio": fluency_metrics.pause_info.pause_ratio_per_word,
                "weight": 0.30
            },
            "filled_pauses": {
                "score": filled_score,
                "count": fluency_metrics.filled_pause_info.count,
                "weight": 0.20
            }
        },
        "explanations": explanations
    }


# ============================================================
# MAIN ANALYZER FUNCTION
# ============================================================

def analyze_fluency(segments: list, duration_seconds: Optional[float] = None) -> dict:
    """
    Main entry point: Analyze fluency from Whisper segments.

    Args:
        segments: List of Whisper segments with word timestamps
                 Each segment has .words attribute with timing info
        duration_seconds: Optional explicit duration (calculated from segments if not provided)

    Returns:
        Complete fluency analysis dict ready for grading

    Example:
        >>> from services.api.app import speech
        >>> result = speech.whisper("audio.wav", "en")
        >>> segments = result.get('segments', [])
        >>> analysis = analyze_fluency(segments)
        >>> analysis['total_score']
        85.5
    """
    # Extract word timings
    words = extract_word_timing(segments)

    # Calculate duration if not provided
    if duration_seconds is None:
        if words:
            duration_seconds = max(w.end for w in words)
        else:
            duration_seconds = 0.0

    word_count = len(words)

    # Build transcript with pause markers
    transcript_with_pauses = build_transcript_with_pauses(words)

    # Detect silent pauses
    pause_info = detect_silent_pauses(words)

    # Build clean transcript for filled pause detection
    clean_transcript = " ".join(w.word for w in words)
    filled_pause_info = detect_filled_pauses(clean_transcript)

    # Create metrics object
    metrics = FluencyMetrics(
        word_count=word_count,
        duration_seconds=duration_seconds,
        speech_rate_wps=round(word_count / duration_seconds, 2) if duration_seconds > 0 else 0.0,
        speech_rate_score=0.0,  # Calculated in final score
        pause_info=pause_info,
        filled_pause_info=filled_pause_info,
        transcript_with_pauses=transcript_with_pauses
    )

    # Calculate final scores
    fluency_score = calculate_fluency_score(metrics)

    # Build response
    speech_rate_analysis = calculate_speech_rate_analysis(word_count, duration_seconds)

    return {
        "word_count": word_count,
        "duration_seconds": round(duration_seconds, 2),
        "speech_rate_wps": speech_rate_analysis.wps,
        "speech_rate_status": speech_rate_analysis.status,
        "pause_count": pause_info.count,
        "pause_total_duration": pause_info.total_duration,
        "pause_ratio_per_word": pause_info.pause_ratio_per_word,
        "filled_pause_count": filled_pause_info.count,
        "filled_pause_words": filled_pause_info.words,
        "transcript_with_pauses": transcript_with_pauses,
        "fluency_score": fluency_score["total_score"],
        "fluency_breakdown": fluency_score["breakdown"],
        "fluency_explanations": fluency_score["explanations"]
    }
