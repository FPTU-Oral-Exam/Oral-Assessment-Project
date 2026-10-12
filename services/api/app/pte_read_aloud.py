"""
PTE Academic - Part 1: Read Aloud (RA) Evaluation Engine
=========================================================

Standardized Pearson PTE scoring for Read Aloud:
1. Content (0 - 5): Word accuracy & recall rate using Sequence Alignment (Levenshtein)
2. Oral Fluency (0 - 5): Speech rate (WPS), pause distribution, and rhythm
3. Pronunciation (0 - 5): Acoustic clarity, vowel/consonant distortion, word error rate

Visual Diff:
- student_tokens: [ { "word": "...", "is_correct": bool } ]
- reference_tokens: [ { "word": "...", "is_matched": bool } ]
"""

import re
from difflib import SequenceMatcher
from typing import Dict, List, Any, Optional
from . import fluency, pronunciation_wer


def clean_word(word: str) -> str:
    """Normalize word for case- and punctuation-insensitive comparison."""
    if not word:
        return ""
    return re.sub(r'[^a-zA-Z0-9]', '', word).lower()


def align_tokens(reference_text: str, student_transcript: str) -> Dict[str, Any]:
    """
    Perform sequence alignment between reference text and student's transcript.

    Returns:
    - student_tokens: list of dicts with word and is_correct
    - reference_tokens: list of dicts with word and is_matched
    - matched_count: number of correct words
    - total_reference_words: total words in reference
    - recall_ratio: ratio of matched words to reference words
    """
    ref_words = reference_text.strip().split()
    hyp_words = student_transcript.strip().split()

    ref_clean = [clean_word(w) for w in ref_words]
    hyp_clean = [clean_word(w) for w in hyp_words]

    matcher = SequenceMatcher(None, ref_clean, hyp_clean)

    student_tokens: List[Dict[str, Any]] = []
    reference_tokens: List[Dict[str, Any]] = []
    matched_count = 0

    # Build student tokens
    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == 'equal':
            for w in hyp_words[j1:j2]:
                student_tokens.append({
                    "word": w,
                    "is_correct": True,
                    "status": "correct"
                })
                matched_count += 1
        else:
            for w in hyp_words[j1:j2]:
                student_tokens.append({
                    "word": w,
                    "is_correct": False,
                    "status": "incorrect"
                })

    # Build reference tokens to show what was missed / mispronounced in real text
    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == 'equal':
            for w in ref_words[i1:i2]:
                reference_tokens.append({
                    "word": w,
                    "is_matched": True,
                    "status": "matched"
                })
        else:
            for w in ref_words[i1:i2]:
                reference_tokens.append({
                    "word": w,
                    "is_matched": False,
                    "status": "unmatched"
                })

    total_ref = len(ref_words)
    recall_ratio = matched_count / max(1, total_ref)

    return {
        "student_tokens": student_tokens,
        "reference_tokens": reference_tokens,
        "matched_count": matched_count,
        "total_reference_words": total_ref,
        "total_student_words": len(hyp_words),
        "recall_ratio": round(recall_ratio, 4)
    }


def score_content(recall_ratio: float, total_ref: int) -> Dict[str, Any]:
    """
    Score Content on PTE 0-5 scale.
    PTE Standard:
    - 5/5: >= 90% words correct
    - 4/5: >= 70% words correct
    - 3/5: >= 50% words correct (Exact PTE Comment: "Your response has at least 50% of the words from the sentence.")
    - 2/5: >= 30% words correct
    - 1/5: > 0% words correct
    - 0/5: 0% words or empty
    """
    if recall_ratio >= 0.90:
        score = 5
        comment = "All or almost all words from the text were read accurately."
    elif recall_ratio >= 0.70:
        score = 4
        comment = "Most words from the sentence were read accurately."
    elif recall_ratio >= 0.50:
        score = 3
        comment = "Your response has at least 50% of the words from the sentence."
    elif recall_ratio >= 0.30:
        score = 2
        comment = "Between 30% and 50% of the words from the sentence were read."
    elif recall_ratio > 0.05:
        score = 1
        comment = "Less than 30% of the words from the sentence were read."
    else:
        score = 0
        comment = "No words from the sentence were recognized or response is empty."

    return {
        "score": score,
        "max_score": 5,
        "ratio_percent": round(recall_ratio * 100, 1),
        "comment": comment
    }


