import os
import sys
from pathlib import Path
import pytest

# Ensure root workspace and services/api are in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))
sys.path.insert(0, str(PROJECT_ROOT / "services" / "api"))

try:
    from scripts.import_pte_bank_to_db import parse_question_data, EXERCISE_MAP, import_pte_bank
except ModuleNotFoundError:
    from import_pte_bank_to_db import parse_question_data, EXERCISE_MAP, import_pte_bank


def test_parse_read_aloud_item():
    raw_item = {
        "uid": "SRA1000",
        "transcript": "For any marketing course that requires the development of marketing plans...",
        "exercise": "Read Aloud",
        "tested": 95,
        "has_media": False,
    }
    parsed = parse_question_data("Read Aloud", raw_item)
    assert parsed["code"] == "SRA1000"
    assert parsed["type"] == "RA"
    assert parsed["skill"] == "SPEAKING"
    assert parsed["prep_time"] == 35
    assert parsed["response_time"] == 40
    assert parsed["status"] == "APPROVED"
    assert parsed["prompt"] == raw_item["transcript"]
    assert parsed["is_predicted"] is True
    assert parsed["difficulty"] == "EASY"


def test_parse_repeat_sentence_item():
    raw_item = {
        "uid": "SRS1000",
        "transcript": "A demonstrated ability to write clear, correct and concise English is bigotry.",
        "exercise": "Repeat Sentence",
        "tested": 20,
        "has_media": True,
        "media_type": "audio",
        "media_path": "audio/SRS1000.mp3",
    }
    parsed = parse_question_data("Repeat Sentence", raw_item)
    assert parsed["code"] == "SRS1000"
    assert parsed["type"] == "RS"
    assert parsed["prep_time"] == 3
    assert parsed["response_time"] == 15
    assert parsed["media_url"] == "audio/SRS1000.mp3"
    assert parsed["audio_script"] == raw_item["transcript"]
    assert parsed["difficulty"] == "HARD"


def test_parse_describe_image_item():
    raw_item = {
        "uid": "SDI1",
        "transcript": "The image depicts a juxtaposition between a newly constructed skyscraper...",
        "exercise": "Describe Image",
        "tested": 50,
        "has_media": True,
        "media_type": "image",
        "media_path": "images/SDI1.png",
    }
    parsed = parse_question_data("Describe Image", raw_item)
    assert parsed["code"] == "SDI1"
    assert parsed["type"] == "DI"
    assert parsed["prep_time"] == 25
    assert parsed["response_time"] == 40
    assert parsed["media_url"] == "images/SDI1.png"
    assert parsed["sample_answer"] == raw_item["transcript"]
    assert parsed["difficulty"] == "MEDIUM"


def test_parse_group_discussion_item():
    raw_item = {
        "uid": "SGD100",
        "transcript": "Speaker 1: I think the biggest shift we're seeing...",
        "exercise": "Summarize Group Discussion",
        "tested": 35,
        "has_media": True,
        "media_type": "audio",
        "media_path": "audio/SGD100.mp3",
    }
    parsed = parse_question_data("Summarize Group Discussion", raw_item)
    assert parsed["code"] == "SGD100"
    assert parsed["type"] == "GD"
    assert parsed["prep_time"] == 10
    assert parsed["response_time"] == 60
    assert parsed["audio_script"] == raw_item["transcript"]


def test_import_pte_bank_in_memory():
    from sqlalchemy import create_engine
    from sqlalchemy.orm import Session
    from app.db import Base
    from app.models import AcademicQuestion

    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)

    with Session(engine) as session:
        summary = import_pte_bank(
            data_dir=PROJECT_ROOT / "data" / "pte-speaking",
            db_session=session,
            limit_per_type=5,  # Test small batch
        )

        assert summary["total_imported"] > 0
        assert "RA" in summary["breakdown"]
        assert "RS" in summary["breakdown"]

        # Verify DB records
        ra_count = session.query(AcademicQuestion).filter_by(type="RA").count()
        assert ra_count == 5

        # Idempotent re-run
        summary_rerun = import_pte_bank(
            data_dir=PROJECT_ROOT / "data" / "pte-speaking",
            db_session=session,
            limit_per_type=5,
        )
        assert summary_rerun["total_updated"] == 35
        assert summary_rerun["total_imported"] == 0
        assert session.query(AcademicQuestion).filter_by(type="RA").count() == 5
