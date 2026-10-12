from app import pte_answer_short_question


def test_asq_correct_single_word():
    result = pte_answer_short_question.evaluate_pte_asq(
        student_transcript="plumber",
        target_answers=["plumber", "a plumber"],
        question_prompt="A specialist who repairs leaking water pipes is called as?",
        duration_seconds=2.0,
        stt_confidence=0.95,
    )
    assert result["scores"]["content"]["score"] == 1
    assert result["scores"]["oral_fluency"]["score"] >= 4
    assert result["scores"]["pronunciation"]["score"] >= 4
    assert result["overall"]["score_90"] >= 80


def test_asq_correct_phrase_with_article():
    result = pte_answer_short_question.evaluate_pte_asq(
        student_transcript="a plumber",
        target_answers=["plumber"],
        duration_seconds=2.5,
        stt_confidence=0.90,
    )
    assert result["scores"]["content"]["score"] == 1


def test_asq_incorrect_answer():
    result = pte_answer_short_question.evaluate_pte_asq(
        student_transcript="electrician",
        target_answers=["plumber"],
        duration_seconds=2.0,
        stt_confidence=0.90,
    )
    assert result["scores"]["content"]["score"] == 0
    assert result["overall"]["total_points"] <= 10
