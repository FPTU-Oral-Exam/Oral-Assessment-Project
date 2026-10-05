import os
import tempfile

os.environ["JWT_SECRET"] = "test-only-secret-never-use-in-deployment-12345"
os.environ["DATA_DIR"] = tempfile.mkdtemp(prefix="oral-tests-")
os.environ["DATABASE_URL"] = os.environ.get("TEST_DATABASE_URL", "sqlite://")
os.environ["AI_PROVIDER"] = "demo"
os.environ["AI_CONFIG_SOURCE"] = "admin"
os.environ["STT_PROVIDER"] = "local_server"
os.environ["REDIS_URL"] = ""
os.environ["STORAGE_BACKEND"] = "local"
os.environ["GOOGLE_STT_CREDENTIALS_FILE"] = ""

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine, event  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

from app import worker  # noqa: E402
from app.db import Base, get_db  # noqa: E402
from app.main import app  # noqa: E402
from app.models import User  # noqa: E402
from app.security import hasher  # noqa: E402


@pytest.fixture
def env(monkeypatch):
    url = os.environ["DATABASE_URL"]
    engine = create_engine(
        url,
        **(
            {"connect_args": {"check_same_thread": False}, "poolclass": StaticPool}
            if url == "sqlite://"
            else {}
        ),
    )
    if engine.dialect.name == "sqlite":

        @event.listens_for(engine, "connect")
        def foreign_keys(connection, _):
            connection.execute("PRAGMA foreign_keys=ON")

    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, expire_on_commit=False)

    def db_override():
        with factory() as db:
            yield db

    app.dependency_overrides[get_db] = db_override
    monkeypatch.setattr(worker, "SessionLocal", factory)
    with factory() as db:
        # New role names (from CLAUDE.md standard 4-role system)
        # ADMIN -> SYSTEM_ADMIN, REVIEWER -> EXAMINER
        role_map = [
            ("system_admin", "SYSTEM_ADMIN"),
            ("teacher", "TEACHER"),
            ("student", "STUDENT"),
            ("examiner", "EXAMINER"),
            # Legacy role names for backward compatibility
            ("admin", "SYSTEM_ADMIN"),
            ("reviewer", "EXAMINER"),
            ("outsider", "STUDENT"),
        ]
        for username, role in role_map:
            db.add(
                User(
                    username=username,
                    name=role,
                    role=role,
                    password_hash=hasher.hash("test-password-123"),
                )
            )
        db.commit()
    clients = {}
    # Map old names to new roles for compatibility
    client_names = [
        ("admin", "admin"),           # old: login with "admin", role SYSTEM_ADMIN
        ("teacher", "teacher"),       # same
        ("student", "student"),       # same
        ("reviewer", "reviewer"),     # old: login with "reviewer", role EXAMINER
        ("examiner", "examiner"),     # new: login with "examiner", role EXAMINER
        ("system_admin", "system_admin"),  # new: login with "system_admin", role SYSTEM_ADMIN
        ("outsider", "outsider"),     # same
    ]
    for name, login_name in client_names:
        client = TestClient(app)
        response = client.post("/auth/login", json={"username": login_name, "password": "test-password-123"})
        assert response.status_code == 200, f"Failed to login as {login_name}: {response.text}"
        clients[name] = client
    yield clients, factory
    for client in clients.values():
        client.close()
    app.dependency_overrides.clear()
    Base.metadata.drop_all(engine)
    engine.dispose()
