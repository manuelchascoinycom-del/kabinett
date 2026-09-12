from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from models import Tag  # Import directo desde models.py en la raíz del backend

async def get_all_tags(db: AsyncSession) -> list[str]:
    """Obtiene una lista con todos los nombres de etiquetas existentes."""
    result = await db.scalars(select(Tag.name).distinct())
    return list(result.all())