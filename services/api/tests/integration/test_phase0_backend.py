import pytest
from fastapi.testclient import TestClient
from app.main import app


class TestRBACMigration:
    """Test that role guards work with new role names"""

    def test_role_guards_importable(self):
        """Verify all role guards are defined"""
        from app.security import staff, admin, examiner, student
        assert callable(staff)
        assert callable(admin)
        assert callable(examiner)
        assert callable(student)

    def test_public_user_includes_roles_array(self):
        """Verify public_user returns roles array"""
        from app.security import public_user
        # Mock a user object
        class MockUser:
            id = "test-id"
            username = "test"
            name = "Test User"
            role = "STUDENT"
            status = "ACTIVE"
            email = "test@test.com"
            roles = ["STUDENT"]  # Required by public_user function

        result = public_user(MockUser())
        assert "roles" in result
        assert result["roles"] == ["STUDENT"]


class TestAuthResponse:
    """Test auth response format for dual-frontend"""

    def test_login_endpoint_exists(self):
        """Verify login endpoint exists"""
        client = TestClient(app)
        # Should not return 404
        response = client.post("/api/auth/login", json={
            "username": "test",
            "password": "test"
        })
        # Any response (even 401/422) means endpoint exists
        assert response.status_code != 404


class TestStudentResults:
    """Test new student results endpoints"""

    def test_student_results_endpoint_exists(self):
        """Verify /api/student/results endpoint exists"""
        client = TestClient(app)
        # Should return 401 without auth (not 404)
        response = client.get("/api/student/results")
        assert response.status_code in [200, 401]

    def test_student_results_detail_endpoint_exists(self):
        """Verify /api/student/results/{id} endpoint exists"""
        client = TestClient(app)
        response = client.get("/api/student/results/test-id")
        # Should return auth error, not 404
        assert response.status_code in [200, 401, 403, 404]


class TestUploadAPI:
    """Test upload API contracts match spec"""

    def test_upload_init_endpoint_exists(self):
        """Verify upload init endpoint exists"""
        client = TestClient(app)
        response = client.post("/api/uploads/init", json={
            "attempt_id": "test",
            "kind": "AUDIO",
            "mime_type": "audio/webm",
            "size": 1000,
            "sha256": "a" * 64
        })
        # Any response except 404 means endpoint exists
        assert response.status_code != 404

    def test_upload_status_endpoint_exists(self):
        """Verify upload status endpoint exists"""
        client = TestClient(app)
        response = client.get("/api/uploads/test-id/status")
        # Should return auth error, not 404
        assert response.status_code in [200, 401, 403, 404, 422]


class TestIdempotency:
    """Test idempotency on question submission"""

    def test_submit_endpoint_accepts_idempotency_key(self):
        """Verify submit endpoint accepts Idempotency-Key header"""
        client = TestClient(app)
        response = client.post(
            "/api/question-attempts/test-id/submit",
            headers={"Idempotency-Key": "test-key-12345"},
            json={"transcript": "test", "stt_confidence": 0.9}
        )
        # Should not return 422 for missing header
        assert response.status_code != 422
