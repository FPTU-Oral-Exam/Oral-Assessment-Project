"""
PTE Academic - Part 3: Describe Image (DI) Evaluation Engine
=============================================================

Standardized Pearson PTE scoring for Describe Image (40-second response):
1. Content (0 - 6):
   - 6/6: Describes all key features of the image, their relationships, and an overview or conclusion.
   - 5/6: Describes all main features and their relationships, with valid comparisons.
   - 4/6: Describes some main features and basic relationships, but the description is not fully comprehensive.
   - 3/6: Describes only basic features without showing clear relationships.
   - 2/6: Deals with only one or two isolated elements of the image.
   - 1/6: Mentions isolated words without forming meaningful features.
   - 0/6: No response or does not describe the image.

2. Oral Fluency (0 - 5):
   - 5/5: Native-like rhythm, smooth phrasing with natural speed.
   - 4/5: Great fluency! Continuous speech with natural speed and flow.
   - 3/5: Acceptable fluency with uneven tempo or occasional hesitations.
   - 2/5: Good fluency score but there are some hesitations, repetitions or false starts.
   - 1/5: Halting and fragmented speech with frequent pauses.
   - 0/5: No speech detected.

3. Pronunciation (0 - 5):
   - 5/5: Native-like pronunciation; vowels and consonants are clear and accurately stressed.
   - 4/5: Very good pronunciation, easily intelligible with natural stress patterns.
   - 3/5: Good pronunciation score but few words are unclear. A few consonants in certain contexts may be regularly distorted, omitted or mispronounced. Stress-dependent vowel reduction may occur on a few words.
   - 2/5: Several consonants and vowels are distorted or unintelligible.
   - 1/5: Frequent pronunciation errors make comprehension difficult.
   - 0/5: No speech detected.

Total Points: 16 (Content 6 + Fluency 5 + Pronunciation 5)
Scaled PTE Score: 10 - 90
"""

import re
from typing import Dict, List, Any, Optional
from . import fluency, pronunciation_wer

DEFAULT_DI_SAMPLE_ANSWER = (
    "The pie chart represents the approximate composition of the air. "
    "As we can see from the chart there are oxygen, other gases, and nitrogen in the atmosphere. "
    "In addition, Nitrogen is the first most abundant gas in the atmosphere which occupies 79%, "
    "followed by Oxygen which is 20%. In terms of other gases, it includes carbon dioxide, argon, "
    "and water vapor have a proportion of 1%. In conclusion, the chart is very useful since it "
    "clearly shows the composition of the air."
)

DEFAULT_DI_KEYWORDS = [
    "composition",
    "air",
    "oxygen",
    "nitrogen",
    "gas",
    "gases",
    "atmosphere",
    "pie chart",
    "carbon dioxide",
    "argon",
    "water vapor",
    "percentage",
    "proportion",
    "79%",
    "20%",
    "1%",
    "abundant",
    "chart",
]

DEFAULT_DI_IMAGE_URL = "/images/air_composition_pie_chart.svg"


def clean_word(word: str) -> str:
    """Normalize word for case- and punctuation-insensitive comparison."""
    if not word:
        return ""
    return re.sub(r'[^a-zA-Z0-9%]', '', word).lower()


def extract_and_tag_tokens(student_transcript: str, keywords: List[str]) -> Dict[str, Any]:
    """
    Tag student transcript tokens with `is_relevant: bool`.
    In PTE Describe Image, relevant keywords from the image prompt
    are highlighted in GREEN (Relevant keywords), while ordinary words remain neutral.
    """
    words = student_transcript.strip().split()
    clean_kw_set = {clean_word(k) for k in keywords if clean_word(k)}

    # Also handle compound phrases like "pie chart", "carbon dioxide", "water vapor"
    transcript_lower = student_transcript.lower()
    matched_compounds = set()
    for kw in keywords:
        kw_clean = kw.strip().lower()
        if " " in kw_clean and kw_clean in transcript_lower:
            matched_compounds.add(kw_clean)

    student_tokens: List[Dict[str, Any]] = []
    matched_keywords_set = set()

    for idx, w in enumerate(words):
        w_clean = clean_word(w)
        is_rel = False

        # Single word match
        if w_clean in clean_kw_set:
            is_rel = True
            matched_keywords_set.add(w_clean)
        else:
            # Check compound match
            for comp in matched_compounds:
                if w_clean in comp.split():
                    is_rel = True
                    matched_keywords_set.add(comp)
                    break

        student_tokens.append({
            "word": w,
            "is_relevant": is_rel,
            "status": "relevant" if is_rel else "neutral"
        })

    return {
        "student_tokens": student_tokens,
        "matched_keywords": list(matched_keywords_set),
        "total_words": len(words),
    }


