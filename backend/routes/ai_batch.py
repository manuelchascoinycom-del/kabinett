import time
import uuid
from typing import List
from sqlalchemy.orm import Session
from fastapi import BackgroundTasks, Depends, HTTPException, status, APIRouter
import models
from database import get_db
from dependencies import require_roles
from services.document_service import get_unprocessed_document_ids
from services.extractor import extract_text_from_first_pages
from services.ai_service import analyze_document_metadata
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/collections", tags=["Collections"])

def background_generate_batch_ai(document_ids: List[uuid.UUID]):
    """
    Worker en segundo plano para procesar documentos: OCR -> AI -> DB
    """
    logger.info(f"Iniciando procesamiento de {len(document_ids)} documentos.")
    
    from database import SessionLocal
    db = SessionLocal()
    
    try:
        for doc_id in document_ids:
            time.sleep(1)
            doc = db.query(models.Document).filter(models.Document.id == doc_id).first()
            
            file_path = getattr(doc, 'absolute_path', None) or getattr(doc, 'storage_path', None)
            if not doc or not file_path:
                continue
            
            try:
                # 1. Extraer texto
                raw_text = extract_text_from_first_pages(file_path)
                
                # 2. Analizar con AI
                metadata = analyze_document_metadata(raw_text)
                
                # 3. Guardar en BD
                doc.metadata_suggested = metadata
                doc.status = models.DocumentStatus.READY
                db.commit()
                logger.info(f"Procesado documento {doc_id}")
                
            except Exception as e:
                logger.error(f"Error al procesar documento {doc_id}: {e}")
                db.rollback()
                continue
    finally:
        db.close()
        logger.info("Procesamiento de batch finalizado.")

@router.post("/{collection_id}/generate-batch-ai", status_code=status.HTTP_202_ACCEPTED)
async def generate_batch_ai(
    collection_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles(["Admin", "Editor"]))
):
    collection = db.query(models.Collection).filter(models.Collection.id == collection_id).first()
    if not collection:
        raise HTTPException(status_code=404, detail="Colección no encontrada")
    
    doc_ids = get_unprocessed_document_ids(db, collection_id)
    
    if not doc_ids:
        return {"message": "No hay documentos pendientes de procesar en esta colección", "queued": 0}
    
    background_tasks.add_task(background_generate_batch_ai, doc_ids)

    return {"message": "Procesamiento de documentos en lote iniciado", "queued": len(doc_ids)}

@router.get("/{collection_id}/batch-status")
def get_batch_status(
    collection_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles(["Admin", "Editor", "Viewer"]))
):
    db.expire_all()
    db.rollback()

    collection = db.query(models.Collection).filter(models.Collection.id == collection_id).first()
    if not collection:
        raise HTTPException(status_code=404, detail="Colección no encontrada")
    
    # 1. Total de documentos en la colección
    total = db.query(models.Document).join(
        models.document_collections
    ).filter(
        models.document_collections.c.collection_id == collection_id
    ).count()
    
    # 2. Documentos REALMENTE procesados por IA (metadata_suggested NO es NULL)
    ready = db.query(models.Document).join(
        models.document_collections
    ).filter(
        models.document_collections.c.collection_id == collection_id,
        models.Document.metadata_suggested.isnot(None)
    ).count()
    
    # 3. Documentos con error (si aplica en tu lógica de errores)
    error_count = db.query(models.Document).join(
        models.document_collections
    ).filter(
        models.document_collections.c.collection_id == collection_id,
        models.Document.status == models.DocumentStatus.ERROR
    ).count()

    processed = ready + error_count
    
    # Sigue procesándose si aún quedan documentos por rellenar su metadata
    is_processing = total > 0 and processed < total

    return {
        "total": total,
        "ready": ready,
        "processed": processed,
        "is_processing": is_processing
    }
    
   