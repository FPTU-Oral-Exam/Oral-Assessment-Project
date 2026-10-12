"""
PTE Academic - Part 6: Summarize Group Discussion (SGD) Evaluation Engine
========================================================================

Standardized Pearson PTE scoring for Summarize Group Discussion (40-90 second response):
1. Content (0 - 6):
   - 6/6: Clear, accurate summary capturing central topic and multiple speaker viewpoints with synthesis and discourse markers
   - 5/6: Accurately captures central topic and distinct viewpoints from at least 2 speakers
   - 4/6: Captures main topic and some speaker details, but with limited connections
   - 3/6: Captures general topic with broad statements and narrow vocabulary
   - 2/6: Limited summary with isolated, disconnected points
   - 1/6: Repeats isolated words without coherent context
   - 0/6: Irrelevant or silent response

2. Oral Fluency (0 - 5):
   - 5/5: Smooth rhythm and phrasing. Native-like pacing, no hesitations or false starts
   - 4/5: Acceptable rhythm with appropriate phrasing and word emphasis (<= 1 hesitation)
   - 3/5: Acceptable speed, mostly continuous phrasing with minor hesitations
   - 2/5: Noticeable hesitations, repetitions or false starts
   - 1/5: Halting and fragmented speech with multiple pauses
   - 0/5: Slow, labored speech with excessive silence

3. Pronunciation (0 - 5):
   - 5/5: Native-like phonetic clarity, stress and intonation
   - 4/5: Vowels and consonants clearly pronounced; easily intelligible
   - 3/5: Good pronunciation with few unclear words or slight accent
   - 2/5: Inconsistent pronunciation requiring listener effort
   - 1/5: Frequent distortions and heavy intrusive accent
   - 0/5: Largely unintelligible

Total Points: 16 (Content 6 + Fluency 5 + Pronunciation 5)
Scaled PTE Score: 10 - 90
"""

import re
from typing import Dict, List, Any, Optional
from . import fluency, pronunciation_wer

DEFAULT_SGD_DISCUSSION_TEXT = (
    "Speaker 1: I think the biggest shift we're seeing in creative fields is the integration of Artificial Intelligence. "
    "Some people are worried that AI will replace human artists, but I see it more as a powerful tool. "
    "It can handle repetitive tasks and generate initial ideas, which frees up artists to focus on the more complex, emotional aspects of creativity.\n\n"
    "Speaker 2: I see your point, but I'm more skeptical. My concern is about originality. If everyone is using the same AI models, won't we see a homogenization of art? "
    "The unique style of an artist might get lost. Plus, there are ethical issues around copyright, especially when AI is trained on existing artists' work without their permission.\n\n"
    "Speaker 3: Both are valid points. I think the solution lies in regulation and how we use the technology. "
    "AI is incredibly efficient for brainstorming and creating variations, which is a huge benefit. However, we need clear guidelines on data usage and intellectual property to protect artists.\n\n"
    "Speaker 1: Exactly. For example, a designer could use AI to generate a hundred different logo concepts in minutes, but it still requires a human eye to select the best one and refine it. "
    "It's about augmenting our process, not automating our judgment. The final emotional connection comes from the artist.\n\n"
    "Speaker 2: But that reliance can become a crutch. If young artists lean too heavily on AI for initial ideas, they might not develop their own fundamental skills of sketching and conceptualization. "
    "It could lead to a generation of artists who are great curators but not necessarily great creators. The ethical point about training data also remains a major unresolved issue.\n\n"
    "Speaker 3: I agree, which is why the framework is so important. The future isn't about AI versus human artists; it's about ethical collaboration. "
    "This framework should ensure transparent data sourcing and perhaps even a system for royalties. The goal should be to augment human creativity, not replace it, and that requires rules to protect both originality and the rights of all creators."
)

DEFAULT_SGD_KEYWORDS = [
    # Topic
    "artificial intelligence",
    "ai",
    "creative fields",
    "human artists",
    "creativity",
    # Speaker 1
    "powerful tool",
    "repetitive tasks",
    "initial ideas",
    "augmenting",
    "emotional connection",
    # Speaker 2
    "skeptical",
    "originality",
    "homogenization",
    "ethical issues",
    "copyright",
    "training data",
    "curators",
    "creators",
    # Speaker 3
    "regulation",
    "guidelines",
    "intellectual property",
    "framework",
    "ethical collaboration",
    "transparent data",
    "royalties",
]

