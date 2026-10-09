"""
Combined Metrics Module
=====================

Integrates:
1. Fluency metrics (from fluency.py)
2. Pronunciation WER (from pronunciation_wer.py)
3. Lexical diversity (based on Al-Ghezi et al., 2022 - DigiTala)
4. LLM grading prompt builder with evidence

Based on research:
- Al-Ghezi et al. (2022): Lexico-grammatical Range & Accuracy from ASR
  (Fonetiikan päivät 2022)
- Type-Token Ratio (TTR) for vocabulary diversity
- Combined evidence-based scoring for LLM prompts
"""

from dataclasses import dataclass
from typing import Optional


# ============================================================
# LEXICAL DIVERSITY METRICS
# ============================================================

def calculate_type_token_ratio(transcript: str) -> float:
    """
    Calculate Type-Token Ratio (TTR) for vocabulary diversity.

    Based on Al-Ghezi et al. (2022):
    - TTR = Unique words / Total words
    - Higher TTR = more diverse vocabulary
    - Typical range: 0.40-0.68 for 50-200 word samples

    Args:
        transcript: Clean transcript text (lowercase, no punctuation)

    Returns:
        TTR score from 0 to 1

    Example:
        >>> ttr = calculate_type_token_ratio("the the the cat sat")
        >>> round(ttr, 2)
        0.6
    """
    if not transcript:
        return 0.0

    # Normalize
    words = transcript.lower().split()
    words = [w.strip() for w in words if w.strip()]

    if not words:
        return 0.0

    unique_words = set(words)
    ttr = len(unique_words) / len(words)

    return round(ttr, 4)


def calculate_lexical_diversity_score(ttr: float) -> float:
    """
    Convert TTR to a 0-100 score.

    Based on research:
    - TTR >= 0.60: Rich vocabulary = 100
    - TTR 0.50-0.60: Good vocabulary = 80-100
    - TTR 0.40-0.50: Average vocabulary = 60-80
    - TTR < 0.40: Limited vocabulary = 0-60

    Args:
        ttr: Type-Token Ratio (0-1)

    Returns:
        Score from 0-100
    """
    if ttr >= 0.60:
        return 100.0
    elif ttr >= 0.50:
        # Linear interpolation 80-100
        return 80.0 + (ttr - 0.50) / 0.10 * 20.0
    elif ttr >= 0.40:
        # Linear interpolation 60-80
        return 60.0 + (ttr - 0.40) / 0.10 * 20.0
    else:
        # Below 0.40 - linear penalty
        return max(0, ttr / 0.40 * 60.0)


def analyze_lexical_diversity(transcript: str) -> dict:
    """
    Complete lexical analysis.

    Args:
        transcript: Clean transcript text

    Returns:
        Dict with lexical metrics
    """
    words = [w.strip().lower() for w in transcript.split() if w.strip()]

    if not words:
        return {
            "total_words": 0,
            "unique_words": 0,
            "ttr": 0.0,
            "ttr_score": 0.0,
            "vocabulary_level": "UNKNOWN"
        }

    unique_words = set(words)
    ttr = len(unique_words) / len(words)
    ttr_score = calculate_lexical_diversity_score(ttr)

    # Determine vocabulary level
    if ttr >= 0.60:
        level = "RICH"
        description = "Vốn từ vựng phong phú, đa dạng"
    elif ttr >= 0.50:
        level = "GOOD"
        description = "Vốn từ vựng tốt, sử dụng linh hoạt"
    elif ttr >= 0.40:
        level = "AVERAGE"
        description = "Vốn từ vựng ở mức trung bình"
    else:
        level = "LIMITED"
        description = "Vốn từ vựng hạn chế, lặp lại nhiều"

    return {
        "total_words": len(words),
        "unique_words": len(unique_words),
        "ttr": round(ttr, 4),
        "ttr_score": round(ttr_score, 1),
        "vocabulary_level": level,
        "vocabulary_description": description
    }


# ============================================================
# GRADING METRICS AGGREGATOR
# ============================================================

@dataclass
class GradingMetrics:
    """Combined metrics for grading."""
    fluency_score: float
    pronunciation_score: float
    lexical_score: float
    content_score: float  # Will be from LLM
    overall_metrics: dict


