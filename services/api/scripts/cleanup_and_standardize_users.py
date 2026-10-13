"""Clean up all legacy/duplicate accounts and standardize exactly 5 accounts with clear role boundaries."""

from sqlalchemy import select, update, delete, text
from app.db import SessionLocal
from app.models import User, Course, ExamSession, AuthSession, Audit
from app.security import hasher
import time

STANDARDIZED_ACCOUNTS = [
    {
        "username": "admin",
        "name": "Nguyễn Văn Gia Bình (Super Admin)",
        "role": "SYSTEM_ADMIN",
        "password": "Admin@123456",
        "email": "admin@oralai.edu.vn",
    },
    {
        "username": "academy",
        "name": "Ban Học thuật (Master Curators)",
        "role": "ACADEMY",
        "password": "Admin@123456",
        "email": "academy@oralai.edu.vn",
    },
    {
        "username": "examiner",
        "name": "Cán bộ Khảo thí (Exam Board)",
        "role": "EXAMINER",
        "password": "Examiner@123456",
        "email": "examiner@oralai.edu.vn",
    },
    {
        "username": "teacher",
        "name": "Giảng viên Chấm thi",
        "role": "TEACHER",
        "password": "Teacher@123456",
        "email": "teacher@oralai.edu.vn",
    },
    {
        "username": "student",
        "name": "Nguyễn Văn An (Sinh viên)",
        "role": "STUDENT",
        "password": "Student@123456",
        "email": "student@oralai.edu.vn",
    },
]

