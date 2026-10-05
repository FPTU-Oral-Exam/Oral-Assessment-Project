"""Tests for speech and audio enhancements: dynamic prompt, anti-hallucination decoding, low-confidence flagging."""

from unittest.mock import MagicMock
from types import SimpleNamespace
from pathlib import Path
import pytest

from app import speech


class MockSegment:
    def __init__(self, text="OOP polymorphism", avg_logprob=-0.1):
        self.text = text
        self.avg_logprob = avg_logprob


def test_whisper_passes_anti_hallucination_and_prompt_parameters(monkeypatch, tmp_path):
    mock_model = MagicMock()
    transcribe_calls = []

    def mock_transcribe(path, **kwargs):
        transcribe_calls.append((path, kwargs))
        info = SimpleNamespace(language="vi")
        return [MockSegment("Kiểm thử phần mềm", -0.05)], info

    mock_model.transcribe = mock_transcribe
    monkeypatch.setattr(speech, "model", lambda name: mock_model)

    dummy_audio = tmp_path / "test.wav"
    dummy_audio.write_bytes(b"RIFF\x24\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00\x80>\x00\x00\x00}\x00\x00\x02\x00\x10\x00data\x00\x00\x00\x00")

    result = speech.whisper(dummy_audio, "vi", prompt="Thuật ngữ: ISTQB, Black-box")

    assert len(transcribe_calls) == 1
    _, kwargs = transcribe_calls[0]
    assert kwargs.get("initial_prompt") == "Thuật ngữ: ISTQB, Black-box"
    assert kwargs.get("condition_on_previous_text") is False
    assert kwargs.get("repetition_penalty") == 1.15
    assert kwargs.get("vad_filter") is True
    assert kwargs.get("vad_parameters") == dict(min_silence_duration_ms=500, speech_pad_ms=200)
    assert result["transcript"] == "Kiểm thử phần mềm"
    assert result["stt_confidence"] > 0.9


def test_transcribe_file_forwards_prompt(monkeypatch, tmp_path):
    dummy_audio = tmp_path / "test.wav"
    dummy_audio.write_bytes(b"audio")

    # Mock prepare_audio
    monkeypatch.setattr(
        speech,
        "prepare_audio",
        lambda src, dst, mode: {"preprocessing": mode, "duration_seconds": 5.0, "sample_rate": 16000},
    )

    whisper_calls = []

    def mock_whisper(path, language, prompt=None):
        whisper_calls.append({"path": path, "language": language, "prompt": prompt})
        return {
            "transcript": "Đã nhận dạng",
            "stt_confidence": 0.88,
            "language": language,
            "model": "base",
        }

    monkeypatch.setattr(speech, "whisper", mock_whisper)
    policy = {"provider": "local_server", "preprocessing": "denoise", "language": "vi"}

    result = speech.transcribe_file(dummy_audio, speech_policy=policy, prompt="Hotwords: Refactoring")

    assert len(whisper_calls) == 1
    assert whisper_calls[0]["prompt"] == "Hotwords: Refactoring"
    assert result["transcript"] == "Đã nhận dạng"


def test_build_stt_prompt_dict_terms():
    from app.worker import build_stt_prompt

    q = {
        "text": "Giải thích tính kế thừa và đa hình trong lập trình hướng đối tượng OOP",
        "english_terms": [{"term": "Polymorphism", "meaning": "Đa hình"}, {"term": "Inheritance", "meaning": "Kế thừa"}],
    }
    prompt = build_stt_prompt(q)
    assert "Polymorphism" in prompt
    assert "Inheritance" in prompt
    assert "đa hình" in prompt
    assert len(prompt) <= 250


def test_build_stt_prompt_string_terms():
    from app.worker import build_stt_prompt

    q = {
        "text": "Kiểm thử phần mềm",
        "english_terms": ["Black-box", "Boundary Value Testing"],
    }
    prompt = build_stt_prompt(q)
    assert "Black-box" in prompt
    assert "Boundary Value Testing" in prompt
    assert "Kiểm thử phần mềm" in prompt


def test_build_stt_prompt_empty_and_none():
    from app.worker import build_stt_prompt

    assert build_stt_prompt(None) is None
    assert build_stt_prompt({}) is None
    assert build_stt_prompt({"text": ""}) is None


def test_grade_answer_flags_low_stt_confidence(monkeypatch):
    from app.worker import grade_answer

    exam = SimpleNamespace(
        snapshot={"practice": False, "rubric_version": "v1", "knowledge_version": "v1", "document_ids": [], "criteria": []},
        course_id="c1",
        time_limit=600,
    )
    session = SimpleNamespace(started_at=100.0)
    attempt = SimpleNamespace(
        id="a1",
        question={"topic_id": "t1", "text": "Q1"},
        finished_at=150.0,
    )

    monkeypatch.setattr("app.worker.check_config", lambda exam: None)
    monkeypatch.setattr("app.worker.frozen_chunks", lambda *args, **kwargs: [])
    monkeypatch.setattr("app.worker.ai.retrieve", lambda *args, **kwargs: [])
    monkeypatch.setattr(
        "app.worker.ai.grade",
        lambda question, transcript, criteria, chunks, conf: {
            "score": 8.0,
            "confidence": 0.95,
            "review_required": False,
            "status": "COMPLETED",
        },
    )

    # Confidence below 0.50 (e.g. 0.45)
    assessment = grade_answer(None, exam, session, attempt, "My answer", 0.45)
    assert assessment["review_required"] is True
    assert "LOW_STT_CONFIDENCE" in assessment.get("audit_flags", [])

    # Confidence >= 0.50 (e.g. 0.85)
    assessment_high = grade_answer(None, exam, session, attempt, "My answer", 0.85)
    assert "LOW_STT_CONFIDENCE" not in assessment_high.get("audit_flags", [])