def aggregate_grading_metrics(
    fluency_result: dict,
    pronunciation_result: Optional[dict] = None,
    transcript: str = ""
) -> GradingMetrics:
    """
    Aggregate all metrics into a single grading object.

    Args:
        fluency_result: Result from fluency.analyze_fluency()
        pronunciation_result: Optional result from pronunciation_wer.grade_reading_aloud()
        transcript: Clean transcript for lexical analysis

    Returns:
        GradingMetrics with all scores
    """
    # Get fluency score
    fluency_score = fluency_result.get('fluency_score', 0.0)

    # Get pronunciation score (if available)
    pronunciation_score = 0.0
    if pronunciation_result:
        pronunciation_score = pronunciation_result.get('score', 0.0)

    # Calculate lexical diversity
    lexical_analysis = analyze_lexical_diversity(transcript)
    lexical_score = lexical_analysis.get('ttr_score', 0.0)

    # Build overall metrics
    overall_metrics = {
        "fluency": {
            "score": fluency_score,
            "speech_rate_wps": fluency_result.get('speech_rate_wps', 0),
            "speech_rate_status": fluency_result.get('speech_rate_status', 'UNKNOWN'),
            "pause_count": fluency_result.get('pause_count', 0),
            "pause_ratio": fluency_result.get('pause_ratio_per_word', 0),
            "filled_pause_count": fluency_result.get('filled_pause_count', 0)
        },
        "pronunciation": pronunciation_result if pronunciation_result else None,
        "lexical": lexical_analysis
    }

    return GradingMetrics(
        fluency_score=fluency_score,
        pronunciation_score=pronunciation_score,
        lexical_score=lexical_score,
        content_score=0.0,  # Will be filled by LLM
        overall_metrics=overall_metrics
    )


# ============================================================
# LLM PROMPT BUILDER
# ============================================================

def build_grading_prompt(
    transcript: str,
    transcript_with_pauses: str,
    question: dict,
    metrics: GradingMetrics,
    reference_text: Optional[str] = None,
    context_chunks: list[dict] = None
) -> dict:
    """
    Build comprehensive LLM grading prompt with all evidence.

    Based on research best practices:
    - Include acoustic evidence (speech rate, pauses)
    - Include pronunciation metrics (WER if available)
    - Include lexical diversity
    - Provide Anchor Exemplars for calibration

    Args:
        transcript: Clean transcript text
        transcript_with_pauses: Transcript with [pause] markers
        question: Question dict with text, expected_points, key_terms
        metrics: GradingMetrics object
        reference_text: Optional reference for Part 2 Read Aloud
        context_chunks: Optional RAG context chunks

    Returns:
        Dict with prompt components
    """
    # Extract question info
    question_text = question.get('text', '') if isinstance(question, dict) else str(question)
    expected_points = question.get('expected_points', []) if isinstance(question, dict) else []
    key_terms = question.get('key_terms', []) if isinstance(question, dict) else []

    # Build metrics summary
    fluency = metrics.overall_metrics.get('fluency', {})
    lexical = metrics.overall_metrics.get('lexical', {})
    pronunciation = metrics.overall_metrics.get('pronunciation')

    metrics_summary = f"""
ACOUSITC EVIDENCE (Extracted Automatically):
- Speech Rate: {fluency.get('speech_rate_wps', 0)} words/second ({fluency.get('speech_rate_status', 'UNKNOWN')})
- Pause Count: {fluency.get('pause_count', 0)} pauses
- Pause Ratio: {fluency.get('pause_ratio', 0)} pauses per word
- Filled Pauses (uh, um): {fluency.get('filled_pause_count', 0)} occurrences
"""

    if pronunciation:
        metrics_summary += f"""
PRONUNCIATION EVIDENCE (Automated WER Analysis):
- Word Error Rate: {pronunciation.get('wer', 0) * 100:.1f}%
- Pronunciation Score: {pronunciation.get('score', 0):.1f}/100
- Substitution Errors: {pronunciation.get('errors', {}).get('substitutions', 0)}
- Deletion Errors: {pronunciation.get('errors', {}).get('deletions', 0)}
"""

    metrics_summary += f"""
LEXICAL EVIDENCE (Vocabulary Analysis):
- Total Words: {lexical.get('total_words', 0)}
- Unique Words: {lexical.get('unique_words', 0)}
- Type-Token Ratio: {lexical.get('ttr', 0):.2f}
- Vocabulary Level: {lexical.get('vocabulary_level', 'UNKNOWN')}
"""

    # Build expected answer context
    expected_context = ""
    if expected_points:
        expected_context += "\nEXPECTED KEY POINTS:\n"
        for i, point in enumerate(expected_points, 1):
            expected_context += f"  {i}. {point}\n"

    if key_terms:
        expected_context += "\nREQUIRED KEY TERMS:\n"
        for term in key_terms:
            expected_context += f"  - {term}\n"

    # Build context chunks if available
    rag_context = ""
    if context_chunks:
        rag_context = "\n\nREFERENCE KNOWLEDGE (RAG):\n"
        for i, chunk in enumerate(context_chunks[:3], 1):
            heading = chunk.get('heading', '')
            content = chunk.get('content', '')[:500]  # Limit length
            rag_context += f"[{i}] {heading}\n{content}\n\n"

    # Build full prompt
    prompt = f"""You are a calibrated oral English examiner for ESL university students.
Your task is to evaluate the student's response using ONLY the evidence provided below.

## QUESTION:
{question_text}

{expected_context}
{rag_context}

## STUDENT RESPONSE (with speech markers):
{transcript_with_pauses}

{metrics_summary}

## SCORING CRITERIA:
Evaluate based on these dimensions with weights:
1. **Content & Accuracy (40%)**: Did the student address the question? Are the technical points correct?
2. **Fluency & Delivery (20%)**: Based on the acoustic metrics provided - speech rate, pauses
3. **Vocabulary & Language (20%)**: Based on lexical diversity and key term usage
4. **Pronunciation (20%)**: Based on WER analysis (for reading tasks) or overall clarity

## IMPORTANT INSTRUCTIONS:
1. Be LENIENT with ESL phonetic errors - focus on communication effectiveness
2. Hesitation markers (uh, um) BEFORE technical terms are NATURAL and should NOT be penalized
3. A slightly slower pace with natural pauses indicates thinking, not poor fluency
4. For Part 2 (Read Aloud), WER < 15% is acceptable for ESL speakers
5. Evaluate if the student DEMONSTRATES UNDERSTANDING, not just memorization

## OUTPUT FORMAT:
Return a JSON object with:
{{
  "score": 0-100,
  "breakdown": {{
    "content_score": 0-100,
    "fluency_score": 0-100,
    "vocabulary_score": 0-100,
    "pronunciation_score": 0-100
  }},
  "strengths": ["..."],
  "weaknesses": ["..."],
  "feedback": "Constructive feedback in Vietnamese",
  "review_required": true/false,
  "reasoning": "Brief explanation of scoring decision"
}}
"""

    return {
        "prompt": prompt,
        "metrics_summary": metrics_summary,
        "context": {
            "question_text": question_text,
            "expected_points": expected_points,
            "key_terms": key_terms,
            "transcript_length": len(transcript.split()),
            "fluency_metrics": fluency,
            "pronunciation_metrics": pronunciation,
            "lexical_metrics": lexical
        }
    }


