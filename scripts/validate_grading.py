#!/usr/bin/env python3
"""
Validation Script for Enhanced Grading System
==========================================

This script validates the AI grading system by comparing AI scores
with human expert scores on a test dataset.

Usage:
    python scripts/validate_grading.py

Requirements:
    - Test dataset in tests/fixtures/validation/
    - Each recording should have a human-assigned score
"""

import json
import sys
from pathlib import Path

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

from dataclasses import dataclass
from typing import Optional

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent / "services" / "api"))

from app import fluency, pronunciation_wer, metrics


# ============================================================
# TEST DATASET STRUCTURE
# ============================================================

@dataclass
class TestSample:
    """A test sample with known human score."""
    id: str
    transcript: str
    segments: list  # Word timestamps from Whisper
    duration: float
    human_score: float  # 0-100 scale
    reference_text: Optional[str] = None  # For Part 2
    part_type: str = "FREE_RESPONSE"  # or "READ_ALOUD"
    notes: str = ""


# ============================================================
# SAMPLE TEST DATA (Replace with actual recordings)
# ============================================================

# These are sample segments for testing - replace with real Whisper output
SAMPLE_SEGMENTS_OPTIMAL = [
    {'words': [
        {'word': 'The', 'start': 0.0, 'end': 0.15},
        {'word': 'algorithm', 'start': 0.15, 'end': 0.45},
        {'word': 'uses', 'start': 0.45, 'end': 0.65},
        {'word': 'binary', 'start': 0.65, 'end': 0.9},
        {'word': 'search', 'start': 0.9, 'end': 1.2},
        {'word': 'to', 'start': 1.2, 'end': 1.3},
        {'word': 'efficiently', 'start': 1.3, 'end': 1.7},
        {'word': 'locate', 'start': 1.7, 'end': 2.0},
        {'word': 'elements', 'start': 2.0, 'end': 2.3},
        {'word': 'in', 'start': 2.3, 'end': 2.4},
        {'word': 'a', 'start': 2.4, 'end': 2.5},
        {'word': 'sorted', 'start': 2.5, 'end': 2.8},
        {'word': 'array', 'start': 2.8, 'end': 3.1},
    ]}
]

SAMPLE_SEGMENTS_SLOW = [
    {'words': [
        {'word': 'The', 'start': 0.0, 'end': 0.5},
        {'word': 'algorithm', 'start': 1.5, 'end': 2.2},
        {'word': 'um', 'start': 2.2, 'end': 2.5},
        {'word': 'uses', 'start': 3.0, 'end': 3.6},
        {'word': 'binary', 'start': 4.2, 'end': 4.8},
        {'word': 'search', 'start': 5.5, 'end': 6.0},
    ]}
]

SAMPLE_SEGMENTS_POOR = [
    {'words': [
        {'word': 'Um', 'start': 0.0, 'end': 0.4},
        {'word': 'er', 'start': 0.8, 'end': 1.2},
        {'word': 'the', 'start': 1.8, 'end': 2.1},
        {'word': 'thing', 'start': 2.5, 'end': 3.0},
        {'word': 'uses', 'start': 3.8, 'end': 4.2},
        {'word': 'binary', 'start': 5.0, 'end': 5.4},
    ]}
]


# ============================================================
# VALIDATION TESTS
# ============================================================

def test_fluency_analysis():
    """Test fluency analysis on sample data."""
    print("\n" + "=" * 60)
    print("TEST: Fluency Analysis")
    print("=" * 60)

    test_cases = [
        ("OPTIMAL (Good)", SAMPLE_SEGMENTS_OPTIMAL, 3.1, 85, "Good speaker"),
        ("SLOW (Medium)", SAMPLE_SEGMENTS_SLOW, 6.0, 40, "Slower speaker"),
        ("POOR (Low)", SAMPLE_SEGMENTS_POOR, 5.4, 30, "Poor speaker"),
    ]

    results = []
    for name, segments, duration, expected_min, description in test_cases:
        print(f"\n📊 Testing: {name}")
        print(f"   Description: {description}")

        result = fluency.analyze_fluency(segments, duration)

        print(f"   Speech Rate: {result['speech_rate_wps']} wps ({result['speech_rate_status']})")
        print(f"   Pause Count: {result['pause_count']}")
        print(f"   Filled Pauses: {result['filled_pause_count']}")
        print(f"   Fluency Score: {result['fluency_score']}")

        # Validate score is in reasonable range
        is_valid = result['fluency_score'] >= 0 and result['fluency_score'] <= 100
        is_reasonable = result['fluency_score'] >= expected_min - 15

        print(f"   ✅ Score in range: {is_valid}")
        print(f"   ✅ Score reasonable for type: {is_reasonable}")

        results.append({
            'name': name,
            'ai_score': result['fluency_score'],
            'expected_min': expected_min,
            'valid': is_valid and is_reasonable
        })

    return results


