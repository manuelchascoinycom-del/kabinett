"""add external storage fields for in-place indexing

Revision ID: add_external_storage_fields
Revises: <colocar_id_de_la_revision_anterior>
Create Date: 2026-08-09 13:45:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_external_storage_fields'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Añadir columnas para soporte de archivos externos / in-place
    op.add_column('documents', sa.Column('storage_type', sa.String(), nullable=False, server_default='upload'))
    op.add_column('documents', sa.Column('absolute_path', sa.String(), nullable=True))
    op.add_column('documents', sa.Column('relative_path', sa.String(), nullable=True))


def downgrade() -> None:
    # Revertir cambios en caso de rollback
    op.drop_column('documents', 'relative_path')
    op.drop_column('documents', 'absolute_path')
    op.drop_column('documents', 'storage_type')