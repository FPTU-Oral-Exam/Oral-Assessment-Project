"""
Tests for Fluency Metrics Engine
"""

import pytest
from app.fluency import (
    # Constants
    WPS_OPTIMAL_MIN, WPS_OPTIMAL_MAX, WPS_SLOW_THRESHOLD,
    MIN_SILENCE_DURATION_MS, PAUSE_RATIO_OPTIMAL,

    # Functions
    extract_word_timing,
    calculate_speech_rate_analysis,
    detect_silent_pauses,
    detect_filled_pauses,
    calculate_pause_score,
    calculate_filled_pause_score,
    build_transcript_with_pauses,
    analyze_fluency,
    WordTiming,
    FluencyMetrics,
)


class TestExtractWordTiming:
    """Tests for extract_word_timing function."""

    def test_empty_segments(self):
        """Empty segments should return empty list."""
        result = extract_word_timing([])
        assert result == []

    def test_single_word(self):
        """Single word should be extracted correctly."""
        segments = [
            {'words': [{'word': 'Hello', 'start': 0.0, 'end': 0.5}]}
        ]
        result = extract_word_timing(segments)
        assert len(result) == 1
        assert result[0].word == 'Hello'
        assert result[0].start == 0.0
        assert result[0].end == 0.5

    def test_multiple_words_sorted(self):
        """Words should be sorted by start time."""
        segments = [
            {'words': [
                {'word': 'Second', 'start': 1.0, 'end': 1.5},
                {'word': 'First', 'start': 0.0, 'end': 0.5},
            ]}
        ]
        result = extract_word_timing(segments)
        assert result[0].word == 'First'
        assert result[1].word == 'Second'

    def test_whitespace_handling(self):
        """Leading/trailing whitespace should be stripped."""
        segments = [
            {'words': [
                {'word': '  Hello  ', 'start': 0.0, 'end': 0.5},
            ]}
        ]
        result = extract_word_timing(segments)
        assert result[0].word == 'Hello'


class TestSpeechRateAnalysis:
    """Tests for calculate_speech_rate_analysis function."""

    def test_optimal_speed(self):
        """2.0-2.4 wps should return OPTIMAL with score 100."""
        result = calculate_speech_rate_analysis(24, 10.0)  # 2.4 wps
        assert result.status == "OPTIMAL"
        assert result.score == 100.0
        assert result.wps == 2.4

    def test_optimal_speed_min(self):
        """2.0 wps should return OPTIMAL."""
        result = calculate_speech_rate_analysis(20, 10.0)  # 2.0 wps
        assert result.status == "OPTIMAL"
        assert result.score == 100.0

    def test_slightly_slow(self):
        """1.7 wps should return SLOW with partial score."""
        result = calculate_speech_rate_analysis(17, 10.0)  # 1.7 wps
        assert result.status == "SLOW"
        assert 70 < result.score <= 100

    def test_too_slow(self):
        """< 1.35 wps should return TOO_SLOW with penalty."""
        result = calculate_speech_rate_analysis(10, 10.0)  # 1.0 wps
        assert result.status == "TOO_SLOW"
        assert result.score < 50

    def test_plateau_rapid(self):
        """> 2.4 wps should return PLATEAU_RAPID but still 100 score."""
        result = calculate_speech_rate_analysis(30, 10.0)  # 3.0 wps
        assert result.status == "PLATEAU_RAPID"
        assert result.score == 100.0  # Ceiling

    def test_zero_duration(self):
        """Zero duration should return INVALID with 0 score."""
        result = calculate_speech_rate_analysis(10, 0.0)
        assert result.status == "INVALID"
        assert result.score == 0.0


class TestPauseDetection:
    """Tests for detect_silent_pauses function."""

    def test_no_pauses(self):
        """No gaps should result in 0 pauses."""
        words = [
            WordTiming(word='Hello', start=0.0, end=0.3),
            WordTiming(word='World', start=0.3, end=0.6),
        ]
        result = detect_silent_pauses(words)
        assert result.count == 0
        assert result.pause_ratio_per_word == 0.0

    def test_pause_detected(self):
        """Gap > 250ms should be detected as pause."""
        words = [
            WordTiming(word='Hello', start=0.0, end=0.3),
            WordTiming(word='World', start=0.8, end=1.1),  # 500ms gap
        ]
        result = detect_silent_pauses(words)
        assert result.count == 1
        assert result.total_duration >= 0.4  # At least 400ms

    def test_multiple_pauses(self):
        """Multiple gaps should be counted."""
        words = [
            WordTiming(word='One', start=0.0, end=0.2),
            WordTiming(word='Two', start=0.8, end=1.0),   # 600ms gap
            WordTiming(word='Three', start=1.0, end=1.2),
            WordTiming(word='Four', start=2.0, end=2.2),  # 800ms gap
        ]
        result = detect_silent_pauses(words)
        assert result.count == 2

    def test_short_gap_not_pause(self):
        """Gap < 250ms should NOT be detected as pause."""
        words = [
            WordTiming(word='Hello', start=0.0, end=0.2),
            WordTiming(word='World', start=0.3, end=0.5),  # 100ms gap
        ]
        result = detect_silent_pauses(words)
        assert result.count == 0

    def test_pause_ratio_calculation(self):
        """Pause ratio should be count / word_count."""
        words = [
            WordTiming(word='One', start=0.0, end=0.2),
            WordTiming(word='Two', start=0.8, end=1.0),   # pause
            WordTiming(word='Three', start=1.0, end=1.2),
            WordTiming(word='Four', start=1.8, end=2.0),  # pause
        ]
        result = detect_silent_pauses(words)
        assert result.pause_ratio_per_word == 0.5  # 2 pauses / 4 words


