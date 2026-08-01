from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db

router = APIRouter(prefix="/search", tags=["Search"])

@router.get("", status_code=status.HTTP_200_OK)
def global_search(
    q: str = Query(..., min_length=3, description="Término de búsqueda (mínimo 3 caracteres)"),
    db: Session = Depends(get_db)
):
    """
    KAB-US-007: Búsqueda Global Full-Text Search
    Busca en: filename, raw_text, título, compositor y etiquetas.
    """
    clean_query = q.strip()
    if len(clean_query) < 3:
        return []

    # Consulta FTS usando websearch_to_tsquery (soporta frases con comillas y palabras sueltas)
    sql_query = text("""
        SELECT 
            id, 
            filename, 
            status, 
            metadata_confirmed, 
            metadata_suggested,
            custom_metadata,
            ts_rank(
                to_tsvector('spanish', 
                    coalesce(filename, '') || ' ' || 
                    coalesce(raw_text, '') || ' ' || 
                    coalesce(metadata_confirmed->>'title', '') || ' ' || 
                    coalesce(metadata_confirmed->>'composer', '')
                ), 
                websearch_to_tsquery('spanish', :query)
            ) AS rank
        FROM documents
        WHERE to_tsvector('spanish', 
            coalesce(filename, '') || ' ' || 
            coalesce(raw_text, '') || ' ' || 
            coalesce(metadata_confirmed->>'title', '') || ' ' || 
            coalesce(metadata_confirmed->>'composer', '')
        ) @@ websearch_to_tsquery('spanish', :query)
        ORDER BY rank DESC
        LIMIT 50;
    """)

    results = db.execute(sql_query, {"query": clean_query}).fetchall()

    return [
        {
            "id": str(row.id),
            "filename": row.filename,
            "status": row.status.value if hasattr(row.status, "value") else str(row.status),
            "metadata_confirmed": row.metadata_confirmed,
            "metadata_suggested": row.metadata_suggested,
            "custom_metadata": row.custom_metadata or {},
            "relevance_score": float(row.rank)
        }
        for row in results
    ]