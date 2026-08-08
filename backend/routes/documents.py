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
from dependencies import require_roles  # <--- Dependencia de RBAC

router = APIRouter(
    prefix="/documents",
    tags=["Documents"]
)

STORAGE_DIR = "uploads"
os.makedirs(STORAGE_DIR, exist_ok=True)


class FilterPayloadSchema(BaseModel):
    query: Optional[str] = None
    search: Optional[str] = None
    collection_id: Optional[str] = None
    collection_ids: Optional[List[str]] = None
    composers: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    custom_filters: Optional[Dict[str, str]] = None
    custom_fields: Optional[Dict[str, str]] = None  # <-- Añadido aquí
    page: int = 1
    limit: int = 20


def process_pdf_in_background(document_id: str, file_path: str):
    db = SessionLocal()
    try:
        doc = db.query(models.Document).filter(models.Document.id == document_id).first()
        if not doc:
            print(f"❌ [Background] No se encontró el documento ID: {document_id}")
            return

        print(f"⏳ [Background] Procesando PDF {document_id}...")

        # 1. Extraer texto
        extracted_text = extract_text_from_first_pages(file_path, max_pages=3)
        
        if not extracted_text or not extracted_text.strip():
            raise ValueError("No se pudo extraer texto del PDF (archivo corrupto o sin OCR).")

        doc.raw_text = extracted_text

        # 2. IA para metadatos
        try:
            suggested = analyze_document_metadata(extracted_text)
            doc.metadata_suggested = suggested
        except Exception as ai_err:
            print(f"⚠️ [Background] Falló la IA pero continuamos: {ai_err}")
            doc.metadata_suggested = {}

        # 3. Cambiar estado y confirmar guardado
        doc.status = models.DocumentStatus.PENDING_REVIEW
        db.commit()
        print(f"✅ [Background] Documento {document_id} guardado con éxito como PENDING_REVIEW")

    except Exception as e:
        db.rollback()
        print(f"🚨 [Background] Error crítico: {e}")
        try:
            doc = db.query(models.Document).filter(models.Document.id == document_id).first()
            if doc:
                doc.status = models.DocumentStatus.ERROR
                doc.error_message = str(e)
                db.commit()
        except Exception as rollback_err:
            print(f"🚨 [Background] Error al guardar el mensaje de error: {rollback_err}")
    finally:
        db.close()


