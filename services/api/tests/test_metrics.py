"""
Tests for Combined Metrics Module
"""

import pytest
from app.metrics import (
    calculate_type_token_ratio,
    calculate_lexical_diversity_score,
    analyze_lexical_diversity,
    aggregate_grading_metrics,
    build_grading_prompt,
    build_calibrated_prompt,
    ANCHOR_EXEMPLARS,
)


class TestLexicalDiversity:
    """Tests for lexical diversity metrics."""

    def test_ttr_perfect_diversity(self):
        """All unique words should have TTR = 1.0."""
        result = calculate_type_token_ratio("one two three four five")
        assert result == 1.0

    def test_ttr_no_diversity(self):
        """All same words should have low TTR."""
        result = calculate_type_token_ratio("the the the the the")
        assert result == 0.2  # 1 unique / 5 total

    def test_ttr_mixed(self):
        """Mixed text should have moderate TTR."""
        result = calculate_type_token_ratio("the algorithm uses binary search")
        assert 0.5 < result < 1.0

    def test_ttr_empty(self):
        """Empty text should return 0."""
        assert calculate_type_token_ratio("") == 0.0
        assert calculate_type_token_ratio(None) == 0.0

    def test_ttr_score_rich(self):
        """High TTR should give high score."""
        score = calculate_lexical_diversity_score(0.70)
        assert score == 100.0

    def test_ttr_score_good(self):
        """Good TTR should give good score."""
        score = calculate_lexical_diversity_score(0.55)
        assert 80 <= score <= 100

    def test_ttr_score_average(self):
        """Average TTR should give average score."""
        score = calculate_lexical_diversity_score(0.45)
        assert 60 <= score <= 80

    def test_ttr_score_limited(self):
        """Low TTR should give low score."""
        score = calculate_lexical_diversity_score(0.30)
        assert score < 60

    def test_analyze_lexical_diversity_full(self):
        """Full analysis should return all metrics."""
        result = analyze_lexical_diversity("the algorithm uses binary search for efficiency")
        assert 'total_words' in result
        assert 'unique_words' in result
        assert 'ttr' in result
        assert 'ttr_score' in result
        assert 'vocabulary_level' in result
        assert result['total_words'] == 8


class TestGradingMetrics:
    """Tests for grading metrics aggregation."""

    def test_aggregate_fluency_only(self):
        """Should aggregate metrics correctly."""
        fluency = {
            'fluency_score': 85.0,
            'speech_rate_wps': 2.1,
            'speech_rate_status': 'OPTIMAL',
            'pause_count': 3,
            'pause_ratio_per_word': 0.2,
            'filled_pause_count': 1,
            'transcript_with_pauses': 'test [pause] test'
        }
        result = aggregate_grading_metrics(fluency)
        assert result.fluency_score == 85.0
        assert result.overall_metrics['fluency']['speech_rate_wps'] == 2.1

    def test_aggregate_with_pronunciation(self):
        """Should include pronunciation metrics."""
        fluency = {
            'fluency_score': 80.0,
            'speech_rate_wps': 2.0,
            'speech_rate_status': 'OPTIMAL',
            'pause_count': 2,
            'pause_ratio_per_word': 0.15,
            'filled_pause_count': 0,
            'transcript_with_pauses': 'test'
        }
        pronunciation = {
            'score': 90.0,
            'wer': 0.05,
            'grade': 'EXCELLENT'
        }
        result = aggregate_grading_metrics(fluency, pronunciation, "test transcript")
        assert result.pronunciation_score == 90.0


