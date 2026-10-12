import pytest
from app import pte_retell_lecture


def test_retell_lecture_perfect_response():
    lecture_text = (
        "I want to talk about young people and structure. This was last Wednesday afternoon "
        "at a school in Brooklyn, New York. In the army, we put them in an environment of structure, "
        "put them in ranks, make them all wear the same clothes, cut all their hair off. "
        "They have a skill. They are mature. We need more of this kind of structure and respect."
    )
    student_text = (
        "The speaker discussed young people and the importance of structure at a school in Brooklyn. "
        "Furthermore, he mentioned that in the army, soldiers wear the same clothes and stand in ranks, "
        "which teaches them respect and maturity. In conclusion, having more structure is beneficial."
    )
    result = pte_retell_lecture.evaluate_pte_retell_lecture(
        student_transcript=student_text,
        lecture_transcript=lecture_text,
        duration_seconds=30.0,
        stt_confidence=0.92,
    )
    assert result["scores"]["content"]["score"] >= 5
    assert result["scores"]["oral_fluency"]["score"] >= 4
    assert result["scores"]["pronunciation"]["score"] >= 4
    assert result["overall"]["score_90"] >= 70
    assert len(result["student_tokens"]) > 0


def test_retell_lecture_minimal_response():
    result = pte_retell_lecture.evaluate_pte_retell_lecture(
        student_transcript="young people school",
        duration_seconds=5.0,
        stt_confidence=0.70,
    )
    assert result["scores"]["content"]["score"] <= 2
    assert result["overall"]["total_points"] <= 6