def score_di_content(
    matched_keywords_count: int,
    total_keywords: int,
    student_transcript: str,
) -> Dict[str, Any]:
    """
    Score Content on PTE 0-6 scale (Describe Image Pearson standard).
    Considers keyword recall, length, and presence of discourse markers
    (intro, comparison/data, conclusion).
    """
    words = student_transcript.strip().split()
    word_count = len(words)
    text_lower = student_transcript.lower()

    # Check structural markers
    has_intro = any(k in text_lower for k in ["picture", "chart", "graph", "diagram", "image", "shows", "presents", "represents", "see from", "illustrates"])
    has_trend_or_data = any(k in text_lower for k in ["percentage", "highest", "lowest", "most", "least", "abundant", "occupies", "percent", "%", "one", "two", "79", "20", "1"])
    has_conclusion = any(k in text_lower for k in ["conclusion", "conclude", "overall", "in summary", "to sum up", "clearly shows", "very useful"])

    # Pearson Describe Image Rubric:
    if matched_keywords_count >= 6 and has_intro and has_trend_or_data and has_conclusion and word_count >= 70:
        score = 6
        comment = "Describes all key features of the image, their relationships, and an overview or conclusion."
    elif matched_keywords_count >= 5 and has_intro and has_trend_or_data and word_count >= 50:
        score = 5
        comment = "Describes all main features and their relationships, with valid comparisons."
    elif matched_keywords_count >= 3 or (matched_keywords_count >= 2 and word_count >= 25):
        score = 4
        comment = "Describes some main features and basic relationships, but the description is not fully comprehensive."
    elif matched_keywords_count >= 2 or word_count >= 15:
        score = 3
        comment = "Describes only basic features without showing clear relationships."
    elif matched_keywords_count >= 1 or word_count >= 8:
        score = 2
        comment = "Deals with only one or two isolated elements of the image."
    elif word_count > 3:
        score = 1
        comment = "Mentions isolated words without forming meaningful features."
    else:
        score = 0
        comment = "No response or does not describe the image."

    return {
        "score": score,
        "max_score": 6,
        "matched_keywords_count": matched_keywords_count,
        "total_keywords": total_keywords,
        "comment": comment
    }


def score_di_oral_fluency(
    speech_rate_wps: float,
    pause_count: int,
    filled_pause_count: int = 0,
    has_hesitations_or_false_starts: bool = False
) -> Dict[str, Any]:
    """
    Score Oral Fluency on PTE 0-5 scale for 40-second Describe Image speech:
    - 5/5: Native-like rhythm, smooth phrasing with natural speed.
    - 4/5: Great fluency! Continuous speech with natural speed and flow.
    - 3/5: Acceptable fluency with uneven tempo or occasional hesitations.
    - 2/5: Good fluency score but there are some hesitations, repetitions or false starts.
    - 1/5: Halting and fragmented speech with frequent pauses.
    - 0/5: No speech detected.
    """
    if speech_rate_wps <= 0:
        score = 0
        comment = "No speech detected."
    elif filled_pause_count >= 3 or has_hesitations_or_false_starts or (speech_rate_wps < 1.3 and pause_count >= 4):
        score = 2
        comment = "Good fluency score but there are some hesitations, repetitions or false starts."
    elif (1.8 <= speech_rate_wps <= 3.2) and pause_count <= 2 and filled_pause_count == 0:
        score = 5
        comment = "Native-like rhythm, smooth phrasing with natural speed."
    elif (1.4 <= speech_rate_wps <= 3.6) and pause_count <= 4 and filled_pause_count <= 1:
        score = 4
        comment = "Great fluency! Continuous speech with natural speed and flow."
    elif speech_rate_wps >= 1.0 and pause_count <= 7:
        score = 3
        comment = "Acceptable fluency with uneven tempo or occasional hesitations, but generally continuous."
    elif speech_rate_wps >= 0.5:
        score = 1
        comment = "Halting and fragmented speech with frequent pauses."
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


def score_di_pronunciation(
    stt_confidence: float = 0.85,
    keyword_clarity_ratio: float = 0.7,
    word_count: int = 20
) -> Dict[str, Any]:
    """
    Score Pronunciation on PTE 0-5 scale for Describe Image:
    - 5/5: Native-like pronunciation; vowels and consonants are clear and accurately stressed.
    - 4/5: Very good pronunciation, easily intelligible with natural stress patterns.
    - 3/5: Good pronunciation score but few words are unclear. A few consonants in certain contexts may be regularly distorted, omitted or mispronounced. Stress-dependent vowel reduction may occur on a few words.
    - 2/5: Several consonants and vowels are distorted or unintelligible.
    - 1/5: Frequent pronunciation errors make comprehension difficult.
    - 0/5: No speech detected.
    """
    if word_count == 0:
        return {"score": 0, "max_score": 5, "comment": "No speech detected."}

    conf = max(0.0, min(1.0, stt_confidence))

    if conf >= 0.90 and keyword_clarity_ratio >= 0.75:
        score = 5
        comment = "Native-like pronunciation; vowels and consonants are clear and accurately stressed."
    elif conf >= 0.82 and keyword_clarity_ratio >= 0.50:
        score = 4
        comment = "Very good pronunciation, easily intelligible with natural stress patterns."
    elif conf >= 0.65 or keyword_clarity_ratio >= 0.30:
        score = 3
        comment = (
            "Good pronunciation score but few words are unclear. "
            "A few consonants in certain contexts may be regularly distorted, omitted or mispronounced. "
            "Stress-dependent vowel reduction may occur on a few words."
        )
    elif conf >= 0.45:
        score = 2
        comment = "Several consonants and vowels are distorted or unintelligible."
    else:
        score = 1
        comment = "Frequent pronunciation errors make comprehension difficult."

    return {
        "score": score,
        "max_score": 5,
        "stt_confidence": round(stt_confidence, 2),
        "comment": comment
    }


