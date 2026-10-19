"""Add teacher_id to schedule_slots

Revision ID: 0009
Revises: 0008
"""
from alembic import op
import sqlalchemy as sa

revision = "0009"
down_revision = "0008"
branch_labels = None
depends_on = None

naming_convention = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


def upgrade():
    with op.batch_alter_table("schedule_slots", naming_convention=naming_convention) as batch:
        batch.add_column(
            sa.Column(
                "teacher_id",
                sa.String(36),
                sa.ForeignKey("users.id", name="fk_schedule_slots_teacher_id"),
                nullable=True,
            )
        )


def downgrade():
    with op.batch_alter_table("schedule_slots", naming_convention=naming_convention) as batch:
        batch.drop_column("teacher_id")
