"""
PTE Academic - Part 4: Re-tell Lecture (RL) Evaluation Engine
=============================================================

Standardized Pearson PTE scoring for Re-tell Lecture (40-second response):
1. Content (0 - 6):
   - 6/6: Response is clear, accurate, and demonstrates full comprehension by seamlessly paraphrasing and expanding on the main ideas in a well-organized and fluent manner
   - 5/6: Clearly and accurately captures main ideas and important details with good comprehension. The response flows generally smoothly
   - 4/6: Captures main ideas and some details with sufficient comprehension, but ideas may not be well-connected, and vocabulary can be repetitive
   - 3/6: Captures some ideas but may not be fully accurate. Consists of mainly unconnected ideas with a narrow range of vocabulary
   - 2/6: Response is mostly inaccurate, incomplete, or focuses on non-essential information with limited vocabulary and coherence
   - 1/6: Repeats isolated words or phrases without context. The response lacks coherence and meaningful communication
   - 0/6: Response is relevant to the lecture but is too limited to assign a higher score

2. Oral Fluency (0 - 5):
   - 5/5: Smooth rhythm and phrasing. No hesitations, repetitions, false starts or non-native phonological simplifications
   - 4/5: Speech has an acceptable rhythm with appropriate phrasing and word emphasis. No more than one hesitation, repetition or false start
   - 3/5: Speech is at an acceptable speed but may be uneven. Most words are spoken in continuous phrases
   - 2/5: Good fluency score but there are some hesitations, repetitions or false starts
   - 1/5: Halting and fragmented speech with multiple hesitations and pauses
   - 0/5: Slow and labored speech with little discernable phrase grouping or long pauses

3. Pronunciation (0 - 5):
   - 5/5: All vowels and consonants are produced in a native-like manner with fully appropriate stress
   - 4/5: Vowels and consonants are pronounced clearly and unambiguously. All words are easily understandable
   - 3/5: Good pronunciation score but few words are unclear. A few consonants distorted, omitted or mispronounced
   - 2/5: Some consonants and vowels consistently mispronounced; listeners need to adjust
   - 1/5: Many consonants and vowels mispronounced; strong intrusive foreign accent
   - 0/5: Speech is largely unintelligible

Total Points: 16 (Content 6 + Fluency 5 + Pronunciation 5)
Scaled PTE Score: 10 - 90
"""

import re
from typing import Dict, List, Any, Optional
from . import fluency, pronunciation_wer

DEFAULT_RL_LECTURE_TEXT = (
    "I want to talk about young people and structure. This was last Wednesday afternoon at a school in Brooklyn, New York. "
    "The trick I play in all of my school appearances is that when I get through with my little homily to the kids, "
    "I then invite them to ask questions, and when they raise their hands, I say, 'Come up,' and I make them come up and stand in front of me. "
    "I make them stand at attention like a soldier. Put your arms straight down at your side, look up, open your eyes, stare straight ahead, "
    "and speak out your question loudly so everybody can hear. No slouching, no pants hanging down, none of that stuff. "
    "So people think I'm being unkind to this kid. It's a game I play, and it comes obviously from my military experience. "
    "In the army, we put them in an environment of structure, put them in ranks, make them all wear the same clothes, "
    "cut all their hair off so they look alike, make sure that they are standing in ranks. We teach them how to go right face, "
    "left face, so they can obey instructions and know the consequences of not obeying instructions. It gives them structure. "
    "You'd be amazed at what you can do with them once you put them in that structure. They have a skill. They are mature. "
    "We need more of this kind of structure and respect in the lives of our children."
)

DEFAULT_RL_KEYWORDS = [
    "young people",
    "structure",
    "school",
    "brooklyn",
    "soldier",
    "military experience",
    "army",
    "environment",
    "ranks",
    "clothes",
    "obey instructions",
    "consequences",
    "mature",
    "respect",
    "children",
    "questions"
]

DEFAULT_RL_SAMPLE_NOTES = (
    "Main topic: Young people and structure in education and life.\n"
    "- Speaker's background: Military and army experience.\n"
    "- School event in Brooklyn: Making students stand straight like soldiers.\n"
    "- Benefits of structure: Teaches obedience, maturity, discipline, and mutual respect."
)

DEFAULT_RL_AUDIO_URL = "/demo/audio/prompt-rl"


def clean_word(word: str) -> str:
    """Normalize word for case- and punctuation-insensitive comparison."""
    if not word:
        return ""
    return re.sub(r'[^a-zA-Z0-9%]', '', word).lower()


def extract_lecture_keywords(lecture_text: str) -> List[str]:
    """Extract salient keywords and phrases from lecture transcript."""
    if not lecture_text:
        return DEFAULT_RL_KEYWORDS
    words = re.findall(r'\b[a-zA-Z]{4,}\b', lecture_text.lower())
    stopwords = {
        "that", "this", "with", "from", "they", "them", "have", "were", "been",
        "their", "what", "when", "where", "which", "there", "about", "would",
        "could", "should", "make", "want", "more", "some", "like", "into"
    }
    freq: Dict[str, int] = {}
    for w in words:
        if w not in stopwords:
            freq[w] = freq.get(w, 0) + 1
    sorted_words = sorted(freq.keys(), key=lambda k: freq[k], reverse=True)
    return sorted_words[:15] if sorted_words else DEFAULT_RL_KEYWORDS