def run_cleanup():
    db = SessionLocal()
    try:
        print("[1/5] Checking existing users...")
        all_users = db.scalars(select(User)).all()
        user_map = {u.username: u for u in all_users}
        print(f"Current users in DB: {list(user_map.keys())}")

        # Step 1: Ensure 'admin', 'academy', 'examiner' exist and are up to date
        for spec in STANDARDIZED_ACCOUNTS[:3]:
            u = user_map.get(spec["username"])
            if not u:
                u = User(
                    username=spec["username"],
                    name=spec["name"],
                    role=spec["role"],
                    password_hash=hasher.hash(spec["password"]),
                    email=spec["email"],
                    status="ACTIVE",
                    created_at=time.time(),
                )
                db.add(u)
                db.flush()
                user_map[spec["username"]] = u
                print(f"Created user '{spec['username']}'")
            else:
                u.name = spec["name"]
                u.role = spec["role"]
                u.password_hash = hasher.hash(spec["password"])
                u.email = spec["email"]
                u.status = "ACTIVE"
                print(f"Updated user '{spec['username']}'")

        # Step 2: Handle 'teacher' (rename 'teacher1' if exists and 'teacher' doesn't exist)
        teacher_user = user_map.get("teacher")
        teacher1_user = user_map.get("teacher1")
        if not teacher_user and teacher1_user:
            teacher1_user.username = "teacher"
            teacher1_user.name = "Giảng viên Chấm thi"
            teacher1_user.password_hash = hasher.hash("Teacher@123456")
            teacher1_user.email = "teacher@oralai.edu.vn"
            teacher_user = teacher1_user
            print("Renamed 'teacher1' -> 'teacher'")
        elif not teacher_user:
            teacher_user = User(
                username="teacher",
                name="Giảng viên Chấm thi",
                role="TEACHER",
                password_hash=hasher.hash("Teacher@123456"),
                email="teacher@oralai.edu.vn",
                status="ACTIVE",
                created_at=time.time(),
            )
            db.add(teacher_user)
            db.flush()
            print("Created user 'teacher'")
        else:
            teacher_user.name = "Giảng viên Chấm thi"
            teacher_user.role = "TEACHER"
            teacher_user.password_hash = hasher.hash("Teacher@123456")
            teacher_user.email = "teacher@oralai.edu.vn"
            teacher_user.status = "ACTIVE"
            print("Updated user 'teacher'")

        # Step 3: Handle 'student' (rename 'student1' if exists and 'student' doesn't exist)
        student_user = user_map.get("student")
        student1_user = user_map.get("student1")
        if not student_user and student1_user:
            student1_user.username = "student"
            student1_user.name = "Nguyễn Văn An (Sinh viên)"
            student1_user.password_hash = hasher.hash("Student@123456")
            student1_user.email = "student@oralai.edu.vn"
            student_user = student1_user
            print("Renamed 'student1' -> 'student'")
        elif not student_user:
            student_user = User(
                username="student",
                name="Nguyễn Văn An (Sinh viên)",
                role="STUDENT",
                password_hash=hasher.hash("Student@123456"),
                email="student@oralai.edu.vn",
                status="ACTIVE",
                created_at=time.time(),
            )
            db.add(student_user)
            db.flush()
            print("Created user 'student'")
        else:
            student_user.name = "Nguyễn Văn An (Sinh viên)"
            student_user.role = "STUDENT"
            student_user.password_hash = hasher.hash("Student@123456")
            student_user.email = "student@oralai.edu.vn"
            student_user.status = "ACTIVE"
            print("Updated user 'student'")

        db.flush()

        # Step 4: Re-route and clean up legacy accounts

        # 4.1 'binh' -> delete
        binh_user = db.scalar(select(User).where(User.username == "binh"))
        if binh_user:
            print("Removing legacy user 'binh'...")
            db.execute(delete(AuthSession).where(AuthSession.user_id == binh_user.id))
            db.execute(delete(Audit).where(Audit.user_id == binh_user.id))
            db.delete(binh_user)
            print("Removed legacy user 'binh'")

        # 4.2 'teacher_demo' -> re-route courses then delete
        teacher_demo = db.scalar(select(User).where(User.username == "teacher_demo"))
        if teacher_demo:
            print(f"Re-routing courses from 'teacher_demo' ({teacher_demo.id}) -> 'teacher' ({teacher_user.id})...")
            db.execute(update(Course).where(Course.owner_id == teacher_demo.id).values(owner_id=teacher_user.id))
            db.execute(update(Course).where(Course.teacher_id == teacher_demo.id).values(teacher_id=teacher_user.id))
            db.execute(delete(AuthSession).where(AuthSession.user_id == teacher_demo.id))
            db.execute(delete(Audit).where(Audit.user_id == teacher_demo.id))
            db.delete(teacher_demo)
            print("Removed legacy user 'teacher_demo'")

        # 4.3 'student_demo' -> delete its dummy sessions/attempts and delete user
        student_demo = db.scalar(select(User).where(User.username == "student_demo"))
        if student_demo:
            print(f"Purging dummy sessions for 'student_demo' ({student_demo.id})...")
            db.execute(text("DELETE FROM re_evaluations WHERE attempt_id IN (SELECT id FROM question_attempts WHERE session_id IN (SELECT id FROM exam_sessions WHERE student_id = :sid))"), {"sid": student_demo.id})
            db.execute(text("DELETE FROM review_jobs WHERE attempt_id IN (SELECT id FROM question_attempts WHERE session_id IN (SELECT id FROM exam_sessions WHERE student_id = :sid))"), {"sid": student_demo.id})
            db.execute(text("DELETE FROM uploads WHERE attempt_id IN (SELECT id FROM question_attempts WHERE session_id IN (SELECT id FROM exam_sessions WHERE student_id = :sid))"), {"sid": student_demo.id})
            db.execute(text("DELETE FROM question_attempts WHERE session_id IN (SELECT id FROM exam_sessions WHERE student_id = :sid)"), {"sid": student_demo.id})
            db.execute(text("DELETE FROM exam_sessions WHERE student_id = :sid"), {"sid": student_demo.id})
            db.execute(text("DELETE FROM assignments WHERE student_id = :sid"), {"sid": student_demo.id})
            db.execute(text("DELETE FROM course_candidates WHERE student_id = :sid"), {"sid": student_demo.id})
            db.execute(text("DELETE FROM course_enrollments WHERE student_id = :sid"), {"sid": student_demo.id})
            db.execute(text("DELETE FROM exam_enrollments WHERE student_id = :sid"), {"sid": student_demo.id})
            db.execute(text("DELETE FROM slot_assignments WHERE student_id = :sid"), {"sid": student_demo.id})
            db.execute(delete(AuthSession).where(AuthSession.user_id == student_demo.id))
            db.execute(delete(Audit).where(Audit.user_id == student_demo.id))
            db.delete(student_demo)
            print("Removed legacy user 'student_demo'")

        # 4.4 If old 'teacher1' still exists separately from 'teacher'
        if teacher1_user and teacher1_user.id != teacher_user.id:
            db.execute(update(Course).where(Course.owner_id == teacher1_user.id).values(owner_id=teacher_user.id))
            db.execute(update(Course).where(Course.teacher_id == teacher1_user.id).values(teacher_id=teacher_user.id))
            db.execute(delete(AuthSession).where(AuthSession.user_id == teacher1_user.id))
            db.execute(delete(Audit).where(Audit.user_id == teacher1_user.id))
            db.delete(teacher1_user)
            print("Removed duplicate user 'teacher1'")

        # 4.5 If old 'student1' still exists separately from 'student'
        if student1_user and student1_user.id != student_user.id:
            db.execute(delete(AuthSession).where(AuthSession.user_id == student1_user.id))
            db.execute(delete(Audit).where(Audit.user_id == student1_user.id))
            db.delete(student1_user)
            print("Removed duplicate user 'student1'")

        db.commit()

        # Step 5: Verify final state
        final_users = db.scalars(select(User).order_by(User.role, User.username)).all()
        print("\n=== FINAL STANDARDIZED USERS IN DATABASE ===")
        for u in final_users:
            print(f"- [{u.role:12}] username='{u.username:10}' | name='{u.name}' | email='{u.email}'")
        print(f"Total users: {len(final_users)}")

    except Exception as e:
        db.rollback()
        print(f"Error during cleanup: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    run_cleanup()
