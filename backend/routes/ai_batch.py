import uuid
from typing import List
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import BackgroundTasks, Depends, HTTPException, status, APIRouter
import models
from database import get_session
from dependencies import require_roles
from services.document_service import get_unprocessed_document_ids, get_collection_ids_recursive
from services.batch_ai_processor import cancellation_registry, process_batch_ai

router = APIRouter(prefix="/collections", tags=["Collections"])

@router.post("/{collection_id}/generate-batch-ai", status_code=status.HTTP_202_ACCEPTED)
async def generate_batch_ai(
    collection_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_session),
    current_user: dict = Depends(require_roles(["Admin", "Editor"]))
):
    collection = await db.scalar(select(models.Collection).where(models.Collection.id == collection_id))
    if not collection:
        raise HTTPException(status_code=404, detail="Colección no encontrada")
    
    doc_ids = await get_unprocessed_document_ids(db, collection_id)
    
    if not doc_ids:
        return {"message": "No hay documentos pendientes de procesar en esta colección", "queued": 0}
    
    background_tasks.add_task(process_batch_ai, doc_ids, collection_id)

    return {"message": "Procesamiento de documentos en lote iniciado", "queued": len(doc_ids)}

@router.get("/{collection_id}/batch-status")
async def get_batch_status(
    collection_id: uuid.UUID,
    db: AsyncSession = Depends(get_session),
    current_user: dict = Depends(require_roles(["Admin", "Editor", "Viewer"]))
):

    await db.rollback()

    collection = await db.scalar(select(models.Collection).where(models.Collection.id == collection_id))
    if not collection:
        raise HTTPException(status_code=404, detail="Colección no encontrada")
    
    # 1. Obtener lista recursiva de colecciones (Padre + Hijas)
    collection_ids = await get_collection_ids_recursive(db, collection_id)
    
    # 2. TOTAL RECURSIVO (Aquí estaba el fallo: debe usar .in_(collection_ids) en vez de == collection_id)
    total = await db.scalar(select(func.count(models.Document.id.distinct())).join(
        models.document_collections
    ).where(
        models.document_collections.c.collection_id.in_(collection_ids)
    ))
    
    # 3. Documentos procesados por IA (ready)
    ready = await db.scalar(select(func.count(models.Document.id.distinct())).join(
        models.document_collections
    ).where(
        models.document_collections.c.collection_id.in_(collection_ids),
        models.Document.metadata_suggested.isnot(None)
    ))
    
    # 4. Documentos con error
    error_count = await db.scalar(select(func.count(models.Document.id.distinct())).join(
        models.document_collections
    ).where(
        models.document_collections.c.collection_id.in_(collection_ids),
        models.Document.status == models.DocumentStatus.ERROR
    ))

    processed = ready + error_count
    
    # Sigue procesándose si aún quedan documentos por rellenar su metadata respecto al total real de la jerarquía
    is_processing = total > 0 and processed < total

    return {
        "total": total,        # <--- Ahora devolverá 11 (la suma del padre y sus subcolecciones)
        "ready": ready,
        "processed": processed,
        "is_processing": is_processing,
        "is_batch_active": collection_id in cancellation_registry,
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