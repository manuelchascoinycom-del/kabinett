import os
import uuid
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, File, HTTPException, UploadFile, Depends, BackgroundTasks, status
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from utils.pdf_utils import force_normalize_pdf
from database import get_db, SessionLocal
import models
from schemas.document import ConfirmMetadataSchema, DocumentExternalCreate, DocumentResponse, ScanRequest, IngestStatusResponse, SyncRequest
from services.document_service import register_external_document, scan_directory_dry_run, process_bulk_ingestion, sync_directory_service
from services.task_tracker import task_tracker
from services.extractor import extract_text_from_first_pages
from services.ai_service import analyze_document_metadata
from dependencies import require_roles  # <--- Dependencia de RBAC

import fitz  # PyMuPDF

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
    sort_by: Optional[str] = "created_at"
    order: Optional[str] = "desc"



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


@router.post("/index-external", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
def index_external_document(
    payload: DocumentExternalCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles(["Admin", "Editor"]))
):
    """
    Indexa un documento PDF externo de manera 'in-place' (sin copiar el archivo).
    """
    new_doc = register_external_document(
        db=db,
        payload=payload,
        background_tasks=background_tasks
    )
    return new_doc


@router.post("/scan-dry-run", status_code=status.HTTP_200_OK)
def scan_dry_run_endpoint(
    payload: ScanRequest,
    current_user: dict = Depends(require_roles(["Admin", "Editor"]))
):
    """
    Escanea un directorio de forma recursiva (Dry-Run) sin realizar cambios en la base de datos.
    Valida la existencia del directorio y retorna la estructura en árbol.
    """
    try:
        result = scan_directory_dry_run(payload.path)
        return result
    except HTTPException as e:
        raise e
    except FileNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except (ValueError, PermissionError) as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error interno del servidor durante el escaneo: {str(e)}"
        )


@router.get("", status_code=status.HTTP_200_OK)
def list_documents(
    page: int = 1,
    limit: int = 20,
    sort_by: Optional[str] = "created_at",
    order: Optional[str] = "desc",
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles(["Admin", "Editor", "Viewer"]))
):
    offset = (page - 1) * limit
    
    query = db.query(models.Document)
    # Ordenamiento dinámico
    sort_column = getattr(models.Document, sort_by, None)
    if sort_column is not None:
        if order == "desc":
            query = query.order_by(sort_column.desc())
        else:
            query = query.order_by(sort_column.asc())

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

    # 5.5. Ordenación
    sort_field = getattr(models.Document, payload.sort_by, models.Document.created_at)
    if payload.order == "desc":
        query = query.order_by(sort_field.desc())
    else:
        query = query.order_by(sort_field.asc())

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
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
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

@router.post("/bulk-ingest", status_code=status.HTTP_200_OK)
def bulk_ingest_documents(
    payload: ScanRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(require_roles(["Admin", "Editor"]))
):
    """
    Inicia el proceso de ingesta masiva de documentos de forma asíncrona a partir de un directorio.
    """
    try:
        task_id = str(uuid.uuid4())
        
        # 1. Registrar la tarea inmediatamente
        task_tracker.create_task(task_id, total_items=0, status="in_progress")

        # 2. Función envolvente segura con manejo de excepciones globales y logs
        def background_wrapper(path: str, tid: str):
            db = SessionLocal()
            try:
                print(f"🚀 [Background] Hilo iniciado para la ruta: {path}")
                process_bulk_ingestion(root_path=path, db=db, batch_size=50, task_id=tid)
                print(f"✅ [Background] Hilo completado con éxito para la tarea: {tid}")
            except Exception as e:
                print(f"🚨 [Background] EXCEPCIÓN NO CONTROLADA en la tarea {tid}: {str(e)}")
                task_tracker.update_task(
                    tid,
                    status="failed",
                    errors=[f"Error crítico de ejecución: {str(e)}"]
                )
            finally:
                db.close()

        # 3. Lanzar la tarea en segundo plano
        background_tasks.add_task(background_wrapper, payload.path, task_id)

        return {
            "task_id": task_id,
            "message": "Ingesta masiva iniciada correctamente."
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al iniciar la ingesta masiva: {str(e)}"
        )
    
@router.get("/ingest-status/{task_id}", response_model=IngestStatusResponse, status_code=status.HTTP_200_OK)
def get_ingest_status(
    task_id: str,
    current_user: dict = Depends(require_roles(["Admin", "Editor", "Viewer"]))
):
    """
    Obtiene el estado actual del progreso de una tarea de ingesta asíncrona.
    Si la tarea no se encuentra (por un reinicio del servidor), devuelve un estado seguro.
    """
    task = task_tracker.get_task(task_id)
    if not task:
        # Evita que el frontend colapse por un 404 si el servidor se reinició en caliente
        return {
            "status": "completed",
            "total_items": 0,
            "processed_items": 0,
            "percentage": 100.0,
            "errors": ["La tarea ya no está activa en memoria (es posible que el servidor se haya reiniciado)."]
        }
    return task


