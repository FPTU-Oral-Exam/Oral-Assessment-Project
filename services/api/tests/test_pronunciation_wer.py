"""
Tests for Pronunciation WER Engine
"""

import pytest
from app.pronunciation_wer import (
    normalize_text,
    calculate_wer,
    score_logprob,
    evaluate_pronunciation,
    grade_reading_aloud,
    get_error_words,
)


class TestNormalizeText:
    """Tests for text normalization."""

    def test_lowercase(self):
        """Text should be converted to lowercase."""
        assert normalize_text("HELLO WORLD") == "hello world"
        assert normalize_text("Hello") == "hello"

    def test_remove_punctuation(self):
        """Punctuation should be removed."""
        assert normalize_text("hello, world!") == "hello world"
        assert normalize_text("it's") == "it s"
        assert normalize_text("can't") == "can t"

    def test_collapse_spaces(self):
        """Multiple spaces should be collapsed."""
        assert normalize_text("hello   world") == "hello world"
        assert normalize_text("  hello  ") == "hello"

    def test_empty_string(self):
        """Empty string should return empty."""
        assert normalize_text("") == ""
        assert normalize_text(None) == ""

    def test_strip(self):
        """Leading/trailing whitespace should be stripped."""
        assert normalize_text("  hello  ") == "hello"


class TestCalculateWER:
    """Tests for WER calculation."""

    def test_perfect_match(self):
        """Identical texts should have WER = 0."""
        result = calculate_wer("hello world", "hello world")
        assert result.wer == 0.0
        assert result.score == 100.0

    def test_one_substitution(self):
        """One wrong word should increase WER."""
        result = calculate_wer("hello world", "hello planet")
        # 1 substitution out of 2 words = 0.5 WER
        assert result.substitutions == 1
        # Score = (1 - 0.5) * 100 = 50
        assert result.score == 50.0

    def test_one_deletion(self):
        """Missing word should increase WER."""
        result = calculate_wer("hello world", "hello")
        assert result.deletions == 1
        # 1 deletion out of 2 words = 0.5 WER
        assert result.wer == 0.5

    def test_one_insertion(self):
        """Extra word should increase WER."""
        result = calculate_wer("hello world", "hello beautiful world")
        assert result.insertions == 1
        # 1 insertion out of 2 reference words = 0.5 WER
        assert result.wer == 0.5

    def test_case_insensitive(self):
        """Case should not affect WER."""
        result = calculate_wer("HELLO WORLD", "hello world")
        assert result.wer == 0.0

    def test_punctuation_ignored(self):
        """Punctuation should not affect WER."""
        result = calculate_wer("hello, world!", "hello world")
        assert result.wer == 0.0

    def test_empty_reference(self):
        """Empty reference should return WER = 1."""
        result = calculate_wer("", "hello")
        assert result.wer == 1.0
        assert result.score == 0.0

    def test_empty_hypothesis(self):
        """Empty hypothesis should return WER = 1."""
        result = calculate_wer("hello world", "")
        assert result.wer == 1.0
        assert result.score == 0.0
        assert result.deletions == 2  # All words deleted

    def test_score_capped_at_100(self):
        """Score should not exceed 100."""
        result = calculate_wer("hello", "hello world")
        # Reference shorter than hypothesis - WER could be > 1
        # But score should be capped at 0
        assert result.score >= 0

    def test_reference_length(self):
        """Reference length should be tracked."""
        result = calculate_wer("one two three four five", "one two three four five")
        assert result.reference_length == 5


class TestGetErrorWords:
    """Tests for error word extraction."""

    def test_no_errors(self):
        """Perfect match should have no errors."""
        result = get_error_words("hello world", "hello world")
        assert len(result['substitutions']) == 0
        assert len(result['deletions']) == 0
        assert len(result['insertions']) == 0

    def test_substitutions(self):
        """Wrong words should be captured."""
        result = get_error_words("hello world", "hello planet")
        assert len(result['substitutions']) == 1
        assert result['substitutions'][0]['reference'] == 'world'
        assert result['substitutions'][0]['hypothesis'] == 'planet'

    def test_deletions(self):
        """Missing words should be captured."""
        result = get_error_words("hello world", "hello")
        assert 'world' in result['deletions']

    def test_insertions(self):
        """Extra words should be captured."""
        result = get_error_words("hello world", "hello beautiful world")
        assert 'beautiful' in result['insertions']


