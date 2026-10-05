"""Examiner Portal schema: semesters, sections, schedule slots, variants, re-evaluations and course extensions."""

import sqlalchemy as sa
from alembic import op

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade():
    # 1. Semesters
    op.create_table(
        "semesters",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("created_at", sa.Float(), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column("term", sa.String(20), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="DRAFT"),
        sa.Column("start_date", sa.Float(), nullable=False),
        sa.Column("end_date", sa.Float(), nullable=False),
    )

    # 2. Add examiner columns to courses
    with op.batch_alter_table("courses") as batch:
        batch.add_column(sa.Column("credits", sa.Integer(), nullable=False, server_default="3"))
        batch.add_column(sa.Column("teacher_id", sa.String(36), sa.ForeignKey("users.id", name="fk_courses_teacher_id"), nullable=True))
        batch.add_column(sa.Column("semester_id", sa.String(36), sa.ForeignKey("semesters.id", name="fk_courses_semester_id"), nullable=True))

    # 3. Sections
    op.create_table(
        "sections",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("created_at", sa.Float(), nullable=False),
        sa.Column("course_id", sa.String(36), sa.ForeignKey("courses.id"), nullable=False),
        sa.Column("semester_id", sa.String(36), sa.ForeignKey("semesters.id"), nullable=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("code", sa.String(50), nullable=False),
        sa.Column("teacher_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("day_of_week", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("time_slot", sa.String(20), nullable=False, server_default="MORNING"),
        sa.Column("max_students", sa.Integer(), nullable=False, server_default="50"),
        sa.Column("status", sa.String(20), nullable=False, server_default="DRAFT"),
    )

    # 4. Exam Variants
    op.create_table(
        "exam_variants",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("created_at", sa.Float(), nullable=False),
        sa.Column("exam_id", sa.String(36), sa.ForeignKey("exams.id"), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("questions", sa.JSON(), nullable=False),
        sa.Column("created_by", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="CREATING"),
    )

    # 5. Schedule Slots
    op.create_table(
        "schedule_slots",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("created_at", sa.Float(), nullable=False),
        sa.Column("exam_id", sa.String(36), sa.ForeignKey("exams.id"), nullable=False),
        sa.Column("slot_number", sa.Integer(), nullable=False),
        sa.Column("date", sa.Float(), nullable=False),
        sa.Column("start_time", sa.String(10), nullable=False),
        sa.Column("end_time", sa.String(10), nullable=False),
        sa.Column("room", sa.String(50), nullable=False),
        sa.Column("max_students", sa.Integer(), nullable=False),
        sa.Column("exam_variant_id", sa.String(36), sa.ForeignKey("exam_variants.id"), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="PENDING"),
        sa.Column("grade_locked", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )

    # 6. Re-evaluations
    op.create_table(
        "re_evaluations",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("created_at", sa.Float(), nullable=False),
        sa.Column("attempt_id", sa.String(36), sa.ForeignKey("question_attempts.id"), nullable=False),
        sa.Column("teacher_id_1", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("teacher_id_2", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("reason", sa.String(50), nullable=False),
        sa.Column("reason_detail", sa.Text(), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="PENDING"),
        sa.Column("score_1", sa.Float(), nullable=True),
        sa.Column("score_2", sa.Float(), nullable=True),
        sa.Column("final_score", sa.Float(), nullable=True),
        sa.Column("blind_marking", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("completed_at", sa.Float(), nullable=True),
    )

    # 7. Exam Enrollments
    op.create_table(
        "exam_enrollments",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("created_at", sa.Float(), nullable=False),
        sa.Column("section_id", sa.String(36), sa.ForeignKey("sections.id"), nullable=False),
        sa.Column("student_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="ACTIVE"),
        sa.Column("enrolled_at", sa.Float(), nullable=False),
        sa.UniqueConstraint("section_id", "student_id"),
    )

    # 8. Slot Assignments
    op.create_table(
        "slot_assignments",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("created_at", sa.Float(), nullable=False),
        sa.Column("slot_id", sa.String(36), sa.ForeignKey("schedule_slots.id"), nullable=False),
        sa.Column("student_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.UniqueConstraint("slot_id", "student_id"),
    )


def downgrade():
    op.drop_table("slot_assignments")
    op.drop_table("exam_enrollments")
    op.drop_table("re_evaluations")
    op.drop_table("schedule_slots")
    op.drop_table("exam_variants")
    op.drop_table("sections")
    with op.batch_alter_table("courses") as batch:
        batch.drop_column("semester_id")
        batch.drop_column("teacher_id")
        batch.drop_column("credits")
    op.drop_table("semesters")