def evaluate_pte_describe_image(
    student_transcript: str,
    keywords: Optional[List[str]] = None,
    sample_answer: Optional[str] = None,
    image_url: Optional[str] = None,
    segments: Optional[List[Dict[str, Any]]] = None,
    duration_seconds: Optional[float] = None,
    stt_confidence: float = 0.85,
    student_audio_url: Optional[str] = None
) -> Dict[str, Any]:
    """
    Complete PTE Describe Image (Part 3) evaluation function.

    Takes student transcript, image keywords, and sample answer, returns full PTE evaluation object:
    - Content (0 - 6)
    - Oral Fluency (0 - 5)
    - Pronunciation (0 - 5)
    - Total points (0 - 16)
    - Official PTE Scaled Score (10 - 90)
    - Highlighted relevant keywords (in green)
    - Sample answer & Image URL for teacher review
    """
    effective_keywords = keywords if (keywords and len(keywords) > 0) else DEFAULT_DI_KEYWORDS
    effective_sample = sample_answer or DEFAULT_DI_SAMPLE_ANSWER
    effective_image = image_url or DEFAULT_DI_IMAGE_URL

    # 1. Token tagging & Keywords match
    tagged = extract_and_tag_tokens(student_transcript, effective_keywords)
    matched_count = len(tagged["matched_keywords"])

    # 2. Content Scoring (0-6)
    content_res = score_di_content(
        matched_keywords_count=matched_count,
        total_keywords=len(effective_keywords),
        student_transcript=student_transcript
    )
    content_res["matched_keywords"] = tagged["matched_keywords"]

    # 3. Oral Fluency Scoring (0-5)
    # Detect hesitations ("um", "uh", "er", "false starts")
    text_lower = student_transcript.lower()
    text_words = student_transcript.strip().split()
    hesitation_tokens = sum(1 for w in text_words if clean_word(w) in ["um", "uh", "er", "erm", "ah"])
    has_false_starts = ("um" in text_lower or "uh" in text_lower or "so it lost" in text_lower or "which on the" in text_lower)

    if segments and duration_seconds and duration_seconds > 0:
        fluency_data = fluency.analyze_fluency(segments, duration_seconds)
        speech_rate = fluency_data.get("speech_rate_wps", 1.8)
        pause_count = fluency_data.get("pause_count", 0)
        filled_pause_count = max(hesitation_tokens, fluency_data.get("filled_pause_count", 0))
    else:
        dur = max(1.0, duration_seconds or (len(text_words) / 1.5))
        speech_rate = len(text_words) / dur
        pause_count = 3 if len(text_words) > 10 else 0
        filled_pause_count = hesitation_tokens
        fluency_data = {
            "speech_rate_wps": round(speech_rate, 2),
            "speech_rate_status": "ACCEPTABLE" if speech_rate >= 1.5 else "TOO_SLOW",
            "pause_count": pause_count,
            "filled_pause_count": filled_pause_count,
            "fluency_score": round(min(100.0, speech_rate * 40.0), 1)
        }

    fluency_res = score_di_oral_fluency(
        speech_rate_wps=speech_rate,
        pause_count=pause_count,
        filled_pause_count=filled_pause_count,
        has_hesitations_or_false_starts=has_false_starts or filled_pause_count >= 2
    )

    # 4. Pronunciation Scoring (0-5)
    keyword_clarity = (matched_count / max(1, len(effective_keywords)))
    pronun_res = score_di_pronunciation(
        stt_confidence=stt_confidence,
        keyword_clarity_ratio=keyword_clarity,
        word_count=len(text_words)
    )

    # 5. Overall Score (Max 16 points: Content 6 + Fluency 5 + Pronun 5)
    total_pts = content_res["score"] + fluency_res["score"] + pronun_res["score"]
    max_pts = 16
    score_10 = round((total_pts / max_pts) * 10.0, 1)
    score_90 = round(10.0 + (total_pts / max_pts) * 80.0, 1) # Official PTE scale 10-90
    score_100 = round((total_pts / max_pts) * 100.0, 1)

    return {
        "part_type": "PTE_DESCRIBE_IMAGE",
        "transcript": student_transcript,
        "sample_answer": effective_sample,
        "image_url": effective_image,
        "keywords": effective_keywords,
        "matched_keywords": tagged["matched_keywords"],
        "student_tokens": tagged["student_tokens"],
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
        "fluency_metrics": fluency_data,
        "alignment_stats": {
            "matched_keywords_count": matched_count,
            "total_keywords": len(effective_keywords),
            "total_words": len(text_words),
            "keyword_recall_percent": round((matched_count / max(1, len(effective_keywords))) * 100.0, 1)
        }
    }
