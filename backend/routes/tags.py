from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

# Cambia "from app.database import get_db" por la ruta real donde está tu get_db
# Si database.py está en la raíz de backend:
from database import get_db

# Si tag_service.py está en backend/services/tag_service.py:
from services import tag_service
from dependencies import get_current_user

router = APIRouter(prefix="/tags", tags=["tags"])

@router.get("", response_model=list[str])
def list_tags(db: Session = Depends(get_db)):
    """Retorna todas las etiquetas del sistema para el autocompletado del frontend."""
    return tag_service.get_all_tags(db)