def score_oral_fluency(
    speech_rate_wps: float,
    pause_count: int,
    filled_pause_count: int = 0
) -> Dict[str, Any]:
    """
    Score Oral Fluency on PTE 0-5 scale.
    PTE Standard:
    - 5/5: Smooth rhythm, natural native-like speed (2.1 - 2.8 wps), <= 1 pause
    - 4/5: Great fluency! (1.7 - 3.2 wps, <= 3 pauses)
    - 3/5: Uneven tempo with noticeable pauses (1.3 - 3.5 wps, <= 5 pauses)
    - 2/5: Halting, slow speech rate
    - 1/5: Extremely fragmented with long hesitation pauses
    """
    if (2.1 <= speech_rate_wps <= 2.85) and pause_count <= 1 and filled_pause_count == 0:
        score = 5
        comment = "Native-like rhythm, smooth phrasing with natural speed and no hesitations."
    elif (1.65 <= speech_rate_wps <= 3.2) and pause_count <= 3 and filled_pause_count <= 1:
        score = 4
        comment = "Great fluency!"
    elif (1.25 <= speech_rate_wps <= 3.6) and pause_count <= 6:
        score = 3
        comment = "Acceptable fluency with uneven tempo or occasional hesitations, but generally continuous."
    elif speech_rate_wps >= 0.9:
        score = 2
        comment = "Slow speech rate with frequent stops, hesitations, or inappropriate phrasing."
    elif speech_rate_wps > 0:
        score = 1
        comment = "Speech is halting and fragmented, with frequent long pauses throughout."
    else:
        score = 0
        comment = "No speech detected."

    return {
        "score": score,
        "max_score": 5,
        "speech_rate_wps": round(speech_rate_wps, 2),
        "pause_count": pause_count,
        "filled_pause_count": filled_pause_count,
        "comment": comment
    }


def score_pronunciation(
    recall_ratio: float,
    stt_confidence: float = 0.9,
    wer: float = 0.0
) -> Dict[str, Any]:
    """
    Score Pronunciation on PTE 0-5 scale based on WER accuracy and acoustic confidence.
    Exact PTE Comment for 3/5:
    "Good pronunciation score but few words are unclear. A few consonants in certain contexts
    may be regularly distorted, omitted or mispronounced. Stress-dependent vowel reduction may occur on a few words."
    """
    # Accuracy factor from correct words (0.0 to 1.0)
    acc = max(0.0, min(1.0, recall_ratio))
    # Confidence factor (scale 0.0 to 1.0)
    conf = max(0.0, min(1.0, stt_confidence))

    # Combined composite score
    composite = 0.75 * acc + 0.25 * conf

    if composite >= 0.88 and wer <= 0.10:
        score = 5
        comment = "Native-like pronunciation; vowels and consonants are clear and accurately stressed."
    elif composite >= 0.72 and wer <= 0.25:
        score = 4
        comment = "Very good pronunciation, easily intelligible with natural stress patterns."
    elif composite >= 0.45 or (acc >= 0.45):
        score = 3
        comment = (
            "Good pronunciation score but few words are unclear. "
            "A few consonants in certain contexts may be regularly distorted, "
            "omitted or mispronounced. Stress-dependent vowel reduction may occur on a few words."
        )
    elif composite >= 0.25:
        score = 2
        comment = "Intermediate pronunciation; several consonants and vowels are distorted or unclear."
    elif acc > 0:
        score = 1
        comment = "Frequent pronunciation errors make comprehension difficult."
    else:
        score = 0
        comment = "Pronunciation could not be evaluated due to missing speech."

    return {
        "score": score,
        "max_score": 5,
        "wer": round(wer, 4),
        "stt_confidence": round(stt_confidence, 2),
        "comment": comment
    }