# ============================================================
# ANCHOR EXEMPLARS FOR CALIBRATION
# ============================================================

ANCHOR_EXEMPLARS = {
    "high": {
        "score": 90,
        "description": "Excellent response with natural fluency",
        "example": {
            "transcript": "The [pause] algorithm uses [pause] binary search to [pause] efficiently locate elements in [pause] a sorted array",
            "speech_rate": 2.2,
            "pause_ratio": 0.15,
            "characteristics": [
                "Speech rate in optimal range (2.0-2.4 wps)",
                "Natural pauses at syntactic boundaries",
                "Accurate technical terminology",
                "Good lexical diversity"
            ]
        }
    },
    "medium": {
        "score": 65,
        "description": "Adequate response with minor issues",
        "example": {
            "transcript": "Um [pause] the algorithm uses binary search [pause] to find elements [pause] in a sorted array",
            "speech_rate": 1.8,
            "pause_ratio": 0.25,
            "characteristics": [
                "Slightly slow speech rate",
                "Some filled pauses (uh, um) before technical terms",
                "Generally correct content",
                "Acceptable but not rich vocabulary"
            ]
        }
    },
    "low": {
        "score": 35,
        "description": "Poor response with significant issues",
        "example": {
            "transcript": "Um [pause] er [pause] the [pause] thing [pause] uses [pause] binary [pause] search",
            "speech_rate": 1.2,
            "pause_ratio": 0.50,
            "characteristics": [
                "Very slow speech rate (< 1.35 wps)",
                "Excessive pauses and filled pauses",
                "Incomplete or inaccurate content",
                "Limited vocabulary"
            ]
        }
    }
}