@router.post("/sync", status_code=status.HTTP_200_OK)
def sync_directory_endpoint(
    payload: SyncRequest,
    current_user: dict = Depends(require_roles(["Admin", "Editor"]))
):
    """
    Sincroniza el directorio físico con la base de datos de manera recursiva.
    Acepta folder_path o collection_id.
    """
    db = SessionLocal()
    try:
        path_to_sync = None
        if payload.folder_path:
            path_to_sync = payload.folder_path
        elif payload.collection_id:
            try:
                col_uuid = uuid.UUID(payload.collection_id)
            except ValueError:
                raise HTTPException(status_code=400, detail="ID de colección inválido")
                
            collection = db.query(models.Collection).filter(models.Collection.id == col_uuid).first()
            if not collection:
                raise HTTPException(status_code=404, detail="Colección no encontrada")
            
            # Intentar obtener la ruta desde la descripción
            if collection.description and "Colección creada automáticamente para la ruta: " in collection.description:
                path_to_sync = collection.description.split("Colección creada automáticamente para la ruta: ")[1].strip()
            
            # Si no, buscar un documento externo en esta colección para derivar la ruta
            if not path_to_sync:
                doc = db.query(models.Document).join(models.Document.collections).filter(
                    models.Collection.id == col_uuid,
                    models.Document.storage_type == models.DocumentStorageType.EXTERNAL,
                    models.Document.absolute_path.isnot(None)
                ).first()
                if doc and doc.absolute_path:
                    from pathlib import Path
                    path_to_sync = str(Path(doc.absolute_path).parent)
                    
            if not path_to_sync:
                raise HTTPException(
                    status_code=400, 
                    detail="No se pudo determinar la ruta física para la colección especificada"
                )
        else:
            raise HTTPException(status_code=400, detail="Debe proporcionar 'folder_path' o 'collection_id'")

        result = sync_directory_service(path_to_sync, db)
        return result
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error interno durante la sincronización: {str(e)}"
        )
    finally:
        db.close()

@router.post("/{item_id}/generate-metadata", response_model=DocumentResponse, status_code=status.HTTP_200_OK)
def generate_metadata_manually(
    item_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles(["Admin", "Editor"]))
):
    """
    Genera metadatos manualmente para un documento existente usando IA.
    """
    # 1. Buscar el documento
    doc = db.query(models.Document).filter(models.Document.id == item_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")

    # 2. Recuperar texto OCR (asegurarse de que existe)
    if not doc.raw_text:
        # Intentar extraer nuevamente si no tiene texto (opcional: reutilizar lógica de extracción)
        if doc.absolute_path and os.path.exists(doc.absolute_path):
            doc.raw_text = extract_text_from_first_pages(doc.absolute_path, max_pages=3)
            db.commit()
            db.refresh(doc)
            if not doc.raw_text:
                raise HTTPException(status_code=400, detail="El documento no tiene texto OCR extraíble.")
        else:
            raise HTTPException(status_code=400, detail="El documento no tiene texto OCR y no se encontró el archivo original.")

    # 3. Invocar IA
    try:
        suggested_metadata = analyze_document_metadata(doc.raw_text)
        doc.metadata_suggested = suggested_metadata
        db.commit()
        db.refresh(doc)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al generar metadatos: {str(e)}")

    return doc

@router.post("/{doc_id}/normalize-manual", status_code=status.HTTP_200_OK)
async def normalize_document_manually(
    doc_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles(["Admin", "Editor"]))
):
    """
    Endpoint bajo demanda para reparar/normalizar un PDF que no se muestra bien en el visor.
    """
    # 1. Buscar el documento en la base de datos
    document = db.query(models.Document).filter(models.Document.id == doc_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Documento no encontrado.")
        
    if not os.path.exists(document.storage_path):
        raise HTTPException(status_code=404, detail="El archivo físico asociado no existe en el servidor.")

    try:
        print(f"🛠️ Iniciando normalización manual para el documento: {document.filename}")
        
        # 2. Ejecutar la normalización forzada sobre el archivo existente
        success = force_normalize_pdf(document.storage_path)
        if not success:
            raise HTTPException(status_code=500, detail="Fallo interno al procesar y reconstruir el PDF.")

        # 3. Actualizar metadatos en la base de datos (nuevo tamaño y estado a READY)
        document.file_size = os.path.getsize(document.storage_path)
        document.status = models.DocumentStatus.READY
        db.commit()
        db.refresh(document)

        return {
            "id": str(document.id),
            "filename": document.filename,
            "status": document.status,
            "new_file_size": document.file_size,
            "message": "Documento normalizado correctamente bajo demanda y marcado como listo."
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error en la normalización: {str(e)}")