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
        "name": "Nguyễn Văn Gia Bình (Super Admin)",
        "role": "SYSTEM_ADMIN",
        "password": "Admin@123456",
        "description": "Quản trị viên Hệ thống: Toàn quyền cấu hình AI/OAuth, người dùng, audit log và điều phối",
    },
    {
        "username": "academy",
        "name": "Ban Học thuật (Master Curators)",
        "role": "ACADEMY",
        "password": "Admin@123456",
        "description": "Cán bộ Học thuật: Quản lý Kho câu hỏi ENTs Speaking, Cấu hình Dạng bài, Ma trận Đề thi, Rubrics",
    },
    {
        "username": "examiner",
        "name": "Cán bộ Khảo thí (Exam Board)",
        "role": "EXAMINER",
        "password": "Examiner@123456",
        "description": "Cán bộ Khảo thí: Quản lý học kỳ, kỳ thi, ca thi, danh sách sinh viên & phê duyệt điểm số",
    },
    {
        "username": "teacher",
        "name": "Giảng viên Chấm thi",
        "role": "TEACHER",
        "password": "Teacher@123456",
        "description": "Giảng viên Chấm thi: Giám sát phòng thi trực tiếp (/proctor) và chấm bài (/grading)",
    },
    {
        "username": "student",
        "name": "Nguyễn Văn An (Sinh viên)",
        "role": "STUDENT",
        "password": "Student@123456",
        "description": "Thí sinh: Đăng nhập vào ứng dụng Student App Desktop để làm bài thi vấn đáp",
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
