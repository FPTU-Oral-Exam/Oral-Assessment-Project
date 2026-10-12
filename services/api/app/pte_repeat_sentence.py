"""
PTE Academic - Part 2: Repeat Sentence (RS) Evaluation Engine
=============================================================

Standardized Pearson PTE scoring for Repeat Sentence:
1. Content (0 - 3):
   - 3/3: All or almost all words in the correct sequence (>= 85%)
   - 2/3: At least 50% of words from prompt in correct sequence (50% - 84%)
   - 1/3: Less than 50% of words from prompt in correct sequence (< 50%)
   - 0/3: Almost no words from prompt produced or empty
2. Oral Fluency (0 - 5): Speech rate, natural delivery, immediate response
3. Pronunciation (0 - 5): Phoneme clarity, acoustic confidence (Whisper logprob)

Total Points: 13 (Content: 3 + Fluency: 5 + Pronunciation: 5)
Scaled PTE Score: 10 - 90
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


def align_tokens_rs(reference_text: str, student_transcript: str) -> Dict[str, Any]:
    """
    Perform sequence alignment between reference sentence and student's transcript.

    Returns:
    - student_tokens: list of dicts with word and is_correct
    - reference_tokens: list of dicts with word and is_matched
    - matched_count: number of correct words in sequence
    - total_reference_words: total words in reference prompt
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

    # Build reference tokens to highlight what was missed/substituted in real text
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


def score_rs_content(recall_ratio: float, total_ref: int) -> Dict[str, Any]:
    """
    Score Content on PTE 0-3 scale (Repeat Sentence Pearson standard):
    - 3/3: All or almost all words in the correct sequence (>= 85%)
    - 2/3: At least 50% of words in the response from the prompt in the correct sequence (50% - 84%)
    - 1/3: Less than 50% of words in the response from the prompt in the correct sequence (> 0% - 49%)
    - 0/3: Almost no words from the prompt are produced
    """
    if recall_ratio >= 0.85:
        score = 3
        comment = "All or almost all words in the response from the prompt in the correct sequence."
    elif recall_ratio >= 0.50:
        score = 2
        comment = "At least 50% of words in the response from the prompt in the correct sequence"
    elif recall_ratio > 0.05:
        score = 1
        comment = "Less than 50% of words in the response from the prompt in the correct sequence."
    else:
        score = 0
        comment = "Almost no words from the prompt are produced."

    return {
        "score": score,
        "max_score": 3,
        "ratio_percent": round(recall_ratio * 100, 1),
        "comment": comment
    }


def score_rs_oral_fluency(
    speech_rate_wps: float,
    pause_count: int,
    filled_pause_count: int = 0
) -> Dict[str, Any]:
    """
    Score Oral Fluency on PTE 0-5 scale for short sentence repetition (2-6 seconds):
    - 5/5: Smooth rhythm, native delivery, immediate response
    - 4/5: Great fluency! (Continuous speech, no long hesitation)
    - 3/5: Uneven tempo with minor stops
    - 2/5: Slow or halting
    - 1/5: Fragmented
    """
    if (1.8 <= speech_rate_wps <= 3.2) and pause_count <= 1 and filled_pause_count == 0:
        score = 5
        comment = "Native-like rhythm, smooth phrasing with natural speed."
    elif (1.4 <= speech_rate_wps <= 3.6) and pause_count <= 2:
        score = 4
        comment = "Great fluency!"
    elif (1.0 <= speech_rate_wps <= 4.0) and pause_count <= 4:
        score = 3
        comment = "Uneven tempo with noticeable hesitation, but generally continuous."
    elif speech_rate_wps >= 0.7:
        score = 2
        comment = "Slow speech rate with frequent stops or repetitions."
    elif speech_rate_wps > 0:
        score = 1
        comment = "Halting and fragmented speech."
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