DEFAULT_SGD_SAMPLE_SUMMARY = (
    "The speakers discussed the impact of artificial intelligence in creative fields.\n"
    "- Speaker 1 argued that AI is a powerful tool to handle repetitive tasks and augment human creativity.\n"
    "- Speaker 2 raised concerns regarding artistic originality, homogenization, and copyright issues with uncredited training data.\n"
    "- Speaker 3 advocated for regulation, transparent data sourcing, and intellectual property frameworks to foster ethical collaboration."
)

DEFAULT_SGD_AUDIO_URL = "/demo/audio/prompt-sgd"

DISCOURSE_MARKERS = [
    "speaker",
    "first speaker",
    "second speaker",
    "third speaker",
    "one speaker",
    "another speaker",
    "argued",
    "pointed out",
    "mentioned",
    "stated",
    "believed",
    "concerned",
    "skeptical",
    "suggested",
    "proposed",
    "concluded",
    "in conclusion",
    "overall",
    "they discussed",
    "agreed",
]


def clean_word(word: str) -> str:
    """Normalize word for case- and punctuation-insensitive comparison."""
    if not word:
        return ""
    return re.sub(r'[^a-zA-Z0-9%]', '', word).lower()


def extract_discussion_keywords(discussion_text: str) -> List[str]:
    """Extract salient keywords and phrases from discussion transcript."""
    if not discussion_text or discussion_text.strip() == DEFAULT_SGD_DISCUSSION_TEXT.strip():
        return DEFAULT_SGD_KEYWORDS

    words = re.findall(r'\b[a-zA-Z]{4,}\b', discussion_text.lower())
    stopwords = {
        "that", "this", "with", "from", "they", "them", "have", "were", "been",
        "their", "what", "when", "where", "which", "there", "about", "would",
        "could", "should", "make", "want", "more", "some", "like", "into", "speaker"
    }
    freq: Dict[str, int] = {}
    for w in words:
        if w not in stopwords:
            freq[w] = freq.get(w, 0) + 1
    sorted_words = sorted(freq.keys(), key=lambda k: freq[k], reverse=True)
    return sorted_words[:20] if sorted_words else DEFAULT_SGD_KEYWORDS


def extract_and_tag_tokens(student_transcript: str, keywords: List[str]) -> Dict[str, Any]:
    """Tag student transcript tokens with relevance for UI highlight."""
    words = student_transcript.strip().split()
    clean_kw_set = {clean_word(k) for k in keywords if clean_word(k)}

    transcript_lower = student_transcript.lower()
    matched_compounds = set()
    for kw in keywords:
        kw_clean = kw.strip().lower()
        if " " in kw_clean and kw_clean in transcript_lower:
            matched_compounds.add(kw_clean)

    tokens = []
    matched_set = set()

    for word in words:
        cw = clean_word(word)
        is_rel = False

        if cw in clean_kw_set:
            is_rel = True
            matched_set.add(cw)
        else:
            for compound in matched_compounds:
                if cw and cw in compound.split():
                    is_rel = True
                    matched_set.add(compound)
                    break

        tokens.append({
            "word": word,
            "is_relevant": is_rel,
            "status": "relevant" if is_rel else "unmatched"
        })

    return {
        "tokens": tokens,
        "matched_keywords": list(matched_set),
        "matched_count": len(matched_set)
    }