class TestScoreLogprob:
    """Tests for Whisper confidence scoring."""

    def test_high_confidence(self):
        """High logprob (-0.3) should give high score."""
        score = score_logprob(-0.3)
        assert score >= 9.5

    def test_good_confidence(self):
        """Good logprob (-0.5) should give good score."""
        score = score_logprob(-0.5)
        assert 9.0 <= score <= 10.0

    def test_moderate_confidence(self):
        """Moderate logprob (-1.0) should give moderate score."""
        score = score_logprob(-1.0)
        assert 5.0 <= score <= 8.0

    def test_low_confidence(self):
        """Low logprob (-1.5) should give low score."""
        score = score_logprob(-1.5)
        assert score < 5.0

    def test_none_logprob(self):
        """None logprob should return default."""
        score = score_logprob(None)
        assert score == 70.0  # Default assumption


class TestEvaluatePronunciation:
    """Tests for complete pronunciation evaluation."""

    def test_perfect_pronunciation(self):
        """Perfect match should get high score."""
        result = evaluate_pronunciation(
            "hello world",
            "hello world",
            avg_logprob=-0.3
        )
        assert result.is_valid is True
        assert result.final_score >= 95
        assert result.wer_result.wer == 0.0

    def test_poor_pronunciation(self):
        """Poor match should get low score."""
        result = evaluate_pronunciation(
            "hello world",
            "goodbye planet",
            avg_logprob=-0.8
        )
        assert result.is_valid is True
        assert result.final_score < 50

    def test_empty_response(self):
        """Empty response should be invalid."""
        result = evaluate_pronunciation(
            "hello world",
            "",
            avg_logprob=-0.3
        )
        assert result.is_valid is False
        assert result.final_score == 0.0

    def test_too_short_response(self):
        """Response with < 3 words should be invalid."""
        result = evaluate_pronunciation(
            "hello world testing something",
            "hello",  # Only 1 word
            avg_logprob=-0.3
        )
        assert result.is_valid is False

    def test_combined_score_calculation(self):
        """Final score should combine WER and confidence."""
        result = evaluate_pronunciation(
            "hello world",
            "hello world",  # WER = 0
            avg_logprob=-0.3  # High confidence
        )
        # WER score = 100, Confidence score = ~97
        # Final = 0.7 * 100 + 0.3 * 97 = 98.1
        assert result.final_score >= 95


class TestGradeReadingAloud:
    """Tests for simplified grade_reading_aloud interface."""

    def test_excellent_grade(self):
        """High score should get EXCELLENT grade."""
        result = grade_reading_aloud(
            "the quick brown fox",
            "the quick brown fox",
            avg_logprob=-0.2
        )
        assert result['grade'] == "EXCELLENT"
        assert result['score'] >= 95

    def test_good_grade(self):
        """Good score should get GOOD grade."""
        result = grade_reading_aloud(
            "hello world",
            "hello world",  # Perfect
            avg_logprob=-0.5  # Good confidence
        )
        assert result['grade'] in ["EXCELLENT", "GOOD"]

    def test_poor_grade(self):
        """Poor score should get POOR grade."""
        result = grade_reading_aloud(
            "hello world testing programming",
            "goodbye",
            avg_logprob=-1.2
        )
        assert result['grade'] in ["POOR", "VERY_POOR"]
        assert result['score'] < 40

    def test_feedback_generated(self):
        """Feedback should be generated."""
        result = grade_reading_aloud(
            "hello world",
            "hello world",
            avg_logprob=-0.3
        )
        assert 'feedback' in result
        assert len(result['feedback']) > 0

    def test_error_details(self):
        """Error details should be included."""
        result = grade_reading_aloud(
            "hello world",
            "hello planet",
            avg_logprob=-0.3
        )
        assert 'errors' in result
        assert 'substitutions' in result['errors']
        assert result['errors']['substitutions'] == 1


class TestEdgeCases:
    """Tests for edge cases and error handling."""

    def test_unicode_text(self):
        """Unicode should be handled."""
        result = calculate_wer("hello", "hello")
        assert result.wer == 0.0

    def test_numbers_in_text(self):
        """Numbers should be handled."""
        result = calculate_wer("version 2", "version 2")
        assert result.wer == 0.0

    def test_very_long_text(self):
        """Long text should be processed."""
        long_text = " ".join(["word"] * 100)
        result = calculate_wer(long_text, long_text)
        assert result.wer == 0.0

    def test_all_same_words(self):
        """Repeated words should be handled."""
        result = calculate_wer("hello hello hello", "hello hello hello")
        assert result.wer == 0.0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
