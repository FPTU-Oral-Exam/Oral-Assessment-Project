"""Test security.py helpers, especially public_user() for BUG-007.

BUG-007: public_user() raised AttributeError because it tried getattr(user, "roles")
but User model only has the "role" column (singular, not plural).
"""
import os
import tempfile

os.environ["JWT_SECRET"] = "test-only-secret-never-use-in-deployment-12345"
os.environ["DATA_DIR"] = tempfile.mkdtemp(prefix="oral-tests-public-user-")
os.environ["DATABASE_URL"] = "sqlite://"
os.environ["AI_PROVIDER"] = "demo"
os.environ["AI_CONFIG_SOURCE"] = "admin"
os.environ["STT_PROVIDER"] = "local_server"
os.environ["REDIS_URL"] = ""
os.environ["STORAGE_BACKEND"] = "local"
os.environ["GOOGLE_STT_CREDENTIALS_FILE"] = ""

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

from app.db import Base
from app.models import User
from app.security import hasher, public_user


def _make_engine():
    url = "sqlite://"
    engine = create_engine(url, connect_args={"check_same_thread": False}, poolclass=StaticPool)

    @event.listens_for(engine, "connect")
    def foreign_keys(connection, _):
        connection.execute("PRAGMA foreign_keys=ON")

    Base.metadata.create_all(engine)
    return engine


def _seed_db(session: Session):
    """Insert one user per new-style role so we cover all branches."""
    for role in ("SYSTEM_ADMIN", "EXAMINER", "TEACHER", "STUDENT"):
        session.add(
            User(
                username=role.lower(),
                name=role,
                role=role,
                password_hash=hasher.hash("test-password-123"),
            )
        )
    session.commit()


def test_public_user_no_attribute_error():
    """public_user() must NOT raise AttributeError for any supported role.

    Regression test for BUG-007: the old implementation had
        {k: getattr(user, k) for k in (... "roles" ...)}
    which crashed because User model has no 'roles' column.
    """
    engine = _make_engine()
    factory = sessionmaker(bind=engine, expire_on_commit=False)

    with factory() as db:
        _seed_db(db)

    with factory() as db:
        users = db.query(User).all()
        assert len(users) == 4, f"Expected 4 users, got {len(users)}"

        for user in users:
            # Must NOT raise AttributeError
            result = public_user(user)

            # Shape must match what Staff Portal UI expects
            assert isinstance(result, dict), f"public_user({user.username}) returned non-dict: {type(result)}"
            expected_keys = {"id", "username", "name", "role", "status", "email", "roles"}
            assert set(result.keys()) == expected_keys, (
                f"public_user({user.username!r}) keys={set(result.keys())} != {expected_keys}"
            )

            # 'role' is the raw DB column (singular string)
            assert isinstance(result["role"], str), f"role should be str, got {type(result['role'])}"
            assert result["role"] == user.role

            # 'roles' is the derived list (plural) — kept for UI compatibility
            assert isinstance(result["roles"], list), f"roles should be list, got {type(result['roles'])}"
            assert len(result["roles"]) == 1, f"roles should have exactly 1 element, got {result['roles']}"
            assert result["roles"][0] == user.role, (
                f"roles[0]={result['roles'][0]!r} != user.role={user.role!r}"
            )

    engine.dispose()
