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
        description="ENTS Speaking blueprint",
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
    from app.models import AcademicQuestion, AcademicMatrix, QuestionTypeConfigModel, Rubric

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

    # Rubric model fields
    assert hasattr(Rubric, "name")
    assert hasattr(Rubric, "description")
    assert hasattr(Rubric, "criteria")
    assert hasattr(Rubric, "version")
    assert hasattr(Rubric, "course_id")


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


class TestAcademicRubrics:
    """Test Suite for Task 4: Rubrics Studio & Question Type Configurations."""

    def test_rubrics_crud_and_invariant(self, env):
        clients, _ = env
        academy = clients["academy"]

        # 1. Rubric Invariant: Sum of weights must equal 100%
        valid_payload = {
            "name": "ENTS Speaking Official Rubric",
            "description": "5 standard dimensions",
            "course_id": None,
            "criteria": [
                {"name": "Content", "max_score": 10.0, "weight": 30.0, "description": "Topic relevance"},
                {"name": "Pronunciation", "max_score": 10.0, "weight": 25.0, "description": "Phoneme clarity"},
                {"name": "Fluency", "max_score": 10.0, "weight": 25.0, "description": "Rhythm and speech rate"},
                {"name": "Vocabulary", "max_score": 10.0, "weight": 20.0, "description": "Lexical richness"},
            ],
        }
        res_create = academy.post("/api/academy/rubrics", json=valid_payload)
        assert res_create.status_code in (200, 201), f"Create failed: {res_create.text}"
        rubric_data = res_create.json()
        assert rubric_data["name"] == "ENTS Speaking Official Rubric"
        assert rubric_data["version"] == 1
        rubric_id = rubric_data["id"]

        # 2. List Rubrics
        res_list = academy.get("/api/academy/rubrics")
        assert res_list.status_code == 200
        items = res_list.json()
        assert any(r["id"] == rubric_id for r in items)

        # 3. Get Rubric Detail
        res_get = academy.get(f"/api/academy/rubrics/{rubric_id}")
        assert res_get.status_code == 200
        assert res_get.json()["name"] == "ENTS Speaking Official Rubric"

        # 4. Update Rubric (add criterion)
        res_update = academy.put(
            f"/api/academy/rubrics/{rubric_id}",
            json={
                "name": "ENTS Speaking Updated Rubric",
                "criteria": [
                    {"name": "Content", "max_score": 10.0, "weight": 25.0, "description": "Topic relevance"},
                    {"name": "Pronunciation", "max_score": 10.0, "weight": 25.0, "description": "Phoneme clarity"},
                    {"name": "Fluency", "max_score": 10.0, "weight": 25.0, "description": "Rhythm and speech rate"},
                    {"name": "Vocabulary", "max_score": 10.0, "weight": 15.0, "description": "Lexical richness"},
                    {"name": "Oral Fluency", "max_score": 10.0, "weight": 10.0, "description": "Spoken fluency"},
                ],
            },
        )
        assert res_update.status_code == 200
        assert res_update.json()["name"] == "ENTS Speaking Updated Rubric"
        assert len(res_update.json()["criteria"]) == 5

        # 5. Invalid Rubric: Sum of weights != 100 should fail with 400/422
        bad_payload = {
            "name": "Bad Rubric - Sum is 80%",
            "description": "Invalid weights",
            "course_id": None,
            "criteria": [
                {"name": "Content", "max_score": 10.0, "weight": 40.0, "description": "Topic"},
                {"name": "Pronunciation", "max_score": 10.0, "weight": 40.0, "description": "Pron"},
            ],
        }
        res_bad = academy.post("/api/academy/rubrics", json=bad_payload)
        assert res_bad.status_code in (400, 422), f"Expected 400/422, got {res_bad.status_code}: {res_bad.text}"

        # 6. Delete Rubric
        res_delete = academy.delete(f"/api/academy/rubrics/{rubric_id}")
        assert res_delete.status_code == 200
        assert res_delete.json().get("ok") is True

        # Verify deleted
        res_list_after = academy.get("/api/academy/rubrics")
        assert not any(r["id"] == rubric_id for r in res_list_after.json())

    def test_question_types_config(self, env):
        clients, _ = env
        academy = clients["academy"]

        # 1. List Question Types - should have 7 default types after init (including ASQ)
        res_list = academy.get("/api/academy/question-types")
        assert res_list.status_code == 200
        qt_list = res_list.json()
        assert len(qt_list) == 7

        # Verify expected types exist
        type_codes = {item["type"] for item in qt_list}
        expected = {"RA", "RS", "GD", "DI", "SI", "RL", "ASQ"}
        assert expected.issubset(type_codes), f"Missing types: {expected - type_codes}"

        # 2. Get specific question type config
        res_ra = academy.get("/api/academy/question-types/RA")
        assert res_ra.status_code == 200
        ra_config = res_ra.json()
        assert ra_config["type"] == "RA"
        assert ra_config["default_prep_time"] == 35
        assert ra_config["default_response_time"] == 40

        # 3. Update question type config
        res_update = academy.put(
            "/api/academy/question-types/RA",
            json={
                "name": "Read Aloud (Updated)",
                "description": "Read the passage aloud with correct pronunciation.",
                "default_prep_time": 40,
                "default_response_time": 45,
            },
        )
        assert res_update.status_code == 200
        updated = res_update.json()
        assert updated["name"] == "Read Aloud (Updated)"
        assert updated["default_prep_time"] == 40
        assert updated["default_response_time"] == 45

        # 4. Create new question type (POST)
        res_create = academy.post(
            "/api/academy/question-types",
            json={
                "type": "OP",
                "name": "Open Presentation",
                "vietnamese_name": "Thuyết trình chủ đề mở",
                "description": "Thuyết trình tự do theo chủ đề cho trước trong 60 giây.",
                "default_prep_time": 30,
                "default_response_time": 60,
                "requires_image": False,
                "requires_audio_prompt": False,
                "requires_audio_script": False,
                "requires_key_points": True,
                "recommended_question_count": 1,
            },
        )
        assert res_create.status_code == 201, f"Create failed: {res_create.text}"
        created_op = res_create.json()
        assert created_op["type"] == "OP"
        assert created_op["requires_key_points"] is True
        assert created_op["question_count"] == 0

        # Duplicate type returns 409 Conflict
        res_dup = academy.post(
            "/api/academy/question-types",
            json={
                "type": "OP",
                "name": "Duplicate OP",
                "default_prep_time": 20,
                "default_response_time": 40,
            },
        )
        assert res_dup.status_code == 409

        # 5. Create a test question with type RA and verify sync_existing_questions
        res_q = academy.post(
            "/api/academy/questions",
            json={
                "code": "RA-SYNC-TEST-01",
                "skill": "SPEAKING",
                "type": "RA",
                "title": "Sync Test Question",
                "prompt": "Test prompt text for synchronization.",
                "prep_time": 35,
                "response_time": 40,
                "difficulty": "MEDIUM",
                "tags": ["SyncTest"],
            },
        )
        assert res_q.status_code == 201
        created_q_id = res_q.json()["id"]

        # Update RA with sync_existing_questions=true
        res_sync_update = academy.put(
            "/api/academy/question-types/RA?sync_existing_questions=true",
            json={
                "name": "Read Aloud (Synced)",
                "default_prep_time": 25,
                "default_response_time": 50,
            },
        )
        assert res_sync_update.status_code == 200
        assert res_sync_update.json()["question_count"] >= 1

        # Verify existing question's prep_time and response_time were updated
        res_get_q = academy.get(f"/api/academy/questions/{created_q_id}")
        assert res_get_q.status_code == 200
        assert res_get_q.json()["prep_time"] == 25
        assert res_get_q.json()["response_time"] == 50

        # 6. Get non-existent question type should return 404
        res_404 = academy.get("/api/academy/question-types/INVALID")
        assert res_404.status_code == 404

    def test_rubrics_and_question_types(self, env):
        """Alias for plan naming compatibility."""
        self.test_rubrics_crud_and_invariant(env)


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
            "code": "MATRIX-ENTS-STD-01",
            "name": "ENTS Standard Speaking Blueprint",
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
        assert matrix_data["code"] == "MATRIX-ENTS-STD-01"
        assert len(matrix_data["rules"]) == 2

        # 4. List Matrices
        res_list = academy.get("/api/academy/matrices")
        assert res_list.status_code == 200
        items = res_list.json()
        assert any(m["id"] == matrix_id for m in items)

        # 5. Get Matrix Detail
        res_get = academy.get(f"/api/academy/matrices/{matrix_id}")
        assert res_get.status_code == 200
        assert res_get.json()["name"] == "ENTS Standard Speaking Blueprint"

        # 6. Update Matrix
        res_update = academy.put(
            f"/api/academy/matrices/{matrix_id}",
            json={"name": "ENTS Updated Speaking Blueprint"},
        )
        assert res_update.status_code == 200
        assert res_update.json()["name"] == "ENTS Updated Speaking Blueprint"

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


