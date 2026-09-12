import asyncio
import logging
import time
import uuid
from typing import List

import models
from database import SessionLocal
from services.ai_service import analyze_document_metadata
from services.connection_manager import connection_manager
from services.extractor import extract_text_from_first_pages

logger = logging.getLogger(__name__)

# En una aplicación distribuida, sustituir por un registro compartido como Redis.
cancellation_registry: dict[uuid.UUID, bool] = {}


def _publish(collection_id: uuid.UUID, event: str, **payload: object) -> None:
    connection_manager.broadcast_from_thread(
        collection_id,
        {"event": event, "collection_id": str(collection_id), **payload},
    )


def _process_batch_ai_sync(document_ids: List[uuid.UUID], collection_id: uuid.UUID) -> None:
    """Run the blocking extraction/AI pipeline in a worker thread."""
    total = len(document_ids)
    processed = 0
    errors = 0
    cancelled = False
    db = SessionLocal()

    logger.info("Iniciando procesamiento de %s documentos para %s.", total, collection_id)
    _publish(collection_id, "batch_started", total=total, processed=0)

    try:
        cancellation_registry[collection_id] = False

        for doc_id in document_ids:
            if cancellation_registry.get(collection_id, False):
                cancelled = True
                logger.info("Procesamiento cancelado para la colección %s.", collection_id)
                break

            time.sleep(1)
            doc = db.query(models.Document).filter(models.Document.id == doc_id).first()
            file_path = getattr(doc, "absolute_path", None) or getattr(doc, "storage_path", None)

            if not doc or not file_path:
                errors += 1
                _publish(
                    collection_id,
                    "receive_progress",
                    document_id=str(doc_id),
                    processed=processed,
                    total=total,
                    status="error",
                )
                continue

            try:
                raw_text = extract_text_from_first_pages(file_path)
                metadata = analyze_document_metadata(raw_text)
                doc.metadata_suggested = metadata
                doc.status = models.DocumentStatus.READY
                db.commit()
                processed += 1
                logger.info("Procesado documento %s", doc_id)
                _publish(
                    collection_id,
                    "receive_progress",
                    document_id=str(doc_id),
                    processed=processed,
                    total=total,
                    status="completed",
                )
            except Exception as exc:
                errors += 1
                logger.error("Error al procesar documento %s: %s", doc_id, exc)
                db.rollback()
                _publish(
                    collection_id,
                    "receive_progress",
                    document_id=str(doc_id),
                    processed=processed,
                    total=total,
                    status="error",
                    error=str(exc),
                )
    finally:
        _publish(
            collection_id,
            "batch_completed",
            total=total,
            processed=processed,
            errors=errors,
            status="cancelled" if cancelled else "completed",
        )
        cancellation_registry.pop(collection_id, None)
        db.close()
        logger.info("Procesamiento de batch finalizado.")


async def process_batch_ai(document_ids: List[uuid.UUID], collection_id: uuid.UUID) -> None:
    """Process a batch without blocking FastAPI's event loop."""
    await asyncio.to_thread(_process_batch_ai_sync, document_ids, collection_id)