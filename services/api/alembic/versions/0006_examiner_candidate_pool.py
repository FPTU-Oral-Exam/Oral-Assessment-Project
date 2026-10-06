"""Add master_courses, course_candidates, exam_batches tables

Revision ID: 0006
Revises: 0005
"""
from alembic import op
import sqlalchemy as sa

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade():
    naming_convention = {
        "ix": "ix_%(column_0_label)s",
        "uq": "uq_%(table_name)s_%(column_0_name)s",
        "ck": "ck_%(table_name)s_%(constraint_name)s",
        "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
        "pk": "pk_%(table_name)s",
    }

    # 1. Master courses table (university-wide course catalog)
    op.create_table(
        "master_courses",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("created_at", sa.Float(), nullable=False),
        sa.Column("code", sa.String(50), nullable=False, unique=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("department_code", sa.String(20), nullable=False),
        sa.Column("credits", sa.Integer(), nullable=False, server_default="3"),
        sa.Column("description", sa.Text(), nullable=True),
    )

    # 2. Course candidates table (no section/class - direct course enrollment)
    op.create_table(
        "course_candidates",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("created_at", sa.Float(), nullable=False),
        sa.Column("updated_at", sa.Float(), nullable=False),
        sa.Column("course_id", sa.String(36), sa.ForeignKey("courses.id", ondelete="CASCADE"), nullable=False),
        sa.Column("student_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("roll_number", sa.String(50), nullable=False),
        sa.Column("full_name", sa.String(100), nullable=False),
        sa.Column(
            "eligibility_status",
            sa.String(20),
            nullable=False,
            server_default="ELIGIBLE",
        ),
        sa.Column(
            "allocation_status",
            sa.String(20),
            nullable=False,
            server_default="UNASSIGNED",
        ),
        sa.Column("assigned_slot_id", sa.String(36), sa.ForeignKey("schedule_slots.id", ondelete="SET NULL"), nullable=True),
        sa.UniqueConstraint("course_id", "roll_number", name="uq_course_candidate_roll"),
    )
    op.create_index("idx_candidate_pool", "course_candidates", ["course_id", "eligibility_status", "allocation_status"])

    # 3. Exam batches table (exam scheduling within an exam)
    op.create_table(
        "exam_batches",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("created_at", sa.Float(), nullable=False),
        sa.Column("updated_at", sa.Float(), nullable=False),
        sa.Column("exam_id", sa.String(36), sa.ForeignKey("exams.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("date", sa.Float(), nullable=False),
        sa.Column("start_time", sa.String(10), nullable=False),
        sa.Column("end_time", sa.String(10), nullable=False),
        sa.Column("max_students_per_room", sa.Integer(), nullable=False, server_default="15"),
        sa.Column("assigned_teacher_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("total_assigned", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("status", sa.String(20), nullable=False, server_default="SCHEDULED"),
    )
    op.create_index("idx_exam_batches_exam", "exam_batches", ["exam_id"])

    # 4. Add batch_id and assigned_students_count to schedule_slots
    with op.batch_alter_table("schedule_slots", naming_convention=naming_convention) as batch:
        batch.add_column(sa.Column("batch_id", sa.String(36), sa.ForeignKey("exam_batches.id", ondelete="CASCADE", name="fk_schedule_slots_batch_id"), nullable=True))
        batch.add_column(sa.Column("assigned_students_count", sa.Integer(), nullable=False, server_default="0"))

    # 5. Add department_code to courses and make owner_id nullable
    with op.batch_alter_table("courses", naming_convention=naming_convention) as batch:
        batch.add_column(sa.Column("department_code", sa.String(20), nullable=True))
        batch.alter_column("owner_id", nullable=True, existing_type=sa.String())


def downgrade():
    naming_convention = {
        "ix": "ix_%(column_0_label)s",
        "uq": "uq_%(table_name)s_%(column_0_name)s",
        "ck": "ck_%(table_name)s_%(constraint_name)s",
        "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
        "pk": "pk_%(table_name)s",
    }

    # 1. Revert courses changes
    with op.batch_alter_table("courses", naming_convention=naming_convention) as batch:
        batch.drop_column("department_code")
        batch.alter_column("owner_id", nullable=False, existing_type=sa.String())

    # 2. Remove schedule_slots columns
    with op.batch_alter_table("schedule_slots", naming_convention=naming_convention) as batch:
        batch.drop_column("assigned_students_count")
        batch.drop_column("batch_id")

    # 3. Drop tables in reverse order
    op.drop_index("idx_exam_batches_exam", table_name="exam_batches")
    op.drop_table("exam_batches")
    op.drop_index("idx_candidate_pool", table_name="course_candidates")
    op.drop_table("course_candidates")
    op.drop_table("master_courses")