class TestAcademicQuestions:
    """Test Suite for Task 2: Question Bank CRUD & Approval."""

    def test_create_and_list_questions(self, env):
        clients, _ = env
        academy = clients["academy"]
        student = clients["student"]

        # 1. Non-academy user forbidden (403)
        res_forbidden = student.get("/api/academy/questions")
        assert res_forbidden.status_code == 403

        # 2. Create question (201)
        payload = {
            "code": "RA-TEST-99",
            "skill": "SPEAKING",
            "type": "RA",
            "title": "Quantum Physics Passage",
            "prompt": "Quantum mechanics explores atomic behavior.",
            "prep_time": 35,
            "response_time": 40,
            "difficulty": "MEDIUM",
            "status": "DRAFT",
            "tags": ["Physics", "Science"],
            "is_predicted": True,
        }
        resp = academy.post("/api/academy/questions", json=payload)
        assert resp.status_code == 201, f"Create failed: {resp.text}"
        created = resp.json()
        assert created["code"] == "RA-TEST-99"
        assert created["status"] == "DRAFT"
        q_id = created["id"]

        # 3. Get Details (200)
        resp_get = academy.get(f"/api/academy/questions/{q_id}")
        assert resp_get.status_code == 200
        assert resp_get.json()["id"] == q_id
        assert resp_get.json()["title"] == "Quantum Physics Passage"

        # 4. List with Filter (200)
        resp_list = academy.get("/api/academy/questions?type=RA&difficulty=MEDIUM")
        assert resp_list.status_code == 200
        items = resp_list.json()
        assert any(item["id"] == q_id for item in items)

        # 5. Update Question (200)
        resp_update = academy.put(
            f"/api/academy/questions/{q_id}",
            json={"title": "Updated Quantum Physics Passage", "difficulty": "HARD"},
        )
        assert resp_update.status_code == 200
        assert resp_update.json()["title"] == "Updated Quantum Physics Passage"
        assert resp_update.json()["difficulty"] == "HARD"

        # 6. Approve Question (200)
        resp_approve = academy.post(f"/api/academy/questions/{q_id}/approve", json={})
        assert resp_approve.status_code == 200
        assert resp_approve.json()["status"] == "APPROVED"

        # 7. Delete Question (soft delete) (200)
        resp_delete = academy.delete(f"/api/academy/questions/{q_id}")
        assert resp_delete.status_code == 200
        assert resp_delete.json().get("ok") is True

        # Verify not in active list
        resp_list_after = academy.get("/api/academy/questions?type=RA")
        assert not any(item["id"] == q_id for item in resp_list_after.json())

    def test_questions_stats_endpoint(self, env):
        clients, _ = env
        academy = clients["academy"]

        resp = academy.get("/api/academy/questions/stats")
        assert resp.status_code == 200, f"Stats failed: {resp.text}"
        data = resp.json()
        assert "total" in data
        assert "by_type" in data
        assert "by_difficulty" in data
        assert "by_status" in data
        assert isinstance(data["total"], int)