class TestPauseScore:
    """Tests for calculate_pause_score function."""

    def test_optimal_ratio(self):
        """<= 0.27 ratio should return 100."""
        assert calculate_pause_score(0.0) == 100.0
        assert calculate_pause_score(0.15) == 100.0
        assert calculate_pause_score(0.27) == 100.0

    def test_excessive_pauses(self):
        """Higher ratio should return lower score."""
        score_03 = calculate_pause_score(0.3)
        score_05 = calculate_pause_score(0.5)
        score_10 = calculate_pause_score(1.0)
        assert score_03 < 100
        assert score_05 < score_03
        assert score_10 < score_05


class TestFilledPauseDetection:
    """Tests for detect_filled_pauses function."""

    def test_no_filled_pauses(self):
        """Clean speech should have 0 filled pauses."""
        result = detect_filled_pauses("Hello world this is a test")
        assert result.count == 0

    def test_uh_filled_pause(self):
        """uh should be detected."""
        result = detect_filled_pauses("Hello uh world")
        assert result.count == 1
        assert 'uh' in result.words

    def test_um_filled_pause(self):
        """um should be detected."""
        result = detect_filled_pauses("I um think so")
        assert result.count == 1

    def test_multiple_filled_pauses(self):
        """Multiple filled pauses should be counted."""
        result = detect_filled_pauses("um hello uh world er yeah")
        assert result.count == 4  # um, uh, er, (you is not a filled pause)


class TestBuildTranscriptWithPauses:
    """Tests for build_transcript_with_pauses function."""

    def test_no_pauses(self):
        """Continuous speech should have no markers."""
        words = [
            WordTiming(word='Hello', start=0.0, end=0.3),
            WordTiming(word='World', start=0.3, end=0.6),
        ]
        result = build_transcript_with_pauses(words)
        assert result == "Hello World"
        assert "[pause]" not in result

    def test_pause_marker_inserted(self):
        """Long gap should have [pause] marker."""
        words = [
            WordTiming(word='Hello', start=0.0, end=0.3),
            WordTiming(word='World', start=1.0, end=1.3),  # 700ms gap
        ]
        result = build_transcript_with_pauses(words)
        assert result == "Hello [pause] World"

    def test_empty_input(self):
        """Empty input should return empty string."""
        result = build_transcript_with_pauses([])
        assert result == ""


class TestFluencyScore:
    """Integration tests for complete fluency analysis."""

    def test_analyze_fluency_optimal(self):
        """Optimal speech should get high score."""
        segments = [
            {'words': [
                {'word': 'The', 'start': 0.0, 'end': 0.2},
                {'word': 'algorithm', 'start': 0.2, 'end': 0.6},
                {'word': 'uses', 'start': 0.6, 'end': 0.9},
                {'word': 'binary', 'start': 0.9, 'end': 1.2},
                {'word': 'search', 'start': 1.2, 'end': 1.6},
            ]}
        ]

        result = analyze_fluency(segments, duration_seconds=1.6)

        assert result['word_count'] == 5
        assert result['speech_rate_status'] == "OPTIMAL"
        assert result['fluency_score'] >= 90  # High score for optimal

    def test_analyze_fluency_slow(self):
        """Slow speech should get lower score."""
        segments = [
            {'words': [
                {'word': 'The', 'start': 0.0, 'end': 0.5},
                {'word': 'algorithm', 'start': 1.5, 'end': 2.0},
                {'word': 'uses', 'start': 3.0, 'end': 3.5},
            ]}
        ]

        result = analyze_fluency(segments, duration_seconds=4.0)

        assert result['speech_rate_status'] in ["SLOW", "TOO_SLOW"]
        assert result['fluency_score'] < 90

    def test_analyze_fluency_with_pauses(self):
        """Speech with pauses should be analyzed correctly."""
        segments = [
            {'words': [
                {'word': 'Hello', 'start': 0.0, 'end': 0.3},
                {'word': 'World', 'start': 1.2, 'end': 1.5},  # Long pause
                {'word': 'Test', 'start': 1.5, 'end': 1.8},
            ]}
        ]

        result = analyze_fluency(segments, duration_seconds=2.0)

        assert result['pause_count'] >= 1
        assert 'transcript_with_pauses' in result


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