class TestGradingPrompt:
    """Tests for LLM prompt builder."""

    def test_build_grading_prompt_structure(self):
        """Should build valid prompt structure."""
        fluency = {
            'fluency_score': 85.0,
            'speech_rate_wps': 2.1,
            'speech_rate_status': 'OPTIMAL',
            'pause_count': 3,
            'pause_ratio_per_word': 0.2,
            'filled_pause_count': 1,
            'transcript_with_pauses': 'test [pause] test'
        }
        from app.metrics import GradingMetrics
        metrics = GradingMetrics(
            fluency_score=85.0,
            pronunciation_score=80.0,
            lexical_score=75.0,
            content_score=0.0,
            overall_metrics={'fluency': fluency, 'pronunciation': None, 'lexical': {}}
        )

        result = build_grading_prompt(
            transcript="test test test",
            transcript_with_pauses="test [pause] test",
            question={'text': 'Explain binary search'},
            metrics=metrics
        )

        assert 'prompt' in result
        assert 'metrics_summary' in result
        assert 'context' in result
        assert 'ACOUSITC EVIDENCE' in result['prompt']
        assert 'SPEECH RATE' in result['metrics_summary']

    def test_build_calibrated_prompt_has_anchors(self):
        """Should include anchor exemplars in calibrated prompt."""
        fluency = {
            'fluency_score': 85.0,
            'speech_rate_wps': 2.1,
            'speech_rate_status': 'OPTIMAL',
            'pause_count': 3,
            'pause_ratio_per_word': 0.2,
            'filled_pause_count': 1,
            'transcript_with_pauses': 'test'
        }
        from app.metrics import GradingMetrics
        metrics = GradingMetrics(
            fluency_score=85.0,
            pronunciation_score=80.0,
            lexical_score=75.0,
            content_score=0.0,
            overall_metrics={'fluency': fluency, 'pronunciation': None, 'lexical': {}}
        )

        result = build_calibrated_prompt(
            transcript="test test test",
            transcript_with_pauses="test",
            question={'text': 'Explain binary search'},
            metrics=metrics
        )

        assert 'ANCHOR EXEMPLARS' in result['prompt']
        assert result['anchors_included'] is True

    def test_prompt_includes_metrics_evidence(self):
        """Prompt should include acoustic metrics."""
        fluency = {
            'fluency_score': 75.0,
            'speech_rate_wps': 1.8,
            'speech_rate_status': 'SLOW',
            'pause_count': 5,
            'pause_ratio_per_word': 0.35,
            'filled_pause_count': 3,
            'transcript_with_pauses': 'um [pause] test [pause] um'
        }
        from app.metrics import GradingMetrics
        metrics = GradingMetrics(
            fluency_score=75.0,
            pronunciation_score=70.0,
            lexical_score=65.0,
            content_score=0.0,
            overall_metrics={'fluency': fluency, 'pronunciation': None, 'lexical': {'ttr': 0.5}}
        )

        result = build_grading_prompt(
            transcript="um test um",
            transcript_with_pauses="um [pause] test [pause] um",
            question={'text': 'Test question', 'key_terms': ['test']},
            metrics=metrics
        )

        # Should include specific metrics
        assert '1.8' in result['prompt'] or 'SLOW' in result['prompt']
        assert '5' in result['prompt'] or 'pauses' in result['prompt'].lower()


class TestAnchorExemplars:
    """Tests for anchor exemplars."""

    def test_anchors_defined(self):
        """Anchors should be properly defined."""
        assert 'high' in ANCHOR_EXEMPLARS
        assert 'medium' in ANCHOR_EXEMPLARS
        assert 'low' in ANCHOR_EXEMPLARS

    def test_anchor_scores_ordered(self):
        """Anchor scores should be properly ordered."""
        assert ANCHOR_EXEMPLARS['high']['score'] == 90
        assert ANCHOR_EXEMPLARS['medium']['score'] == 65
        assert ANCHOR_EXEMPLARS['low']['score'] == 35

    def test_anchor_characteristics(self):
        """Anchors should have characteristics."""
        for level in ['high', 'medium', 'low']:
            assert 'characteristics' in ANCHOR_EXEMPLARS[level]['example']
            assert len(ANCHOR_EXEMPLARS[level]['example']['characteristics']) > 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