def evaluate_pte_read_aloud(
    reference_text: str,
    student_transcript: str,
    segments: Optional[List[Dict[str, Any]]] = None,
    duration_seconds: Optional[float] = None,
    stt_confidence: float = 0.9,
    real_audio_url: Optional[str] = None
) -> Dict[str, Any]:
    """
    Complete PTE Read Aloud (Part 1) evaluation function.

    Takes reference text and student speech analysis, returns complete PTE evaluation object:
    - Content (0 - 5)
    - Oral Fluency (0 - 5)
    - Pronunciation (0 - 5)
    - Overall score (0 - 90 / 0 - 100)
    - Colored tokens for both student transcript and reference text
    - Full comments matching PTE Academic official reports
    """
    # 1. Alignment & Content
    alignment = align_tokens(reference_text, student_transcript)
    content_res = score_content(alignment["recall_ratio"], alignment["total_reference_words"])

    # 2. Fluency Metrics
    if segments and duration_seconds and duration_seconds > 0:
        fluency_data = fluency.analyze_fluency(segments, duration_seconds)
        speech_rate = fluency_data.get("speech_rate_wps", 1.8)
        pause_count = fluency_data.get("pause_count", 2)
        filled_pause_count = fluency_data.get("filled_pause_count", 0)
    else:
        # Fallback estimation if raw segments not supplied
        words = student_transcript.strip().split()
        dur = max(1.0, duration_seconds or (len(words) / 2.2))
        speech_rate = len(words) / dur
        pause_count = max(0, int(dur * 0.15))
        filled_pause_count = 0
        fluency_data = {
            "speech_rate_wps": round(speech_rate, 2),
            "speech_rate_status": "OPTIMAL" if 2.0 <= speech_rate <= 2.8 else "ACCEPTABLE",
            "pause_count": pause_count,
            "filled_pause_count": 0,
            "fluency_score": round(min(100.0, speech_rate * 40.0), 1)
        }

    fluency_res = score_oral_fluency(speech_rate, pause_count, filled_pause_count)

    # 3. Pronunciation & WER
    wer_calc = pronunciation_wer.calculate_wer(reference_text, student_transcript)
    pronun_res = score_pronunciation(
        recall_ratio=alignment["recall_ratio"],
        stt_confidence=stt_confidence,
        wer=wer_calc.wer
    )

    # 4. Overall Scoring
    total_pts = content_res["score"] + fluency_res["score"] + pronun_res["score"]
    score_10 = round((total_pts / 15.0) * 10.0, 1)
    score_90 = round((total_pts / 15.0) * 90.0, 1) # Official PTE scale (10 - 90)
    score_100 = round((total_pts / 15.0) * 100.0, 1)

    return {
        "part_type": "PTE_READ_ALOUD",
        "reference_text": reference_text,
        "transcript": student_transcript,
        "stt_confidence": round(stt_confidence, 3),
        "scores": {
            "content": content_res,
            "oral_fluency": fluency_res,
            "pronunciation": pronun_res,
        },
        "overall": {
            "total_points": total_pts,
            "max_points": 15,
            "score_10": score_10,
            "score_90": score_90,
            "score_100": score_100,
        },
        "student_tokens": alignment["student_tokens"],
        "reference_tokens": alignment["reference_tokens"],
        "alignment_stats": {
            "matched_words": alignment["matched_count"],
            "total_reference_words": alignment["total_reference_words"],
            "total_student_words": alignment["total_student_words"],
            "recall_percentage": alignment["recall_ratio"] * 100.0,
            "wer": round(wer_calc.wer * 100.0, 1),
            "substitutions": wer_calc.substitutions,
            "deletions": wer_calc.deletions,
            "insertions": wer_calc.insertions,
        },
        "fluency_metrics": fluency_data,
        "real_audio_url": real_audio_url,
    }
