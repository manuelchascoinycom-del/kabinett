import time
import uuid
from typing import List
from sqlalchemy import and_
from sqlalchemy.orm import Session
from fastapi import BackgroundTasks, Depends, HTTPException, status, APIRouter
import models
from database import get_db
from dependencies import require_roles
from services.document_service import get_unprocessed_document_ids, get_collection_ids_recursive
from services.extractor import extract_text_from_first_pages
from services.ai_service import analyze_document_metadata
import logging
# Diccionario para gestionar estados de cancelación
# En una aplicación distribuida, usar Redis.
cancellation_registry = {}


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/collections", tags=["Collections"])

def background_generate_batch_ai(document_ids: List[uuid.UUID], collection_id: uuid.UUID):
    """
    Worker en segundo plano para procesar documentos: OCR -> AI -> DB
    """
    logger.info(f"Iniciando procesamiento de {len(document_ids)} documentos para {collection_id}.")
    
    from database import SessionLocal
    db = SessionLocal()
    
    try:
        cancellation_registry[collection_id] = False
        
        for doc_id in document_ids:
            # Comprobar cancelación
            if cancellation_registry.get(collection_id, False):
                logger.info(f"Procesamiento cancelado para la colección {collection_id}.")
                break
                
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
        if collection_id in cancellation_registry:
            del cancellation_registry[collection_id]
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
    
    background_tasks.add_task(background_generate_batch_ai, doc_ids, collection_id)

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
    
    # 1. Obtener lista recursiva de colecciones (Padre + Hijas)
    collection_ids = get_collection_ids_recursive(db, collection_id)
    
    # 2. TOTAL RECURSIVO (Aquí estaba el fallo: debe usar .in_(collection_ids) en vez de == collection_id)
    total = db.query(models.Document.id).join(
        models.document_collections
    ).filter(
        models.document_collections.c.collection_id.in_(collection_ids)
    ).distinct().count()
    
    # 3. Documentos procesados por IA (ready)
    ready = db.query(models.Document.id).join(
        models.document_collections
    ).filter(
        models.document_collections.c.collection_id.in_(collection_ids),
        models.Document.metadata_suggested.isnot(None)
    ).distinct().count()
    
    # 4. Documentos con error
    error_count = db.query(models.Document.id).join(
        models.document_collections
    ).filter(
        models.document_collections.c.collection_id.in_(collection_ids),
        models.Document.status == models.DocumentStatus.ERROR
    ).distinct().count()

    processed = ready + error_count
    
    # Sigue procesándose si aún quedan documentos por rellenar su metadata respecto al total real de la jerarquía
    is_processing = total > 0 and processed < total

    return {
        "total": total,        # <--- Ahora devolverá 11 (la suma del padre y sus subcolecciones)
        "ready": ready,
        "processed": processed,
        "is_processing": is_processing
    }

@router.post("/{collection_id}/batch-cancel", status_code=status.HTTP_200_OK)
async def cancel_batch_ai(
    collection_id: uuid.UUID,
    current_user: dict = Depends(require_roles(["Admin", "Editor"]))
):
    """
    Cancela un proceso batch en curso para la colección especificada.
    """
    if collection_id in cancellation_registry:
        cancellation_registry[collection_id] = True
        return {"message": "Solicitud de cancelación recibida"}
    
    return {"message": "No hay proceso batch activo para cancelar en esta colección"}