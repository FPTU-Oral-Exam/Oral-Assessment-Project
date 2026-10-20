import pytest
from app import ai
from app.schemas_academy import RubricCriterion, RubricIn

ENT_CRITERIA = [
    {
        "id": "ideas",
        "name": "Ideas",
        "max_score": 2.0,
        "weight": 20.0,
        "description": "Has clear organization, relevant and extended ideas",
        "descriptors": [
            {"level": "Exceeds standard", "score_range": "1.6 - 2", "description": "Presents a well-developed response"},
            {"level": "Meets standard", "score_range": "1 - below 1.6", "description": "Presents relevant ideas"},
            {"level": "Attempt made", "score_range": "0.6 - below 1", "description": "Has few ideas"},
            {"level": "Insufficient evidence", "score_range": "0 - below 0.6", "description": "Has no ideas at all"}
        ]
    },
    {
        "id": "pronunciation",
        "name": "Pronunciation",
        "max_score": 2.0,
        "weight": 20.0,
        "description": "Pronunciation, stress and intonation",
        "descriptors": [
            {"level": "Exceeds standard", "score_range": "1.6 - 2", "description": "Near-native pronunciation"},
            {"level": "Meets standard", "score_range": "1 - below 1.6", "description": "Speaks with clear voice in L1 accent"},
            {"level": "Attempt made", "score_range": "0.6 - below 1", "description": "Speech is a little hard to understand"},
            {"level": "Insufficient evidence", "score_range": "0 - below 0.6", "description": "Impossible to understand speech"}
        ]
    },
    {
        "id": "grammar",
        "name": "Grammar Range and Accuracy",
        "max_score": 2.0,
        "weight": 20.0,
        "description": "Grammar range and accuracy",
        "descriptors": [
            {"level": "Exceeds standard", "score_range": "1.6 - 2", "description": "Wide range of structures flexibly"},
            {"level": "Meets standard", "score_range": "1 - below 1.6", "description": "Simple sentences mostly accurate"},
            {"level": "Attempt made", "score_range": "0.6 - below 1", "description": "Uses only simple sentences with errors"},
            {"level": "Insufficient evidence", "score_range": "0 - below 0.6", "description": "Cannot produce basic sentence forms"}
        ]
    },
    {
        "id": "vocabulary",
        "name": "Vocabulary Range and Accuracy",
        "max_score": 2.0,
        "weight": 20.0,
        "description": "Vocabulary range and accuracy",
        "descriptors": [
            {"level": "Exceeds standard", "score_range": "1.6 - 2", "description": "Wide vocabulary resource readily"},
            {"level": "Meets standard", "score_range": "1 - below 1.6", "description": "Vocabulary sufficient to discuss topics"},
            {"level": "Attempt made", "score_range": "0.6 - below 1", "description": "Mainly simple vocabulary"},
            {"level": "Insufficient evidence", "score_range": "0 - below 0.6", "description": "Isolated words or memorized utterances"}
        ]
    },
    {
        "id": "fluency",
        "name": "Fluency and coherence",
        "max_score": 2.0,
        "weight": 20.0,
        "description": "Fluency and coherence",
        "descriptors": [
            {"level": "Exceeds standard", "score_range": "1.6 - 2", "description": "Speaks fluently with no hesitation"},
            {"level": "Meets standard", "score_range": "1 - below 1.6", "description": "Can speak for a while"},
            {"level": "Attempt made", "score_range": "0.6 - below 1", "description": "Noticeable effort, pauses"},
            {"level": "Insufficient evidence", "score_range": "0 - below 0.6", "description": "Short speech with simple words"}
        ]
    }
]


def test_rubric_schema_supports_max_score_2():
    for c in ENT_CRITERIA:
        crit = RubricCriterion.model_validate(c)
        assert crit.max_score == 2.0
        assert crit.weight == 20.0


def test_grading_schema_creates_bound_model_for_ents():
    chunks = [{"id": "c1", "heading": "Intro", "content": "Sample"}]
    schema = ai.grading_schema(ENT_CRITERIA, chunks)
    assert schema is not None


def test_resolve_criterion_band_thresholds():
    assert ai.resolve_criterion_band(1.8, 2.0) == "Exceeds standard"
    assert ai.resolve_criterion_band(1.6, 2.0) == "Exceeds standard"
    assert ai.resolve_criterion_band(1.4, 2.0) == "Meets standard"
    assert ai.resolve_criterion_band(1.0, 2.0) == "Meets standard"
    assert ai.resolve_criterion_band(0.8, 2.0) == "Attempt made"
    assert ai.resolve_criterion_band(0.6, 2.0) == "Attempt made"
    assert ai.resolve_criterion_band(0.4, 2.0) == "Insufficient evidence"
    assert ai.resolve_criterion_band(0.0, 2.0) == "Insufficient evidence"


def test_ai_grade_demo_mode(monkeypatch):
    chunks = [{"id": "c1", "heading": "Activities", "content": "Going to school and reading books."}]
    question = {"text": "What is your typical day like?"}
    transcript = "I usually wake up at 7 AM and go to university with my friends."
    res = ai.grade(question, transcript, ENT_CRITERIA, chunks, 0.9)
    assert res["status"] in ["NOT_GRADED", "COMPLETED"]
    assert "rubric_criteria" in res
    assert len(res["rubric_criteria"]) == 5

