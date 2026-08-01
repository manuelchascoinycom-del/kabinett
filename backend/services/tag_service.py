from sqlalchemy.orm import Session
from models import Tag  # Import directo desde models.py en la raíz del backend

def get_all_tags(db: Session) -> list[str]:
    """Obtiene una lista con todos los nombres de etiquetas existentes."""
    tags = db.query(Tag.name).distinct().all()
    return [t[0] for t in tags]