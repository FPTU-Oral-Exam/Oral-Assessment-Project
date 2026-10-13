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


class TestAcademicMatrices:
    """Test Suite for Task 3: Exam Blueprint Matrix, Stock Health Validator & Sample Generator."""

    def test_matrix_crud_and_stock_health(self, env):
        clients, factory = env
        academy = clients["academy"]
        student = clients["student"]

        # 1. Non-academy user should be denied (403)
        res_forbidden = student.get("/api/academy/matrices")
        assert res_forbidden.status_code == 403

        # 2. Add some questions into DB for Stock Health & Sample generation
        with factory() as db:
            from app.models import AcademicQuestion
            db.add_all([
                AcademicQuestion(
                    code="RA-MOCK-01",
                    skill="SPEAKING",
                    type="RA",
                    title="Mock RA 1",
                    prompt="Read aloud sentence one.",
                    prep_time=35,
                    response_time=40,
                    difficulty="MEDIUM",
                    status="APPROVED",
                ),
                AcademicQuestion(
                    code="RA-MOCK-02",
                    skill="SPEAKING",
                    type="RA",
                    title="Mock RA 2",
                    prompt="Read aloud sentence two.",
                    prep_time=35,
                    response_time=40,
                    difficulty="MEDIUM",
                    status="APPROVED",
                ),
                AcademicQuestion(
                    code="RS-MOCK-01",
                    skill="SPEAKING",
                    type="RS",
                    title="Mock RS 1",
                    prompt="Repeat this sentence.",
                    prep_time=3,
                    response_time=15,
                    difficulty="EASY",
                    status="APPROVED",
                ),
            ])
            db.commit()

        # 3. Create Matrix
        matrix_payload = {
            "code": "MATRIX-PTE-STD-01",
            "name": "PTE Standard Speaking Blueprint",
            "description": "Cấu trúc đề chuẩn 2 phần RA và RS",
            "rules": [
                {
                    "type": "RA",
                    "question_count": 2,
                    "prep_time": 35,
                    "response_time": 40,
                    "target_difficulty": "MEDIUM",
                    "weight_percentage": 50.0,
                },
                {
                    "type": "RS",
                    "question_count": 1,
                    "prep_time": 3,
                    "response_time": 15,
                    "target_difficulty": "EASY",
                    "weight_percentage": 50.0,
                },
            ],
            "difficulty_ratio": {"easy": 50, "medium": 50, "hard": 0},
        }
        res_create = academy.post("/api/academy/matrices", json=matrix_payload)
        assert res_create.status_code in (200, 201), f"Create failed: {res_create.text}"
        matrix_data = res_create.json()
        matrix_id = matrix_data["id"]
        assert matrix_data["code"] == "MATRIX-PTE-STD-01"
        assert len(matrix_data["rules"]) == 2

        # 4. List Matrices
        res_list = academy.get("/api/academy/matrices")
        assert res_list.status_code == 200
        items = res_list.json()
        assert any(m["id"] == matrix_id for m in items)

        # 5. Get Matrix Detail
        res_get = academy.get(f"/api/academy/matrices/{matrix_id}")
        assert res_get.status_code == 200
        assert res_get.json()["name"] == "PTE Standard Speaking Blueprint"

        # 6. Update Matrix
        res_update = academy.put(
            f"/api/academy/matrices/{matrix_id}",
            json={"name": "PTE Updated Speaking Blueprint"},
        )
        assert res_update.status_code == 200
        assert res_update.json()["name"] == "PTE Updated Speaking Blueprint"

        # 7. Check Stock Health
        res_health = academy.get(f"/api/academy/matrices/{matrix_id}/stock-health")
        assert res_health.status_code == 200
        health_data = res_health.json()
        assert health_data["matrix_id"] == matrix_id
        assert "health_breakdown" in health_data
        assert "is_ready_for_publishing" in health_data
        breakdown = {item["type"]: item for item in health_data["health_breakdown"]}
        assert "RA" in breakdown
        assert breakdown["RA"]["required_count"] == 2
        assert breakdown["RA"]["available_approved_count"] >= 2

        # 8. Generate Sample Exam
        res_sample = academy.post(f"/api/academy/matrices/{matrix_id}/generate-sample", json={})
        assert res_sample.status_code == 200
        sample_data = res_sample.json()
        assert sample_data["matrix_id"] == matrix_id
        assert sample_data["total_questions"] == 3
        assert len(sample_data["questions"]) == 3
        assert sample_data["questions"][0]["sequence"] == 1

        # 9. Delete Matrix
        res_delete = academy.delete(f"/api/academy/matrices/{matrix_id}")
        assert res_delete.status_code == 200
        assert res_delete.json().get("ok") is True

        # Verify it's not in active list
        res_list_after = academy.get("/api/academy/matrices")
        assert not any(m["id"] == matrix_id for m in res_list_after.json())

    def test_matrix_and_stock_health(self, env):
        """Direct test matching implementation plan naming."""
        self.test_matrix_crud_and_stock_health(env)