def build_calibrated_prompt(
    transcript: str,
    transcript_with_pauses: str,
    question: dict,
    metrics: GradingMetrics,
    context_chunks: list[dict] = None
) -> dict:
    """
    Build LLM prompt WITH Anchor Exemplars for better calibration.

    Based on research:
    - Anchor exemplars improve LLM consistency by 15-20%
    - Provide clear reference points for scoring
    - Reduce scoring drift across batches

    Args:
        Same as build_grading_prompt()

    Returns:
        Dict with enhanced prompt including anchors
    """
    # Get base prompt
    base = build_grading_prompt(
        transcript,
        transcript_with_pauses,
        question,
        metrics,
        context_chunks=context_chunks
    )

    # Build anchor section
    anchors_section = """
## ANCHOR EXEMPLARS (Reference Points for Calibration):

### HIGH SCORE EXAMPLE (~90/100):
"{high_example}"
Characteristics: {high_chars}

### MEDIUM SCORE EXAMPLE (~65/100):
"{medium_example}"
Characteristics: {medium_chars}

### LOW SCORE EXAMPLE (~35/100):
"{low_example}"
Characteristics: {low_chars}

Compare the student's response to these anchors to determine the appropriate score range.
Use linear interpolation between anchors if the response falls between them.
""".format(
        high_example=ANCHOR_EXEMPLARS["high"]["example"]["transcript"],
        high_chars=", ".join(ANCHOR_EXEMPLARS["high"]["example"]["characteristics"]),
        medium_example=ANCHOR_EXEMPLARS["medium"]["example"]["transcript"],
        medium_chars=", ".join(ANCHOR_EXEMPLARS["medium"]["example"]["characteristics"]),
        low_example=ANCHOR_EXEMPLARS["low"]["example"]["transcript"],
        low_chars=", ".join(ANCHOR_EXEMPLARS["low"]["example"]["characteristics"])
    )

    # Inject anchors into prompt
    enhanced_prompt = base["prompt"] + anchors_section

    return {
        "prompt": enhanced_prompt,
        "metrics_summary": base["metrics_summary"],
        "context": base["context"],
        "anchors_included": True
    }


# ============================================================
# MAIN ANALYZER FUNCTION
# ============================================================

def analyze_answer(
    segments: list,
    duration_seconds: float,
    question: dict,
    transcript: str,
    reference_text: Optional[str] = None,
    avg_logprob: Optional[float] = None,
    context_chunks: list[dict] = None,
    use_anchors: bool = True
) -> dict:
    """
    Complete answer analysis combining all metrics.

    This is the main entry point for the grading pipeline.

    Args:
        segments: Whisper segments with word timestamps
        duration_seconds: Total speaking duration
        question: Question dict with text, expected_points, key_terms
        transcript: Clean transcript text
        reference_text: Reference text for Part 2 Read Aloud
        avg_logprob: Whisper confidence score
        context_chunks: RAG context chunks
        use_anchors: Whether to include anchor exemplars

    Returns:
        Complete analysis dict

    Example:
        >>> from app import speech, metrics
        >>> result = speech.whisper("audio.wav", "en")
        >>> analysis = metrics.analyze_answer(
        ...     segments=result['segments'],
        ...     duration_seconds=30.0,
        ...     question={'text': 'Explain binary search', 'key_terms': ['O(log n)']},
        ...     transcript='Binary search divides the array...'
        ... )
    """
    # Import here to avoid circular imports
    from . import fluency
    from . import pronunciation_wer

    # 1. Analyze fluency
    fluency_result = fluency.analyze_fluency(segments, duration_seconds)

    # 2. Analyze pronunciation (if reference provided - Part 2)
    pronunciation_result = None
    if reference_text:
        pronunciation_result = pronunciation_wer.grade_reading_aloud(
            reference_text=reference_text,
            hypothesis_text=transcript,
            avg_logprob=avg_logprob
        )

    # 3. Aggregate metrics
    grading_metrics = aggregate_grading_metrics(
        fluency_result=fluency_result,
        pronunciation_result=pronunciation_result,
        transcript=transcript
    )

    # 4. Build prompt
    transcript_with_pauses = fluency_result.get('transcript_with_pauses', transcript)

    if use_anchors:
        prompt_data = build_calibrated_prompt(
            transcript=transcript,
            transcript_with_pauses=transcript_with_pauses,
            question=question,
            metrics=grading_metrics,
            context_chunks=context_chunks
        )
    else:
        prompt_data = build_grading_prompt(
            transcript=transcript,
            transcript_with_pauses=transcript_with_pauses,
            question=question,
            metrics=grading_metrics,
            reference_text=reference_text,
            context_chunks=context_chunks
        )

    return {
        # Metrics
        "fluency": fluency_result,
        "pronunciation": pronunciation_result,
        "lexical": grading_metrics.overall_metrics.get('lexical'),
        "metrics_aggregated": {
            "fluency_score": grading_metrics.fluency_score,
            "pronunciation_score": grading_metrics.pronunciation_score,
            "lexical_score": grading_metrics.lexical_score
        },

        # Prompt for LLM
        "llm_prompt": prompt_data["prompt"],
        "metrics_summary": prompt_data["metrics_summary"],
        "context": prompt_data["context"],

        # Quick summary
        "quick_summary": {
            "speech_rate_wps": fluency_result.get('speech_rate_wps'),
            "speech_rate_status": fluency_result.get('speech_rate_status'),
            "fluency_score": fluency_result.get('fluency_score'),
            "pronunciation_score": pronunciation_result.get('score') if pronunciation_result else None,
            "lexical_ttr": grading_metrics.overall_metrics.get('lexical', {}).get('ttr'),
            "word_count": fluency_result.get('word_count')
        }
    }