def extract_and_tag_tokens(student_transcript: str, keywords: List[str]) -> Dict[str, Any]:
    """
    Tag student transcript tokens with `is_relevant: bool`.
    Relevant keywords from the lecture are marked as relevant (displayed in green).
    """
    words = student_transcript.strip().split()
    clean_kw_set = {clean_word(k) for k in keywords if clean_word(k)}

    transcript_lower = student_transcript.lower()
    matched_compounds = set()
    for kw in keywords:
        kw_clean = kw.strip().lower()
        if " " in kw_clean and kw_clean in transcript_lower:
            matched_compounds.add(kw_clean)

    student_tokens: List[Dict[str, Any]] = []
    matched_keywords_set = set()

    for w in words:
        w_clean = clean_word(w)
        is_rel = False

        if w_clean in clean_kw_set:
            is_rel = True
            matched_keywords_set.add(w_clean)
        else:
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
        "total_words": len(words)
    }


def score_rl_content(
    matched_keywords_count: int,
    total_keywords: int,
    student_transcript: str
) -> Dict[str, Any]:
    """
    Score Content on PTE 0-6 Pearson scale for Re-tell Lecture.
    Considers key idea recall, structural discourse connectors, and length.
    """
    words = student_transcript.strip().split()
    word_count = len(words)
    text_lower = student_transcript.lower()

    # Discourse & structural markers
    has_intro = any(k in text_lower for k in [
        "speaker", "lecture", "talked about", "discussed", "mentioned", "main topic", "presented"
    ])
    has_elaboration = any(k in text_lower for k in [
        "furthermore", "in addition", "moreover", "also", "he said", "she said", "because", "explained"
    ])
    has_conclusion = any(k in text_lower for k in [
        "in conclusion", "to conclude", "overall", "finally", "to sum up", "in summary"
    ])

    structure_score = (1 if has_intro else 0) + (1 if has_elaboration else 0) + (1 if has_conclusion else 0)

    if matched_keywords_count >= 5 and structure_score >= 2 and word_count >= 50:
        score = 6
        comment = (
            "Response is clear, accurate, and demonstrates full comprehension by seamlessly "
            "paraphrasing and expanding on the main ideas in a well-organized and fluent manner."
        )
    elif matched_keywords_count >= 4 and structure_score >= 1 and word_count >= 35:
        score = 5
        comment = (
            "Clearly and accurately captures main ideas and important details with good comprehension. "
            "The response flows generally smoothly."
        )
    elif matched_keywords_count >= 3 and word_count >= 25:
        score = 4
        comment = (
            "Captures main ideas and some details with sufficient comprehension, but ideas may not "
            "be well-connected, and vocabulary can be repetitive."
        )
    elif matched_keywords_count >= 2 and word_count >= 15:
        score = 3
        comment = (
            "Captures some ideas but may not be fully accurate. Consists of mainly unconnected ideas "
            "with a narrow range of vocabulary."
        )
    elif matched_keywords_count >= 1 and word_count >= 8:
        score = 2
        comment = (
            "Response is mostly inaccurate, incomplete, or focuses on non-essential information "
            "with limited vocabulary and coherence."
        )
    elif word_count > 2:
        score = 1
        comment = (
            "Repeats isolated words or phrases without context. The response lacks coherence "
            "and meaningful communication."
        )
    else:
        score = 0
        comment = "Response is relevant to the lecture but is too limited to assign a higher score."

    return {
        "score": score,
        "max_score": 6,
        "matched_keywords_count": matched_keywords_count,
        "total_keywords": total_keywords,
        "comment": comment
    }


def score_rl_oral_fluency(
    speech_rate_wps: float,
    pause_count: int,
    filled_pause_count: int = 0,
    has_hesitations_or_false_starts: bool = False
) -> Dict[str, Any]:
    """Score Oral Fluency on Pearson 0-5 scale for Re-tell Lecture."""
    if speech_rate_wps <= 0:
        score = 0
        comment = "No speech detected."
    elif filled_pause_count >= 3 or has_hesitations_or_false_starts or (speech_rate_wps < 1.3 and pause_count >= 4):
        score = 2
        comment = "Good fluency score but there are some hesitations, repetitions or false starts."
    elif (1.8 <= speech_rate_wps <= 3.2) and pause_count <= 2 and filled_pause_count == 0:
        score = 5
        comment = "Smooth rhythm and phrasing. No hesitations, repetitions, false starts or non-native phonological simplifications."
    elif (1.4 <= speech_rate_wps <= 3.6) and pause_count <= 4 and filled_pause_count <= 1:
        score = 4
        comment = "Speech has an acceptable rhythm with appropriate phrasing and word emphasis. No more than one hesitation, repetition or false start."
    elif speech_rate_wps >= 1.0 and pause_count <= 7:
        score = 3
        comment = "Speech is at an acceptable speed but may be uneven. Most words are spoken in continuous phrases."
    elif speech_rate_wps >= 0.5:
        score = 1
        comment = "Halting and fragmented speech with multiple hesitations and pauses."
    else:
        score = 0
        comment = "Slow and labored speech with little discernable phrase grouping or long pauses."

    return {
        "score": score,
        "max_score": 5,
        "speech_rate_wps": round(speech_rate_wps, 2),
        "pause_count": pause_count,
        "filled_pause_count": filled_pause_count,
        "comment": comment
    }


