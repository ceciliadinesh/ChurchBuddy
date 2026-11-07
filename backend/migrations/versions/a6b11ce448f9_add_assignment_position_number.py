
"""add assignment position number

Revision ID: a6b11ce448f9
Revises: 2763b69dce01
Create Date: 2026-11-06 18:41:02.017517

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a6b11ce448f9'
down_revision: Union[str, Sequence[str], None] = '2763b69dce01'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add the column with a temporary default of 1.
    # Existing assignments will receive position_number = 1.
    op.add_column(
        'assignments',
        sa.Column(
            'position_number',
            sa.Integer(),
            nullable=False,
            server_default=sa.text('1')
        )
    )

    # Remove the old unique constraint.
    op.drop_constraint(
        'uq_mass_date_responsibility',
        'assignments',
        type_='unique'
    )

    # Create the new unique constraint including position_number.
    op.create_unique_constraint(
        'uq_mass_date_responsibility_position',
        'assignments',
        [
            'mass_slot_id',
            'assignment_date',
            'responsibility',
            'position_number'
        ]
    )

    # Remove the temporary default.
    op.alter_column(
        'assignments',
        'position_number',
        server_default=None
    )


def downgrade() -> None:
    op.drop_constraint(
        'uq_mass_date_responsibility_position',
        'assignments',
        type_='unique'
    )

    op.create_unique_constraint(
        'uq_mass_date_responsibility',
        'assignments',
        [
            'mass_slot_id',
            'assignment_date',
            'responsibility'
        ]
    )

    op.drop_column(
        'assignments',
        'position_number'
    )
