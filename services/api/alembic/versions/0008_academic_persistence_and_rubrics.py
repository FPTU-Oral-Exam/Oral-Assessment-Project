"""Add academic tables (academic_questions, academic_matrices, question_type_configs) and update rubrics table

Revision ID: 0008
Revises: 0007
"""
from alembic import op
import sqlalchemy as sa

revision = "0008"
down_revision = "0007"
branch_labels = None
depends_on = None


def upgrade():
    # 1. Update rubrics table columns
    op.add_column("rubrics", sa.Column("description", sa.Text(), nullable=True, server_default=""))
    op.add_column("rubrics", sa.Column("updated_at", sa.Float(), nullable=True, server_default="0"))

    # 2. Create academic_questions table
    op.create_table(
        "academic_questions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("code", sa.String(50), nullable=False, unique=True, index=True),
        sa.Column("skill", sa.String(20), nullable=False, server_default="SPEAKING"),
        sa.Column("type", sa.String(10), nullable=False, index=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("prompt", sa.Text(), nullable=False),
        sa.Column("media_url", sa.String(500), nullable=True),
        sa.Column("audio_script", sa.Text(), nullable=True),
        sa.Column("prep_time", sa.Integer(), nullable=False, server_default="30"),
        sa.Column("response_time", sa.Integer(), nullable=False, server_default="40"),
        sa.Column("difficulty", sa.String(10), nullable=False, server_default="MEDIUM", index=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="APPROVED", index=True),
        sa.Column("is_predicted", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("usage_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("tags", sa.JSON(), nullable=True),
        sa.Column("sample_answer", sa.Text(), nullable=True),
        sa.Column("key_points", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.Float(), nullable=False),
        sa.Column("updated_at", sa.Float(), nullable=False),
    )

    # 3. Create academic_matrices table
    op.create_table(
        "academic_matrices",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("code", sa.String(50), nullable=False, unique=True, index=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("rubric_id", sa.String(36), sa.ForeignKey("rubrics.id", ondelete="SET NULL"), nullable=True),
        sa.Column("rules", sa.JSON(), nullable=False),
        sa.Column("difficulty_ratio", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.Float(), nullable=False),
        sa.Column("updated_at", sa.Float(), nullable=False),
    )

    # 4. Create question_type_configs table
    op.create_table(
        "question_type_configs",
        sa.Column("type", sa.String(10), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("default_prep_time", sa.Integer(), nullable=False),
        sa.Column("default_response_time", sa.Integer(), nullable=False),
        sa.Column("audio_instruction_url", sa.String(500), nullable=True),
        sa.Column("max_score", sa.Float(), nullable=False, server_default="10.0"),
        sa.Column("created_at", sa.Float(), nullable=False),
        sa.Column("updated_at", sa.Float(), nullable=False),
    )


def downgrade():
    op.drop_table("question_type_configs")
    op.drop_table("academic_matrices")
    op.drop_table("academic_questions")
    op.drop_column("rubrics", "updated_at")
    op.drop_column("rubrics", "description")