def score_discussion_content(
    student_transcript: str,
    discussion_text: str = DEFAULT_SGD_DISCUSSION_TEXT,
    sample_summary: str = DEFAULT_SGD_SAMPLE_SUMMARY,
) -> Dict[str, Any]:
    """
    Score PTE Part 6 Content (0 - 6 points):
    Evaluates topic recall, speaker perspectives, and discourse markers.
    """
    if not student_transcript or not student_transcript.strip():
        return {
            "score": 0,
            "max_score": 6,
            "matched_keywords": [],
            "comment": "No response recorded or completely silent."
        }

    keywords = extract_discussion_keywords(discussion_text)
    tag_result = extract_and_tag_tokens(student_transcript, keywords)
    matched_kws = tag_result["matched_keywords"]
    matched_count = len(matched_kws)

    # Check for speaker attribution discourse markers
    student_lower = student_transcript.lower()
    discourse_matches = [dm for dm in DISCOURSE_MARKERS if dm in student_lower]
    discourse_bonus = len(discourse_matches) >= 2

    # Topic coverage checks (Speaker 1, 2, 3 viewpoints)
    spk1_terms = ["tool", "repetitive", "ideas", "augmenting", "concept", "designer"]
    spk2_terms = ["skeptical", "originality", "homogenization", "ethical", "copyright", "curator", "crutch"]
    spk3_terms = ["regulation", "guideline", "intellectual", "framework", "collaboration", "royalties", "transparent"]

    has_spk1 = any(term in student_lower for term in spk1_terms)
    has_spk2 = any(term in student_lower for term in spk2_terms)
    has_spk3 = any(term in student_lower for term in spk3_terms)
    speaker_coverage = sum([has_spk1, has_spk2, has_spk3])

    if (matched_count >= 7 and speaker_coverage >= 2) or (matched_count >= 6 and speaker_coverage >= 2 and discourse_bonus):
        score = 6
        comment = (
            "Response is clear, comprehensive, and accurately synthesizes multiple speaker perspectives "
            "with seamless discourse attribution and rich vocabulary."
        )
    elif matched_count >= 5 or (matched_count >= 4 and speaker_coverage >= 2):
        score = 5
        comment = (
            "Accurately summarizes the central topic and distinct viewpoints of at least two speakers "
            "with good comprehension and fluent transitions."
        )
    elif matched_count >= 4 or (matched_count >= 3 and speaker_coverage >= 1):
        score = 4
        comment = (
            "Captures main ideas and some speaker details with sufficient comprehension, "
            "though connections between viewpoints could be stronger."
        )
    elif matched_count >= 3 or (matched_count >= 2 and speaker_coverage >= 1):
        score = 3
        comment = (
            "Captures the general topic but with broad, unconnected statements and limited speaker attribution."
        )
    elif matched_count >= 2:
        score = 2
        comment = "Response is limited, mentioning isolated points with narrow vocabulary and incomplete ideas."
    elif matched_count >= 1:
        score = 1
        comment = "Repeats isolated words or fragments without coherent context or clear synthesis."
    else:
        score = 0
        comment = "Response did not cover any relevant key points from the group discussion."

    return {
        "score": score,
        "max_score": 6,
        "matched_keywords": matched_kws,
        "speaker_coverage": speaker_coverage,
        "discourse_markers_found": discourse_matches,
        "comment": comment
    }


def score_sgd_fluency(
    student_transcript: str,
    duration_sec: float,
    pause_count: int = 0,
    hesitations: int = 0,
) -> Dict[str, Any]:
    """Score Oral Fluency (0 - 5 points) based on speech rate, hesitations, and pauses."""
    words = student_transcript.strip().split()
    word_count = len(words)

    if word_count == 0 or duration_sec <= 0:
        return {
            "score": 0,
            "max_score": 5,
            "speech_rate_wps": 0.0,
            "comment": "No detectable continuous speech."
        }

    # Count filled pauses via word boundaries
    hesitation_matches = len(re.findall(r'\b(um|uh|er|ah|erm)\b', student_transcript.lower()))
    total_hesitations = max(hesitations, hesitation_matches)

    wps = word_count / duration_sec

    # Baseline score by WPS
    if 1.6 <= wps <= 2.8:
        base_score = 5
    elif 1.3 <= wps <= 3.2:
        base_score = 4
    elif 1.0 <= wps <= 3.6:
        base_score = 3
    elif 0.7 <= wps <= 4.0:
        base_score = 2
    else:
        base_score = 1

    # Penalties for hesitations and excessive pauses
    penalty = 0
    if total_hesitations >= 3:
        penalty += 2
    elif total_hesitations >= 1:
        penalty += 1

    if pause_count >= 4:
        penalty += 2
    elif pause_count >= 2:
        penalty += 1

    final_score = max(1, min(5, base_score - penalty))

    comments = {
        5: "Smooth rhythm and phrasing. Native-like pacing with no hesitations or false starts.",
        4: "Speech has an acceptable rhythm with appropriate phrasing and word emphasis. Minimal hesitation.",
        3: "Speech is at an acceptable speed but may be uneven. Most words are spoken in continuous phrases.",
        2: "Noticeable hesitations, repetitions or uneven pauses interrupting the flow of ideas.",
        1: "Halting and fragmented speech with multiple pauses and hesitations.",
        0: "Slow, labored speech with excessive silence."
    }

    return {
        "score": final_score,
        "max_score": 5,
        "speech_rate_wps": round(wps, 2),
        "hesitation_count": total_hesitations,
        "pause_count": pause_count,
        "comment": comments.get(final_score, "Acceptable fluency.")
    }


