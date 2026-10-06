"""Examiner Portal database tables and exam fields migration."""

import sqlalchemy as sa
from alembic import op

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade():
    # 1. Semesters table
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

    naming_convention = {
        "ix": "ix_%(column_0_label)s",
        "uq": "uq_%(table_name)s_%(column_0_name)s",
        "ck": "ck_%(table_name)s_%(constraint_name)s",
        "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
        "pk": "pk_%(table_name)s",
    }

    # 2. Add columns to courses
    with op.batch_alter_table("courses", naming_convention=naming_convention) as batch:
        batch.add_column(sa.Column("credits", sa.Integer(), nullable=False, server_default="3"))
        batch.add_column(sa.Column("teacher_id", sa.String(36), sa.ForeignKey("users.id", name="fk_courses_teacher_id"), nullable=True))
        batch.add_column(sa.Column("semester_id", sa.String(36), sa.ForeignKey("semesters.id", name="fk_courses_semester_id"), nullable=True))

    # 3. Sections table
    op.create_table(
        "sections",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("created_at", sa.Float(), nullable=False),
        sa.Column("course_id", sa.String(36), sa.ForeignKey("courses.id"), nullable=False),
        sa.Column("semester_id", sa.String(36), sa.ForeignKey("semesters.id"), nullable=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("code", sa.String(50), nullable=False),
        sa.Column("teacher_id", sa.String(36), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("day_of_week", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("time_slot", sa.String(20), nullable=False, server_default="MORNING"),
        sa.Column("max_students", sa.Integer(), nullable=False, server_default="50"),
        sa.Column("status", sa.String(20), nullable=False, server_default="ACTIVE"),
    )

    # 4. Exam enrollments table
    op.create_table(
        "exam_enrollments",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("created_at", sa.Float(), nullable=False),
        sa.Column("section_id", sa.String(36), sa.ForeignKey("sections.id"), nullable=False),
        sa.Column("student_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="ACTIVE"),
        sa.Column("enrolled_at", sa.Float(), nullable=True),
        sa.UniqueConstraint("section_id", "student_id", name="uq_section_student"),
    )

    # 5. Exam variants table
    op.create_table(
        "exam_variants",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("created_at", sa.Float(), nullable=False),
        sa.Column("exam_id", sa.String(36), sa.ForeignKey("exams.id"), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("questions", sa.JSON(), nullable=False),
        sa.Column("created_by", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="READY"),
    )

    # 6. Schedule slots table
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
        sa.Column("max_students", sa.Integer(), nullable=False, server_default="30"),
        sa.Column("exam_variant_id", sa.String(36), sa.ForeignKey("exam_variants.id"), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="PENDING"),
        sa.Column("grade_locked", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )

    # 7. Slot assignments table
    op.create_table(
        "slot_assignments",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("created_at", sa.Float(), nullable=False),
        sa.Column("slot_id", sa.String(36), sa.ForeignKey("schedule_slots.id"), nullable=False),
        sa.Column("student_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.UniqueConstraint("slot_id", "student_id", name="uq_slot_student"),
    )

    # 8. ReEvaluations table
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

    # 9. Exams table updates
    with op.batch_alter_table("exams", naming_convention=naming_convention) as batch:
        batch.alter_column("rubric_id", existing_type=sa.String(), nullable=True, existing_server_default=None)
        batch.add_column(sa.Column("description", sa.Text(), nullable=True, server_default=""))
        batch.add_column(sa.Column("question_count", sa.Integer(), nullable=False, server_default="3"))
        batch.alter_column("blueprint", existing_type=sa.JSON(), nullable=True, existing_server_default=None)
        batch.add_column(sa.Column("deleted_at", sa.Float(), nullable=True))


def downgrade():
    naming_convention = {
        "ix": "ix_%(column_0_label)s",
        "uq": "uq_%(table_name)s_%(column_0_name)s",
        "ck": "ck_%(table_name)s_%(constraint_name)s",
        "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
        "pk": "pk_%(table_name)s",
    }

    with op.batch_alter_table("exams", naming_convention=naming_convention) as batch:
        batch.drop_column("deleted_at")
        batch.drop_column("question_count")
        batch.drop_column("description")
        batch.alter_column("rubric_id", existing_type=sa.String(), nullable=False)
        batch.alter_column("blueprint", existing_type=sa.JSON(), nullable=False)

    op.drop_table("re_evaluations")
    op.drop_table("slot_assignments")
    op.drop_table("schedule_slots")
    op.drop_table("exam_variants")
    op.drop_table("exam_enrollments")
    op.drop_table("sections")

    with op.batch_alter_table("courses", naming_convention=naming_convention) as batch:
        batch.drop_column("semester_id")
        batch.drop_column("teacher_id")
        batch.drop_column("credits")

    op.drop_table("semesters")
