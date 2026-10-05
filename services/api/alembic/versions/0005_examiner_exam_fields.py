"""Add description and question_count to exams for Examiner Portal."""

import sqlalchemy as sa

from alembic import op

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade():
    # Make rubric_id nullable (was required FK, now optional for MVP)
    with op.batch_alter_table("exams") as batch:
        batch.alter_column("rubric_id", existing_type=sa.String(), nullable=True, existing_server_default=None)
    # Add description column
    op.add_column("exams", sa.Column("description", sa.Text(), nullable=True, server_default=""))
    # Add question_count column
    op.add_column("exams", sa.Column("question_count", sa.Integer(), nullable=False, server_default="3"))
    # Make blueprint nullable with default empty list
    with op.batch_alter_table("exams") as batch:
        batch.alter_column("blueprint", existing_type=sa.JSON(), nullable=True, existing_server_default=None)
    # Add deleted_at for soft-delete
    op.add_column("exams", sa.Column("deleted_at", sa.Float(), nullable=True))


def downgrade():
    with op.batch_alter_table("exams") as batch:
        batch.drop_column("deleted_at")
        batch.drop_column("question_count")
        batch.drop_column("description")
        batch.alter_column("rubric_id", existing_type=sa.String(), nullable=False)
        batch.alter_column("blueprint", existing_type=sa.JSON(), nullable=False)
