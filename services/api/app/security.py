import hashlib
import secrets
import time
from datetime import datetime, timedelta, timezone

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerificationError
from fastapi import Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import settings
from .db import get_db
from .models import AuthSession, Course, User

hasher = PasswordHasher()


def fail(status: int, code: str, message: str):
    raise HTTPException(status, detail={"code": code, "message": message, "details": {}})


def verify_password(password: str, hashed: str):
    try:
        return hasher.verify(hashed, password)
    except VerificationError:
        return False


def digest(value: str):
    return hashlib.sha256(value.encode()).hexdigest()


def issue_tokens(db: Session, user: User):
    cfg = settings()
    refresh = secrets.token_urlsafe(48)
    row = AuthSession(
        user_id=user.id, token_hash=digest(refresh), expires_at=time.time() + cfg.refresh_days * 86400
    )
    db.add(row)
    db.flush()
    token = jwt.encode(
        {
            "sub": user.id,
            "sid": row.id,
            "type": "access",
            "iat": datetime.now(timezone.utc),
            "exp": datetime.now(timezone.utc) + timedelta(minutes=cfg.access_minutes),
        },
        cfg.jwt_secret,
        algorithm="HS256",
    )
    return token, refresh


def current_user(request: Request, db: Session = Depends(get_db)):
    raw = request.headers.get("authorization", "")
    # Check Bearer token first (Student App)
    token = raw[7:] if raw.startswith("Bearer ") else None
    # Fallback to HTTP-only cookie (Staff Portal)
    if not token:
        token = request.cookies.get("auth_token") or request.cookies.get("access_token")
    if not token:
        fail(401, "UNAUTHENTICATED", "Vui lòng đăng nhập")
    try:
        data = jwt.decode(
            token,
            settings().jwt_secret,
            algorithms=["HS256"],
            options={"require": ["exp", "iat", "sub", "sid", "type"]},
        )
        auth = db.get(AuthSession, data["sid"])
        user = db.get(User, data["sub"])
        if (
            data["type"] != "access"
            or not auth
            or auth.revoked
            or auth.user_id != data["sub"]
            or auth.expires_at < time.time()
            or not user
            or user.status != "ACTIVE"
        ):
            raise ValueError()
        return user
    except (jwt.PyJWTError, ValueError, KeyError):
        fail(401, "UNAUTHENTICATED", "Phiên đăng nhập hết hạn")


def roles(*allowed):
    def guard(user: User = Depends(current_user)):
        if user.role not in allowed:
            fail(403, "FORBIDDEN", "Bạn không có quyền thực hiện thao tác này")
        return user

    return guard


staff = roles("SYSTEM_ADMIN", "ADMIN", "EXAMINER", "REVIEWER", "TEACHER")
editor = roles("SYSTEM_ADMIN", "ADMIN", "TEACHER")
student = roles("STUDENT")
admin = roles("SYSTEM_ADMIN", "ADMIN")
examiner = roles("SYSTEM_ADMIN", "ADMIN", "EXAMINER", "REVIEWER")


def course_access(db, course_id, user):
    course = db.get(Course, course_id)
    if not course:
        fail(404, "NOT_FOUND", "Không tìm thấy môn học")
    if (
        user.role not in {"SYSTEM_ADMIN", "ADMIN", "EXAMINER", "REVIEWER"}
        and user.id not in {course.owner_id, course.teacher_id}
        and course.code != "ORAL-PRACTICE"
    ):
        fail(403, "FORBIDDEN", "Bạn không phụ trách môn học này")
    return course


def public_user(user):
    # NOTE: User model has 'role' (singular string) after Phase 0 RBAC migration.
    # We keep 'roles' (plural list) in the returned dict for Staff Portal UI compatibility.
    return {
        "id": user.id,
        "username": user.username,
        "name": user.name,
        "role": user.role,
        "status": user.status,
        "email": user.email,
        "roles": [user.role],
    }


def by_id(db, model, key, lock=False):
    query = select(model).where(model.id == key)
    if lock:
        query = query.with_for_update()
    row = db.scalar(query)
    if not row:
        fail(404, "NOT_FOUND", "Không tìm thấy dữ liệu")
    return row


def cookies(response, access, refresh):
    from .runtime_settings import settings as runtime_settings

    cfg = runtime_settings()
    secure = cfg.cookie_secure or cfg.public_origin.startswith("https://")

    # HTTP-only cookie for Staff Portal (primary)
    response.set_cookie(
        "auth_token", access,
        httponly=True, secure=secure, samesite="strict", max_age=cfg.access_minutes * 60
    )
    # Legacy cookies for backward compatibility
    response.set_cookie(
        "access_token", access,
        httponly=True, secure=secure, samesite="lax", max_age=cfg.access_minutes * 60
    )
    response.set_cookie(
        "refresh_token",
        refresh,
        httponly=True,
        secure=secure,
        samesite="lax",
        max_age=cfg.refresh_days * 86400,
    )
