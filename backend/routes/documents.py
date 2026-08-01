import os
import uuid
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, File, HTTPException, UploadFile, Depends, BackgroundTasks, status
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db, SessionLocal
import models
from schemas.document import ConfirmMetadataSchema
from services.extractor import extract_text_from_first_pages
from services.ai_service import analyze_document_metadata

router = APIRouter(prefix="/documents", tags=["Documents"])

STORAGE_DIR = "uploads"
os.makedirs(STORAGE_DIR, exist_ok=True)


class FilterPayloadSchema(BaseModel):
    query: Optional[str] = ""
    collection_id: Optional[str] = None
    composers: Optional[List[str]] = []
    tags: Optional[List[str]] = []
    custom_filters: Optional[Dict[str, Any]] = {}


def process_pdf_in_background(document_id: str, file_path: str):
    db: Session = SessionLocal()
    try:
        doc = db.query(models.Document).filter(models.Document.id == document_id).first()
        if not doc:
            return

        extracted_text = extract_text_from_first_pages(file_path, max_pages=3)
        doc.raw_text = extracted_text

        try:
            suggested = analyze_document_metadata(extracted_text)
            doc.metadata_suggested = suggested
        except Exception as ai_err:
            print(f"⚠️ Error al sugerir metadatos: {ai_err}")

        doc.status = models.DocumentStatus.PENDING_REVIEW
        db.commit()
    except Exception as e:
        db.rollback()
        doc = db.query(models.Document).filter(models.Document.id == document_id).first()
        if doc:
            doc.status = models.DocumentStatus.ERROR
            db.commit()
    finally:
        db.close()


@router.post("/upload-pdf", status_code=status.HTTP_201_CREATED)
async def upload_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Formato no soportado")

    try:
        content = await file.read()
        unique_filename = f"{uuid.uuid4()}_{file.filename}"
        saved_file_path = os.path.normpath(os.path.join(STORAGE_DIR, unique_filename))

        with open(saved_file_path, "wb") as buffer:
            buffer.write(content)

        new_document = models.Document(
            filename=file.filename,
            storage_path=saved_file_path,
            file_size=len(content),
            status=models.DocumentStatus.PROCESSING
        )
        db.add(new_document)
        db.commit()
        db.refresh(new_document)

        background_tasks.add_task(process_pdf_in_background, str(new_document.id), saved_file_path)

        return {
            "id": str(new_document.id),
            "filename": new_document.filename,
            "status": "processing",
            "message": "Archivo recibido. Procesando..."
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("", status_code=status.HTTP_200_OK)
def list_documents(db: Session = Depends(get_db)):
    docs = db.query(models.Document).all()
    return [
        {
            "id": str(doc.id),
            "filename": doc.filename,
            "status": doc.status.value if hasattr(doc.status, "value") else str(doc.status),
            "metadata_confirmed": doc.metadata_confirmed,
            "metadata_suggested": doc.metadata_suggested,
            "custom_metadata": doc.custom_metadata or {}
        }
        for doc in docs
    ]


@router.post("/filter", status_code=status.HTTP_200_OK)
def filter_documents(payload: FilterPayloadSchema, db: Session = Depends(get_db)):
    query = db.query(models.Document).filter(models.Document.status != "PENDING_REVIEW")

    if payload.collection_id:
        collection = db.query(models.Collection).filter(models.Collection.id == payload.collection_id).first()
        if collection:
            doc_ids = [doc.id for doc in collection.documents]
            query = query.filter(models.Document.id.in_(doc_ids))
        else:
            return []

    docs = query.all()
    filtered_results = []
    q_lower = payload.query.lower().strip() if payload.query else ""

    for doc in docs:
        meta = doc.metadata_confirmed or doc.metadata_suggested or {}
        title = (meta.get("title") or "").lower()
        composer = (meta.get("composer") or "").lower()
        doc_tags = [t.lower() for t in (meta.get("tags") or [])]
        filename = (doc.filename or "").lower()
        raw_text = (doc.raw_text or "").lower()

        if q_lower:
            text_match = (
                q_lower in title or
                q_lower in composer or
                q_lower in filename or
                q_lower in raw_text or
                any(q_lower in tag for tag in doc_tags)
            )
            if not text_match:
                continue

        if payload.composers and len(payload.composers) > 0:
            doc_composer = meta.get("composer") or ""
            if doc_composer not in payload.composers:
                continue

        if payload.tags and len(payload.tags) > 0:
            if not set(payload.tags).issubset(set(meta.get("tags") or [])):
                continue

        if payload.custom_filters:
            doc_custom = doc.custom_metadata or {}
            custom_match = True
            for field_key, expected_val in payload.custom_filters.items():
                if expected_val:
                    actual_val = doc_custom.get(field_key)
                    if str(actual_val).lower().strip() != str(expected_val).lower().strip():
                        custom_match = False
                        break
            if not custom_match:
                continue

        filtered_results.append({
            "id": str(doc.id),
            "filename": doc.filename,
            "status": doc.status.value if hasattr(doc.status, "value") else str(doc.status),
            "metadata_confirmed": doc.metadata_confirmed,
            "metadata_suggested": doc.metadata_suggested,
            "custom_metadata": doc.custom_metadata or {}
        })

    return filtered_results


@router.get("/{document_id}/status", status_code=status.HTTP_200_OK)
def get_document_status(document_id: str, db: Session = Depends(get_db)):
    doc = db.query(models.Document).filter(models.Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    
    status_val = doc.status.value if hasattr(doc.status, "value") else str(doc.status)

    return {
        "id": str(doc.id),
        "status": status_val,
        "metadata_suggested": doc.metadata_suggested,
        "metadata_confirmed": doc.metadata_confirmed,
        "custom_metadata": doc.custom_metadata or {}
    }


@router.post("/{document_id}/confirm-metadata", status_code=status.HTTP_200_OK)
def confirm_metadata(
    document_id: str, 
    payload: ConfirmMetadataSchema, 
    db: Session = Depends(get_db)
):
    doc = db.query(models.Document).filter(models.Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")

    payload_dict = payload.model_dump()
    doc.metadata_confirmed = payload_dict
    doc.custom_metadata = payload_dict.get("custom_metadata", {})
    doc.status = models.DocumentStatus.READY

    tag_names = payload.tags if hasattr(payload, 'tags') and payload.tags else []
    doc.tags.clear()

    for name in tag_names:
        clean_name = name.strip()
        if not clean_name:
            continue

        tag = db.query(models.Tag).filter(models.Tag.name.ilike(clean_name)).first()
        if not tag:
            tag = models.Tag(name=clean_name)
            db.add(tag)
            db.flush()

        if tag not in doc.tags:
            doc.tags.append(tag)

    db.commit()
    db.refresh(doc)

    return {
        "message": "Metadatos confirmados con éxito", 
        "metadata": doc.metadata_confirmed,
        "custom_metadata": doc.custom_metadata
    }


@router.get("/{document_id}/file", status_code=status.HTTP_200_OK)
def get_document_file(document_id: str, db: Session = Depends(get_db)):
    doc = db.query(models.Document).filter(models.Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")

    normalized_path = os.path.normpath(doc.storage_path)

    if not os.path.exists(normalized_path):
        raise HTTPException(status_code=404, detail="El archivo físico no se encuentra en el servidor")

    return FileResponse(
        path=normalized_path,
        media_type="application/pdf",
        filename=doc.filename,
        headers={
            "Accept-Ranges": "bytes",
            "Cache-Control": "public, max-age=3600",
        }
    )