def score_sgd_pronunciation(
    confidence_score: float,
    wer: float = 0.0,
) -> Dict[str, Any]:
    """Score Pronunciation (0 - 5 points) based on acoustic clarity and intelligibility."""
    if confidence_score >= 0.90:
        score = 5
        comment = "All vowels and consonants are produced in a native-like manner with fully appropriate stress."
    elif confidence_score >= 0.82:
        score = 4
        comment = "Vowels and consonants are pronounced clearly and unambiguously. All words are easily understandable."
    elif confidence_score >= 0.70:
        score = 3
        comment = "Good pronunciation score but few words are unclear. A few consonants distorted or mispronounced."
    elif confidence_score >= 0.55:
        score = 2
        comment = "Some consonants and vowels consistently mispronounced; requires occasional listener adjustment."
    elif confidence_score >= 0.35:
        score = 1
        comment = "Many consonants and vowels mispronounced; strong intrusive accent."
    else:
        score = 0
        comment = "Speech is largely unintelligible."

    return {
        "score": score,
        "max_score": 5,
        "confidence": confidence_score,
        "comment": comment
    }


def calculate_pte_group_discussion_score(
    student_transcript: str,
    discussion_text: str = DEFAULT_SGD_DISCUSSION_TEXT,
    duration_sec: float = 40.0,
    audio_confidence: float = 0.85,
    pause_count: int = 0,
    hesitations: int = 0,
    sample_summary: str = DEFAULT_SGD_SAMPLE_SUMMARY,
) -> Dict[str, Any]:
    """
    Main entry point for evaluating PTE Part 6: Summarize Group Discussion (SGD).
    """
    content_res = score_discussion_content(student_transcript, discussion_text, sample_summary)
    fluency_res = score_sgd_fluency(student_transcript, duration_sec, pause_count, hesitations)
    pron_res = score_sgd_pronunciation(audio_confidence)

    total_points = content_res["score"] + fluency_res["score"] + pron_res["score"]
    max_points = 16

    # Pearson 10 - 90 scaling: Score = 10 + (total_points / 16) * 80
    score_90 = round(10.0 + (total_points / max_points) * 80.0, 1)
    score_10 = round((total_points / max_points) * 10.0, 1)
    score_100 = round((total_points / max_points) * 100.0, 1)

    keywords = extract_discussion_keywords(discussion_text)
    tag_result = extract_and_tag_tokens(student_transcript, keywords)

    return {
        "part_type": "PTE_SUMMARIZE_GROUP_DISCUSSION",
        "exercise": "Summarize Group Discussion",
        "transcript": student_transcript,
        "reference_text": discussion_text,
        "sample_answer": sample_summary,
        "prompt_audio_url": DEFAULT_SGD_AUDIO_URL,
        "scores": {
            "content": content_res,
            "oral_fluency": fluency_res,
            "pronunciation": pron_res,
        },
        "overall": {
            "total_points": total_points,
            "max_points": max_points,
            "score_10": score_10,
            "score_90": score_90,
            "score_100": score_100,
        },
        "student_tokens": tag_result["tokens"],
        "alignment_stats": {
            "matched_keywords_count": tag_result["matched_count"],
            "matched_keywords": tag_result["matched_keywords"],
            "total_student_words": len(student_transcript.strip().split()),
            "speech_rate_wps": fluency_res["speech_rate_wps"]
        },
        "feedback": (
            f"Content: {content_res['score']}/6. "
            f"Oral Fluency: {fluency_res['score']}/5. "
            f"Pronunciation: {pron_res['score']}/5. "
            f"Overall PTE Score: {score_90}/90."
        )
    }
