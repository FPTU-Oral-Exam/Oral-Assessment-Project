"""Seed demo accounts across all 4 roles for development and testing.

Usage inside API container:
    python scripts/seed_demo_accounts.py
or from host via docker:
    docker exec oral-assessment-api-1 python /app/scripts/seed_demo_accounts.py
"""

from sqlalchemy import select
from app.db import SessionLocal
from app.models import User
from app.security import hasher

ACCOUNTS = [
    {
        "username": "admin",
        "name": "Quản trị viên Hệ thống",
        "role": "SYSTEM_ADMIN",
        "password": "Admin@123456",
        "description": "Quản trị toàn quyền: Cấu hình hệ thống, Quản lý tài khoản, Audit log",
    },
    {
        "username": "academy",
        "name": "Cán bộ Học thuật",
        "role": "ACADEMY",
        "password": "Admin@123456",
        "description": "Quản lý môn học chuẩn, LO, Rubric, Item Bank & Master Blueprint",
    },
    {
        "username": "examiner",
        "name": "Cán bộ Khảo thí",
        "role": "EXAMINER",
        "password": "Examiner@123456",
        "description": "Quản lý học kỳ, mở môn thi, danh sách sinh viên, ca thi & phân bổ mã đề ATA",
    },
    {
        "username": "teacher1",
        "name": "Giảng viên Chấm thi",
        "role": "TEACHER",
        "password": "Teacher@123456",
        "description": "Coi thi trực tiếp (/proctor) và chấm điểm bài thi (/grading)",
    },
    {
        "username": "student1",
        "name": "Nguyễn Văn An (Sinh viên)",
        "role": "STUDENT",
        "password": "Student@123456",
        "description": "Thí sinh làm bài thi vấn đáp trên ứng dụng Student App Desktop",
    },
]


def seed():
    with SessionLocal() as db:
        for acc in ACCOUNTS:
            user = db.scalar(select(User).where(User.username == acc["username"]))
            if user:
                user.password_hash = hasher.hash(acc["password"])
                user.role = acc["role"]
                user.name = acc["name"]
                user.status = "ACTIVE"
                print(f"[*] Cập nhật tài khoản: {acc['username']:<10} | Role: {acc['role']:<13} | Mật khẩu: {acc['password']}")
            else:
                db.add(
                    User(
                        username=acc["username"],
                        name=acc["name"],
                        role=acc["role"],
                        password_hash=hasher.hash(acc["password"]),
                        status="ACTIVE",
                    )
                )
                print(f"[+] Tạo mới tài khoản:  {acc['username']:<10} | Role: {acc['role']:<13} | Mật khẩu: {acc['password']}")
        db.commit()
    print("\n=> Đã đồng bộ toàn bộ tài khoản Seed Data thành công!")


if __name__ == "__main__":
    seed()
