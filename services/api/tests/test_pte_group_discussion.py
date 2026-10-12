import pytest
from app.pte_group_discussion import (
    calculate_pte_group_discussion_score,
    score_discussion_content,
    DEFAULT_SGD_DISCUSSION_TEXT,
    DEFAULT_SGD_SAMPLE_SUMMARY,
)


def test_sgd_comprehensive_summary():
    transcript = (
        "The speakers discussed the impact of artificial intelligence in creative fields. "
        "The first speaker argued that AI is a powerful tool to handle repetitive tasks and augment human creativity. "
        "However, the second speaker expressed skepticism regarding originality, homogenization of art, "
        "and ethical issues around copyright and training data. "
        "Finally, the third speaker concluded that ethical collaboration, clear regulation guidelines, "
        "and intellectual property frameworks with royalties are necessary to protect artists."
    )
    result = calculate_pte_group_discussion_score(
        student_transcript=transcript,
        discussion_text=DEFAULT_SGD_DISCUSSION_TEXT,
        sample_summary=DEFAULT_SGD_SAMPLE_SUMMARY,
        duration_sec=45.0,
        audio_confidence=0.92,
        pause_count=1,
        hesitations=0,
    )

    assert result["part_type"] == "PTE_SUMMARIZE_GROUP_DISCUSSION"
    assert result["scores"]["content"]["score"] >= 5
    assert result["scores"]["oral_fluency"]["score"] >= 4
    assert result["scores"]["pronunciation"]["score"] >= 4
    assert result["overall"]["total_points"] >= 13
    assert result["overall"]["score_90"] >= 75
    assert len(result["student_tokens"]) > 0


def test_sgd_moderate_summary():
    transcript = (
        "In this group discussion, the speakers talked about artificial intelligence and human artists. "
        "One speaker said it can help with initial ideas and save time. "
        "Another person was concerned about copyright issues and artists not getting permission. "
        "So there are different opinions about technology."
    )
    result = calculate_pte_group_discussion_score(
        student_transcript=transcript,
        discussion_text=DEFAULT_SGD_DISCUSSION_TEXT,
        sample_summary=DEFAULT_SGD_SAMPLE_SUMMARY,
        duration_sec=30.0,
        audio_confidence=0.85,
        pause_count=3,
        hesitations=1,
    )

    assert result["scores"]["content"]["score"] in [3, 4, 5]
    assert 50 <= result["overall"]["score_90"] <= 80


def test_sgd_minimal_summary():
    transcript = "artificial intelligence artists um er"
    result = calculate_pte_group_discussion_score(
        student_transcript=transcript,
        discussion_text=DEFAULT_SGD_DISCUSSION_TEXT,
        sample_summary=DEFAULT_SGD_SAMPLE_SUMMARY,
        duration_sec=8.0,
        audio_confidence=0.60,
        pause_count=4,
        hesitations=2,
    )

    assert result["scores"]["content"]["score"] <= 2
    assert result["overall"]["score_90"] <= 45
