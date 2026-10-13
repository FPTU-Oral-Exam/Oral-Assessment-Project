import pytest
from pydantic import ValidationError

def test_schemas_validation():
    from app.schemas_academy import (
        AcademicQuestionIn,
        AcademicQuestionOut,
        AcademicMatrixIn,
        AcademicMatrixOut,
        RubricIn,
        RubricOut,
        QuestionTypeConfigIn,
        QuestionTypeConfigOut,
        StockHealthOut,
    )

    q_in = AcademicQuestionIn(
        code="RA-TEST-01",
        skill="SPEAKING",
        type="RA",
        title="Sample Question",
        prompt="Read this text aloud clearly.",
        prep_time=35,
        response_time=40,
        difficulty="MEDIUM",
        tags=["Physics", "Science"],
    )
    assert q_in.code == "RA-TEST-01"
    assert q_in.type == "RA"
    assert q_in.prep_time == 35
    assert q_in.response_time == 40

def test_matrix_rules_validation():
    from app.schemas_academy import AcademicMatrixIn

    m_in = AcademicMatrixIn(
        code="MATRIX-01",
        name="Standard Speaking Matrix",
        description="PTE Speaking blueprint",
        rubric_id=None,
        rules=[
            {
                "type": "RA",
                "question_count": 2,
                "prep_time": 35,
                "response_time": 40,
                "target_difficulty": "MEDIUM",
                "weight_percentage": 50,
            },
            {
                "type": "RS",
                "question_count": 3,
                "prep_time": 3,
                "response_time": 15,
                "target_difficulty": "EASY",
                "weight_percentage": 50,
            },
        ],
        difficulty_ratio={"easy": 50, "medium": 50, "hard": 0},
    )
    assert len(m_in.rules) == 2
    assert m_in.rules[0].type == "RA"
    assert m_in.rules[1].type == "RS"

def test_models_exist():
    from app.models import AcademicQuestion, AcademicMatrix, QuestionTypeConfigModel

    assert hasattr(AcademicQuestion, "code")
    assert hasattr(AcademicQuestion, "skill")
    assert hasattr(AcademicQuestion, "type")
    assert hasattr(AcademicQuestion, "prompt")
    assert hasattr(AcademicQuestion, "prep_time")
    assert hasattr(AcademicQuestion, "response_time")
    assert hasattr(AcademicQuestion, "media_url")
    assert hasattr(AcademicQuestion, "audio_script")

    assert hasattr(AcademicMatrix, "code")
    assert hasattr(AcademicMatrix, "rules")
    assert hasattr(AcademicMatrix, "difficulty_ratio")

    assert hasattr(QuestionTypeConfigModel, "type")
    assert hasattr(QuestionTypeConfigModel, "default_prep_time")


def test_db_persistence():
    from sqlalchemy import create_engine
    from sqlalchemy.orm import Session
    from app.db import Base
    from app.models import AcademicQuestion, AcademicMatrix, QuestionTypeConfigModel

    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)

    with Session(engine) as session:
        q = AcademicQuestion(
            code="RA-PERSIST-01",
            skill="SPEAKING",
            type="RA",
            title="Persist Test",
            prompt="Read this text aloud.",
            prep_time=35,
            response_time=40,
            difficulty="EASY",
            status="APPROVED",
            tags=["Test"],
        )
        session.add(q)

        m = AcademicMatrix(
            code="MATRIX-PERSIST-01",
            name="Persist Matrix",
            rules=[{"type": "RA", "question_count": 1, "weight_percentage": 100}],
            difficulty_ratio={"easy": 100, "medium": 0, "hard": 0},
        )
        session.add(m)

        cfg = QuestionTypeConfigModel(
            type="RA",
            name="Read Aloud",
            description="Read passage",
            default_prep_time=35,
            default_response_time=40,
        )
        session.add(cfg)
        session.commit()

        # Query back
        saved_q = session.query(AcademicQuestion).filter_by(code="RA-PERSIST-01").first()
        assert saved_q is not None
        assert saved_q.type == "RA"
        assert saved_q.tags == ["Test"]

        saved_m = session.query(AcademicMatrix).filter_by(code="MATRIX-PERSIST-01").first()
        assert saved_m is not None
        assert saved_m.rules[0]["question_count"] == 1

        saved_cfg = session.query(QuestionTypeConfigModel).filter_by(type="RA").first()
        assert saved_cfg is not None
        assert saved_cfg.default_prep_time == 35

