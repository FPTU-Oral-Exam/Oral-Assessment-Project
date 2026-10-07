from sqlalchemy import select

from .config import settings
from .db import SessionLocal
from .models import User
from .practice import ensure_practice
from .security import hasher


def bootstrap():
    cfg = settings()
    with SessionLocal() as db:
        admin_user = db.scalar(
            select(User).where(
                (User.role.in_(["SYSTEM_ADMIN", "ADMIN"]))
                | (User.username == cfg.bootstrap_admin)
            )
        )
        if not admin_user:
            if len(cfg.bootstrap_password) < 12:
                raise ValueError("BOOTSTRAP_PASSWORD must be at least 12 characters")
            db.add(
                User(
                    username=cfg.bootstrap_admin,
                    name="Quản trị viên",
                    role="SYSTEM_ADMIN",
                    password_hash=hasher.hash(cfg.bootstrap_password),
                )
            )
            db.commit()
        ensure_practice(db)
        if not db.scalar(select(User).where(User.username == "academy")):
            pwd = cfg.bootstrap_password if len(cfg.bootstrap_password) >= 12 else "Admin@123456"
            db.add(
                User(
                    username="academy",
                    name="Cán bộ Học thuật",
                    role="ACADEMY",
                    password_hash=hasher.hash(pwd),
                )
            )
            db.commit()


if __name__ == "__main__":
    bootstrap()