def score_rl_pronunciation(
    stt_confidence: float = 0.85,
    keyword_clarity_ratio: float = 0.7,
    word_count: int = 20
) -> Dict[str, Any]:
    """Score Pronunciation on Pearson 0-5 scale for Re-tell Lecture."""
    if word_count == 0:
        return {"score": 0, "max_score": 5, "comment": "No speech detected."}

    conf = max(0.0, min(1.0, stt_confidence))

    if conf >= 0.90 and keyword_clarity_ratio >= 0.75:
        score = 5
        comment = "All vowels and consonants are produced in a native-like manner with fully appropriate stress."
    elif conf >= 0.82 and keyword_clarity_ratio >= 0.50:
        score = 4
        comment = "Vowels and consonants are pronounced clearly and unambiguously. All words are easily understandable."
    elif conf >= 0.65 or keyword_clarity_ratio >= 0.30:
        score = 3
        comment = (
            "Good pronunciation score but few words are unclear. A few consonants in certain contexts may be regularly distorted, "
            "omitted or mispronounced. Stress-dependent vowel reduction may occur on a few words."
        )
    elif conf >= 0.45:
        score = 2
        comment = "Some consonants and vowels consistently mispronounced; listeners need to adjust."
    else:
        score = 1
        comment = "Many consonants and vowels mispronounced; strong intrusive foreign accent."

    return {
        "score": score,
        "max_score": 5,
        "stt_confidence": round(stt_confidence, 2),
        "comment": comment
    }


def evaluate_pte_retell_lecture(
    student_transcript: str,
    lecture_transcript: Optional[str] = None,
    keywords: Optional[List[str]] = None,
    sample_notes: Optional[str] = None,
    prompt_audio_url: Optional[str] = None,
    segments: Optional[List[Dict[str, Any]]] = None,
    duration_seconds: Optional[float] = None,
    stt_confidence: float = 0.85,
    student_audio_url: Optional[str] = None
) -> Dict[str, Any]:
    """Complete evaluation function for PTE Part 4: Re-tell Lecture."""
    effective_lecture = lecture_transcript or DEFAULT_RL_LECTURE_TEXT
    effective_keywords = keywords if (keywords and len(keywords) > 0) else (
        extract_lecture_keywords(effective_lecture) if not keywords else DEFAULT_RL_KEYWORDS
    )
    effective_sample = sample_notes or DEFAULT_RL_SAMPLE_NOTES
    effective_audio = prompt_audio_url or DEFAULT_RL_AUDIO_URL

    # 1. Tag tokens and keyword matching
    tagged = extract_and_tag_tokens(student_transcript, effective_keywords)
    matched_count = len(tagged["matched_keywords"])

    # 2. Content Score (0-6)
    content_res = score_rl_content(
        matched_keywords_count=matched_count,
        total_keywords=len(effective_keywords),
        student_transcript=student_transcript
    )
    content_res["matched_keywords"] = tagged["matched_keywords"]

    # 3. Oral Fluency Score (0-5)
    text_lower = student_transcript.lower()
    text_words = student_transcript.strip().split()
    hesitation_tokens = sum(1 for w in text_words if clean_word(w) in ["um", "uh", "er", "erm", "ah"])
    has_false_starts = ("um" in text_lower or "uh" in text_lower or "the uh" in text_lower)

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

    fluency_res = score_rl_oral_fluency(
        speech_rate_wps=speech_rate,
        pause_count=pause_count,
        filled_pause_count=filled_pause_count,
        has_hesitations_or_false_starts=has_false_starts or filled_pause_count >= 2
    )

    # 4. Pronunciation Score (0-5)
    keyword_clarity = (matched_count / max(1, len(effective_keywords)))
    pronun_res = score_rl_pronunciation(
        stt_confidence=stt_confidence,
        keyword_clarity_ratio=keyword_clarity,
        word_count=len(text_words)
    )

    # 5. Overall Calculation (Max 16 points)
    total_pts = content_res["score"] + fluency_res["score"] + pronun_res["score"]
    max_pts = 16
    score_10 = round((total_pts / max_pts) * 10.0, 1)
    score_90 = round(10.0 + (total_pts / max_pts) * 80.0, 1)
    score_100 = round((total_pts / max_pts) * 100.0, 1)

    return {
        "part_type": "PTE_RETELL_LECTURE",
        "transcript": student_transcript,
        "reference_text": effective_lecture,
        "sample_answer": effective_sample,
        "prompt_audio_url": effective_audio,
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