@router.post("/upload-pdf", status_code=status.HTTP_201_CREATED)
async def upload_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles(["Admin", "Editor"]))
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
def list_documents(
    page: int = 1,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles(["Admin", "Editor", "Viewer"]))
):
    offset = (page - 1) * limit
    
    query = db.query(models.Document)
    total_docs = query.count()
    docs = query.offset(offset).limit(limit).all()
    
    items = [
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
    
    return {
        "data": items,
        "total": total_docs
    }


@router.post("/filter", status_code=status.HTTP_200_OK)
def filter_documents(
    payload: FilterPayloadSchema, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles(["Admin", "Editor", "Viewer"]))
):
    query = db.query(models.Document).filter(models.Document.status != "PENDING_REVIEW")

    # 1. Filtrado por Colección (soportando tanto collection_id como collection_ids)
    col_id = payload.collection_id
    col_ids = getattr(payload, 'collection_ids', None) or (
        [payload.collection_id] if getattr(payload, 'collection_id', None) else []
    )
    if col_id and col_id not in col_ids:
        col_ids.append(col_id)

    if col_ids:
        # Buscamos documentos que pertenezcan a cualquiera de las colecciones indicadas mediante la tabla intermedia
        query = query.join(models.Document.collections).filter(models.Collection.id.in_(col_ids))

    # 2. Filtrado de texto global (query o search)
    search_text = getattr(payload, 'search', None) or getattr(payload, 'query', None)
    if search_text and search_text.strip():
        q_lower = f"%{search_text.lower().strip()}%"
        query = query.filter(
            (models.Document.filename.ilike(q_lower)) |
            (models.Document.raw_text.ilike(q_lower)) |
            (models.Document.metadata_confirmed['title'].as_string().ilike(q_lower)) |
            (models.Document.metadata_suggested['title'].as_string().ilike(q_lower)) |
            (models.Document.metadata_confirmed['composer'].as_string().ilike(q_lower)) |
            (models.Document.metadata_suggested['composer'].as_string().ilike(q_lower))
        )

    # 3. Filtrado por Compositores
    if payload.composers and len(payload.composers) > 0:
        composer_filters = []
        for comp in payload.composers:
            composer_filters.append(models.Document.metadata_confirmed['composer'].as_string() == comp)
            composer_filters.append(models.Document.metadata_suggested['composer'].as_string() == comp)
        from sqlalchemy import or_
        query = query.filter(or_(*composer_filters))

    # 4. Filtrado por Etiquetas (Tags)
    if payload.tags and len(payload.tags) > 0:
        for tag_name in payload.tags:
            query = query.join(models.Document.tags).filter(models.Tag.name.ilike(tag_name))

    # 5. Filtrado por Campos Personalizados (custom_filters o custom_fields)
    custom_f = getattr(payload, 'custom_fields', None) or getattr(payload, 'custom_filters', {})
    if custom_f:
        for field_key, expected_val in custom_f.items():
            if expected_val is not None and str(expected_val).strip() != "":
                # Comparamos dentro del campo JSONB custom_metadata de PostgreSQL
                query = query.filter(models.Document.custom_metadata[field_key].as_string() == str(expected_val))

    # Obtener el total exacto de resultados antes de paginar
    total_results = query.count()

    # 6. Paginación en servidor con offset y limit
    page = payload.page if payload.page and payload.page > 0 else 1
    limit = payload.limit if payload.limit and payload.limit > 0 else 20
    offset = (page - 1) * limit

    paginated_docs = query.offset(offset).limit(limit).all()

    formatted_results = [
        {
            "id": str(doc.id),
            "filename": doc.filename,
            "status": doc.status.value if hasattr(doc.status, "value") else str(doc.status),
            "metadata_confirmed": doc.metadata_confirmed,
            "metadata_suggested": doc.metadata_suggested,
            "custom_metadata": doc.custom_metadata or {}
        }
        for doc in paginated_docs
    ]

    return {
        "data": formatted_results,
        "total": total_results
    }


@router.get("/{document_id}/status", status_code=status.HTTP_200_OK)
def get_document_status(
    document_id: str, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles(["Admin", "Editor", "Viewer"]))
):
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
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles(["Admin", "Editor"]))
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
        "id": str(doc.id),
        "filename": doc.filename,
        "status": doc.status.value if hasattr(doc.status, "value") else str(doc.status),
        "metadata_confirmed": doc.metadata_confirmed,
        "metadata_suggested": doc.metadata_suggested,
        "custom_metadata": doc.custom_metadata or {}
    }


@router.get("/{document_id}/file", status_code=status.HTTP_200_OK)
def get_document_file(
    document_id: str, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles(["Admin", "Editor", "Viewer"]))
):
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


# ⬇️ NUEVO ENDPOINT DE DESCARGA DIRECTA (Acepta Admin, Editor y Viewer)
# ⬇️ ENDPOINT DE DESCARGA
# En documents.py (Backend)
@router.get("/{document_id}/download", status_code=status.HTTP_200_OK)
def download_document_file(
    document_id: str, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles(["Admin", "Editor", "Viewer"]))
):
    doc = db.query(models.Document).filter(models.Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")

    normalized_path = os.path.normpath(doc.storage_path)

    if not os.path.exists(normalized_path):
        raise HTTPException(status_code=404, detail="El archivo físico no se encuentra en el servidor")

    filename_to_download = doc.filename
    if doc.metadata_confirmed and doc.metadata_confirmed.get("title"):
        title = doc.metadata_confirmed.get("title")
        filename_to_download = f"{title}.pdf" if not title.lower().endswith(".pdf") else title

    return FileResponse(
        path=normalized_path,
        media_type="application/pdf",
        filename=filename_to_download,
        headers={
            # ⬇️ ESTA CABECERA ES LA CLAVE PARA EVITAR NUBES/PESTAÑAS EN EL NAVEGADOR
            "Content-Disposition": f'attachment; filename="{filename_to_download}"'
        }
    )


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: str, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles(["Admin"]))
):
    doc = db.query(models.Document).filter(models.Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    
    if doc.storage_path and os.path.exists(doc.storage_path):
        try:
            os.remove(doc.storage_path)
        except Exception as e:
            print(f"Error borrando archivo del disco: {e}")

    db.delete(doc)
    db.commit()
    return None