def test_pronunciation_wer():
    """Test pronunciation WER scoring."""
    print("\n" + "=" * 60)
    print("TEST: Pronunciation WER (Part 2)")
    print("=" * 60)

    reference = "The algorithm uses binary search to efficiently locate elements in a sorted array"

    test_cases = [
        ("PERFECT", reference, 95, "Exact match"),
        ("ONE_ERROR", "The algorithm uses search to efficiently locate elements in a sorted array", 85, "Missing 'binary'"),
        ("MANY_ERRORS", "The thing uses the to locate in the", 45, "Multiple errors"),
    ]

    results = []
    for name, hypothesis, expected_min, description in test_cases:
        print(f"\n📊 Testing: {name}")
        print(f"   Description: {description}")

        result = pronunciation_wer.grade_reading_aloud(
            reference_text=reference,
            hypothesis_text=hypothesis,
            avg_logprob=-0.3
        )

        print(f"   WER: {result['wer']:.2%}")
        print(f"   Score: {result['score']}")
        print(f"   Grade: {result['grade']}")

        # Validate score
        is_valid = result['score'] >= 0 and result['score'] <= 100
        is_reasonable = result['score'] >= expected_min - 10

        print(f"   ✅ Score in range: {is_valid}")
        print(f"   ✅ Score reasonable: {is_reasonable}")

        results.append({
            'name': name,
            'ai_score': result['score'],
            'expected_min': expected_min,
            'valid': is_valid and is_reasonable
        })

    return results


def test_lexical_diversity():
    """Test lexical diversity analysis."""
    print("\n" + "=" * 60)
    print("TEST: Lexical Diversity")
    print("=" * 60)

    test_cases = [
        ("RICH", "the algorithm uses binary search to efficiently locate elements in a sorted array with logarithmic complexity", 90, "Rich vocabulary"),
        ("AVERAGE", "the algorithm uses binary search to find elements in an array", 65, "Average vocabulary"),
        ("LIMITED", "the algorithm uses the binary search search search search", 40, "Limited vocabulary"),
    ]

    results = []
    for name, transcript, expected_min, description in test_cases:
        print(f"\n📊 Testing: {name}")
        print(f"   Description: {description}")

        analysis = metrics.analyze_lexical_diversity(transcript)

        print(f"   Total Words: {analysis['total_words']}")
        print(f"   Unique Words: {analysis['unique_words']}")
        print(f"   TTR: {analysis['ttr']:.3f}")
        print(f"   Level: {analysis['vocabulary_level']}")
        print(f"   Score: {analysis['ttr_score']}")

        is_valid = analysis['ttr_score'] >= 0 and analysis['ttr_score'] <= 100
        is_reasonable = analysis['ttr_score'] >= expected_min - 15

        print(f"   ✅ Score in range: {is_valid}")
        print(f"   ✅ Score reasonable: {is_reasonable}")

        results.append({
            'name': name,
            'ai_score': analysis['ttr_score'],
            'expected_min': expected_min,
            'valid': is_valid and is_reasonable
        })

    return results


def test_metrics_integration():
    """Test combined metrics integration."""
    print("\n" + "=" * 60)
    print("TEST: Metrics Integration")
    print("=" * 60)

    print("\n📊 Testing: Complete Pipeline")

    # Test with optimal speaker
    fluency_result = fluency.analyze_fluency(SAMPLE_SEGMENTS_OPTIMAL, 3.1)

    pronunciation_result = pronunciation_wer.grade_reading_aloud(
        reference_text="The algorithm uses binary search",
        hypothesis_text="the algorithm uses binary search",
        avg_logprob=-0.3
    )

    grading_metrics = metrics.aggregate_grading_metrics(
        fluency_result=fluency_result,
        pronunciation_result=pronunciation_result,
        transcript="the algorithm uses binary search efficiently locate elements in a sorted array"
    )

    print(f"   Fluency Score: {grading_metrics.fluency_score}")
    print(f"   Pronunciation Score: {grading_metrics.pronunciation_score}")
    print(f"   Lexical Score: {grading_metrics.lexical_score}")

    # Test prompt building
    prompt_data = metrics.build_calibrated_prompt(
        transcript="the algorithm uses binary search efficiently locate elements",
        transcript_with_pauses=fluency_result['transcript_with_pauses'],
        question={'text': 'Explain binary search', 'key_terms': ['binary search', 'O(log n)']},
        metrics=grading_metrics
    )

    print(f"   Prompt length: {len(prompt_data['prompt'])} chars")
    print(f"   Anchors included: {prompt_data['anchors_included']}")

    is_valid = (
        grading_metrics.fluency_score >= 0 and
        grading_metrics.pronunciation_score >= 0 and
        grading_metrics.lexical_score >= 0
    )

    print(f"   ✅ Integration valid: {is_valid}")

    return {'valid': is_valid, 'metrics': grading_metrics}


# ============================================================
# MAIN
# ============================================================

def main():
    print("\n" + "=" * 60)
    print("🎯 ENHANCED GRADING SYSTEM - VALIDATION SUITE")
    print("=" * 60)

    all_results = []

    # Run all tests
    all_results.extend(test_fluency_analysis())
    all_results.extend(test_pronunciation_wer())
    all_results.extend(test_lexical_diversity())
    all_results.append(test_metrics_integration())

    # Summary
    print("\n" + "=" * 60)
    print("📊 VALIDATION SUMMARY")
    print("=" * 60)

    total = len(all_results)
    passed = sum(1 for r in all_results if r.get('valid', True))
    failed = total - passed

    for result in all_results:
        if 'name' in result:
            status = "✅ PASS" if result['valid'] else "❌ FAIL"
            print(f"   {status}: {result['name']} (AI: {result['ai_score']:.1f}, Expected min: {result['expected_min']})")

    print(f"\n   Total: {total} tests")
    print(f"   ✅ Passed: {passed}")
    print(f"   ❌ Failed: {failed}")

    if failed == 0:
        print("\n🎉 All validation tests passed!")
        return 0
    else:
        print(f"\n⚠️ {failed} tests failed. Please review.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