def score_rs_pronunciation(
    student_tokens: List[Dict[str, Any]],
    stt_confidence: float = 0.9,
    wer: float = 0.0
) -> Dict[str, Any]:
    """
    Score Pronunciation on PTE 0-5 scale for Repeat Sentence.
    In Repeat Sentence, words that were produced clearly by the student
    receive high acoustic clarity scores.
    - 5/5: Great pronunciation! (Native clarity, clear consonants/vowels)
    - 4/5: Good pronunciation score with easily intelligible words
    - 3/5: Fair pronunciation with a few unclear consonants or vowel reduction
    - 2/5: Distorted words
    - 1/5: Very hard to understand
    """
    # Count accuracy of student's spoken words
    correct_words = sum(1 for t in student_tokens if t.get("is_correct"))
    total_spoken = len(student_tokens)
    spoken_accuracy = (correct_words / max(1, total_spoken)) if total_spoken > 0 else 0.0

    conf = max(0.0, min(1.0, stt_confidence))

    # Composite metric
    composite = 0.6 * conf + 0.4 * spoken_accuracy

    if composite >= 0.75 and conf >= 0.80:
        score = 5
        comment = "Great pronunciation!"
    elif composite >= 0.60:
        score = 4
        comment = "Good pronunciation score; words are easily understood."
    elif composite >= 0.40 or spoken_accuracy >= 0.40:
        score = 3
        comment = (
            "Good pronunciation score but few words are unclear. "
            "A few consonants in certain contexts may be regularly distorted, "
            "omitted or mispronounced."
        )
    elif composite >= 0.20:
        score = 2
        comment = "Several consonants and vowels are distorted or unintelligible."
    elif total_spoken > 0:
        score = 1
        comment = "Frequent pronunciation errors make comprehension difficult."
    else:
        score = 0
        comment = "No speech detected."

    return {
        "score": score,
        "max_score": 5,
        "stt_confidence": round(stt_confidence, 2),
        "wer": round(wer, 4),
        "comment": comment
    }


def evaluate_pte_repeat_sentence(
    reference_text: str,
    student_transcript: str,
    segments: Optional[List[Dict[str, Any]]] = None,
    duration_seconds: Optional[float] = None,
    stt_confidence: float = 0.9,
    real_audio_url: Optional[str] = None
) -> Dict[str, Any]:
    """
    Complete PTE Repeat Sentence (Part 2) evaluation function.

    Takes prompt reference sentence and student recording analysis, returns complete PTE evaluation object:
    - Content (0 - 3)
    - Oral Fluency (0 - 5)
    - Pronunciation (0 - 5)
    - Total points (0 - 13)
    - Official PTE Scaled Score (10 - 90)
    - Colored tokens for both student response and reference prompt
    """
    # 1. Alignment & Content
    alignment = align_tokens_rs(reference_text, student_transcript)
    content_res = score_rs_content(alignment["recall_ratio"], alignment["total_reference_words"])

    # 2. Fluency Metrics
    if segments and duration_seconds and duration_seconds > 0:
        fluency_data = fluency.analyze_fluency(segments, duration_seconds)
        speech_rate = fluency_data.get("speech_rate_wps", 2.2)
        pause_count = fluency_data.get("pause_count", 0)
        filled_pause_count = fluency_data.get("filled_pause_count", 0)
    else:
        words = student_transcript.strip().split()
        dur = max(1.0, duration_seconds or (len(words) / 2.3))
        speech_rate = len(words) / dur
        pause_count = 0
        filled_pause_count = 0
        fluency_data = {
            "speech_rate_wps": round(speech_rate, 2),
            "speech_rate_status": "OPTIMAL",
            "pause_count": 0,
            "filled_pause_count": 0,
            "fluency_score": round(min(100.0, speech_rate * 45.0), 1)
        }

    fluency_res = score_rs_oral_fluency(speech_rate, pause_count, filled_pause_count)

    # 3. Pronunciation & WER
    wer_calc = pronunciation_wer.calculate_wer(reference_text, student_transcript)
    pronun_res = score_rs_pronunciation(
        student_tokens=alignment["student_tokens"],
        stt_confidence=stt_confidence,
        wer=wer_calc.wer
    )

    # 4. Overall Scoring (Max 13 points: Content 3 + Fluency 5 + Pronun 5)
    total_pts = content_res["score"] + fluency_res["score"] + pronun_res["score"]
    max_pts = 13
    score_10 = round((total_pts / max_pts) * 10.0, 1)
    score_90 = round(10.0 + (total_pts / max_pts) * 80.0, 1) # Official PTE scale 10-90
    score_100 = round((total_pts / max_pts) * 100.0, 1)

    return {
        "part_type": "PTE_REPEAT_SENTENCE",
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
            "max_points": max_pts,
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
