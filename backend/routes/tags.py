from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

# Cambia "from app.database import get_db" por la ruta real donde está tu get_db
# Si database.py está en la raíz de backend:
from database import get_session

# Si tag_service.py está en backend/services/tag_service.py:
from services import tag_service
from dependencies import require_roles  # <--- Importación actualizada

router = APIRouter(prefix="/tags", tags=["tags"])

@router.get("", response_model=list[str])
async def list_tags(
    db: AsyncSession = Depends(get_session),
    current_user: dict = Depends(require_roles(["Admin", "Editor", "Viewer"]))  # <--- RBAC
):
    """Retorna todas las etiquetas del sistema para el autocompletado del frontend."""
    return await tag_service.get_all_tags(db)