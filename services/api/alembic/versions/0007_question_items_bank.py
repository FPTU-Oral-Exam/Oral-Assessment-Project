"""Add question_items table for Item Bank

Revision ID: 0007
Revises: 0006
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON

revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "question_items",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("created_at", sa.Float(), nullable=False),
        sa.Column("course_id", sa.String(36), sa.ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("topic_id", sa.String(36), sa.ForeignKey("topics.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("learning_outcome_id", sa.String(36), sa.ForeignKey("learning_outcomes.id", ondelete="SET NULL"), nullable=True),
        sa.Column("difficulty", sa.String(20), nullable=False, server_default="MEDIUM"),
        sa.Column("prompt", sa.Text(), nullable=False),
        sa.Column("expected_points", sa.JSON(), nullable=True),
        sa.Column("key_terms", sa.JSON(), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="APPROVED"),
        sa.Column("author_id", sa.String(36), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("usage_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("deleted_at", sa.Float(), nullable=True),
    )


def downgrade():
    op.drop_table("question_items")
