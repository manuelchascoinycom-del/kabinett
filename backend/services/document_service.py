import os
import logging
from pathlib import Path
from typing import Union, Dict, Any, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status, BackgroundTasks
import models
from schemas.document import DocumentExternalCreate
from services.task_tracker import task_tracker

logger = logging.getLogger(__name__)

def register_external_document(
    db: Session,
    payload: DocumentExternalCreate,
    background_tasks: BackgroundTasks = None
) -> models.Document:
    """
    Registra un documento externo en la base de datos sin mover ni copiar ningún archivo binario.
    Valida la existencia física del archivo en el servidor y controla duplicados.
    """
    # 1. Validar existencia física y legibilidad
    abs_path = os.path.normpath(payload.absolute_path)
    if not os.path.exists(abs_path) or not os.path.isfile(abs_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"El archivo físico no se encuentra en la ruta especificada: {payload.absolute_path}"
        )
    if not os.access(abs_path, os.R_OK):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"El archivo en {payload.absolute_path} no es accesible para lectura."
        )

    # 2. Control de duplicados en base de datos
    existing = db.query(models.Document).filter(
        models.Document.absolute_path == abs_path
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"El documento con la ruta absoluta ya está registrado: {payload.absolute_path}"
        )

    # 3. Determinar filename si no se proporciona
    filename = payload.filename or os.path.basename(abs_path)
    file_size = os.path.getsize(abs_path)

    # 4. Crear registro en BD (storage_type = "external")
    new_doc = models.Document(
        filename=filename,
        storage_path=abs_path,  # Guardamos la ruta física absoluta para compatibilidad con descargas y visores
        file_size=file_size,
        status=models.DocumentStatus.PROCESSING,
        storage_type=models.DocumentStorageType.EXTERNAL,
        absolute_path=abs_path,
        relative_path=payload.relative_path
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)

    # 5. Si se proporciona background_tasks, procesar texto/metadatos de fondo
    if background_tasks:
        from routes.documents import process_pdf_in_background
        background_tasks.add_task(process_pdf_in_background, str(new_doc.id), abs_path)

    return new_doc


def scan_directory_dry_run(path: Union[str, Path]) -> Dict[str, Any]:
    """
    Escanea recursivamente un directorio (Dry-Run) y devuelve una estructura en árbol
    de las carpetas y archivos PDF encontrados, con contadores y tamaños totales.
    Valida la existencia y permisos, y descarta ficheros y carpetas ocultos.
    """
    path_obj = Path(path)

    # 1. Validar existencia física en el disco
    if not path_obj.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"El directorio especificado no existe: {path}"
        )

    # 2. Validar que sea un directorio (si es un archivo, HTTP 400)
    if path_obj.is_file():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"La ruta especificada es un archivo, se esperaba un directorio: {path}"
        )
    if not path_obj.is_dir():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"La ruta especificada no es un directorio válido: {path}"
        )

    # 3. Validar permisos de lectura en el directorio raíz (si no hay permisos, HTTP 400)
    if not os.access(path_obj, os.R_OK):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No hay permisos de lectura para el directorio especificado: {path}"
        )

    def _scan_node(current_path: Path) -> Dict[str, Any]:
        name = current_path.name or str(current_path)
        
        files_list = []
        subfolders_list = []
        
        total_folders = 0
        total_files = 0
        total_size = 0
        
        try:
            for item in current_path.iterdir():
                # Omitir archivos/carpetas ocultos (que empiezan por .)
                if item.name.startswith('.'):
                    continue
                    
                if item.is_file():
                    # Filtrar estrictamente archivos con extensión .pdf (case insensitive)
                    if item.suffix.lower() == '.pdf':
                        try:
                            if os.access(item, os.R_OK):
                                size = item.stat().st_size
                                files_list.append({
                                    "name": item.name,
                                    "size": size,
                                    "absolute_path": str(item.resolve())
                                })
                                total_files += 1
                                total_size += size
                        except Exception:
                            # Ignorar archivos ilegibles temporalmente
                            pass
                elif item.is_dir():
                    # Escaneo recursivo controlado
                    try:
                        if os.access(item, os.R_OK):
                            sub_node = _scan_node(item)
                            subfolders_list.append(sub_node)
                            # total_folders es el subdirectorio mismo más todos los subdirectorios dentro de él
                            total_folders += 1 + sub_node["total_folders"]
                            total_files += sub_node["total_files"]
                            total_size += sub_node["total_size"]
                    except Exception:
                        # Ignorar subdirectorios ilegibles
                        pass
        except PermissionError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"No hay permisos de lectura para acceder a {current_path}"
            )
            
        return {
            "name": name,
            "absolute_path": str(current_path.resolve()),
            "files": files_list,
            "subfolders": subfolders_list,
            "total_folders": total_folders,
            "total_files": total_files,
            "total_size": total_size
        }

    return _scan_node(path_obj)


def process_bulk_ingestion(root_path: str, db: Session, batch_size: int = 50, task_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Recorre de forma recursiva y segura el directorio raíz `root_path` optimizando I/O
    para evitar bloqueos en unidades virtuales/externas, registrando los PDF encontrados.
    """
    root_path_obj = Path(root_path).resolve()
    
    if not task_id:
        import uuid
        task_id = str(uuid.uuid4())
        
    task_tracker.create_task(task_id, total_items=0, status="in_progress")
    
    if not root_path_obj.exists() or not root_path_obj.is_dir():
        err_msg = f"La ruta de origen no existe o no es un directorio: {root_path}"
        task_tracker.update_task(
            task_id,
            status="failed",
            errors=[err_msg]
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=err_msg
        )
        
    logger.info(f"Iniciando escaneo optimizado desde {root_path_obj}")
    
    collections_cache = {}
    
    def get_or_create_collection_for_path(folder_path: Path) -> models.Collection:
        folder_path = folder_path.resolve()
        if folder_path in collections_cache:
            return collections_cache[folder_path]
            
        parent_collection = None
        if folder_path != root_path_obj and folder_path.parent:
            try:
                folder_path.parent.relative_to(root_path_obj)
                parent_collection = get_or_create_collection_for_path(folder_path.parent)
            except ValueError:
                pass
            
        parent_id = parent_collection.id if parent_collection else None
        collection_name = folder_path.name
        if folder_path == root_path_obj:
            collection_name = folder_path.name or "Ingesta Masiva"
            
        existing_col = db.query(models.Collection).filter(
            models.Collection.name == collection_name,
            models.Collection.parent_id == parent_id
        ).first()
        
        if existing_col:
            collections_cache[folder_path] = existing_col
            return existing_col
            
        new_col = models.Collection(
            name=collection_name,
            parent_id=parent_id,
            description=f"Colección creada automáticamente para la ruta: {folder_path}"
        )
        db.add(new_col)
        db.flush()
        collections_cache[folder_path] = new_col
        return new_col

    # Recorrido recursivo seguro y tolerante a fallos de I/O en unidades externas
    pending_files = []
    
    def safe_scan(current_dir: Path):
        try:
            with os.scandir(current_dir) as entries:
                for entry in entries:
                    if entry.name.startswith('.'):
                        continue
                    item_path = Path(entry.path)
                    if entry.is_dir(follow_symlinks=False):
                        safe_scan(item_path)
                    elif entry.is_file(follow_symlinks=False) and item_path.suffix.lower() == '.pdf':
                        try:
                            if os.access(item_path, os.R_OK):
                                parent_dir = item_path.parent
                                collection = get_or_create_collection_for_path(parent_dir)
                                pending_files.append((item_path, collection))
                        except Exception:
                            pass
        except Exception as scan_err:
            logger.warning(f"No se pudo leer el directorio {current_dir}: {scan_err}")

    safe_scan(root_path_obj)
    total_detected = len(pending_files)
    
    # Actualizar total de ítems en el tracker
    task_tracker.update_task(task_id, total_items=total_detected)
    logger.info(f"Escaneo finalizado. Se detectaron {total_detected} archivos PDF.")

    if total_detected == 0:
        task_tracker.update_task(task_id, status="completed", processed_items=0)
        return {
            "total_detected": 0,
            "successful": 0,
            "failed": 0,
            "errors": [],
            "task_id": task_id
        }
    
    successful_count = 0
    failed_count = 0
    errors_list = []
    
    # Procesamiento por lotes
    for i in range(0, len(pending_files), batch_size):
        batch = pending_files[i : i + batch_size]
        
        try:
            with db.begin_nested():
                batch_documents = []
                for pdf_path, collection in batch:
                    abs_path = os.path.normpath(str(pdf_path.resolve()))
                    
                    existing = db.query(models.Document).filter(
                        models.Document.absolute_path == abs_path
                    ).first()
                    
                    if existing:
                        if collection and collection not in existing.collections:
                            existing.collections.append(collection)
                        successful_count += 1
                        task_tracker.update_task(task_id, processed_items=successful_count + failed_count)
                        continue
                        
                    file_size = pdf_path.stat().st_size
                    try:
                        relative_path = str(pdf_path.relative_to(root_path_obj))
                    except ValueError:
                        relative_path = pdf_path.name
                        
                    new_doc = models.Document(
                        filename=pdf_path.name,
                        storage_path=abs_path,
                        file_size=file_size,
                        status=models.DocumentStatus.READY,
                        storage_type=models.DocumentStorageType.EXTERNAL,
                        absolute_path=abs_path,
                        relative_path=relative_path
                    )
                    
                    if collection:
                        new_doc.collections.append(collection)
                        
                    db.add(new_doc)
                    batch_documents.append((pdf_path, new_doc))
                
                db.flush()
                successful_count += len(batch_documents)
                task_tracker.update_task(task_id, processed_items=successful_count + failed_count)
                
            db.commit()
            
        except Exception as batch_error:
            db.rollback()
            logger.warning(f"Fallo en lote. Procesando individualmente. Error: {batch_error}")
            
            for pdf_path, collection in batch:
                try:
                    with db.begin_nested():
                        abs_path = os.path.normpath(str(pdf_path.resolve()))
                        existing = db.query(models.Document).filter(
                            models.Document.absolute_path == abs_path
                        ).first()
                        
                        if existing:
                            if collection and collection not in existing.collections:
                                existing.collections.append(collection)
                            successful_count += 1
                            task_tracker.update_task(task_id, processed_items=successful_count + failed_count)
                            continue
                            
                        file_size = pdf_path.stat().st_size
                        try:
                            relative_path = str(pdf_path.relative_to(root_path_obj))
                        except ValueError:
                            relative_path = pdf_path.name
                            
                        new_doc = models.Document(
                            filename=pdf_path.name,
                            storage_path=abs_path,
                            file_size=file_size,
                            status=models.DocumentStatus.READY,
                            storage_type=models.DocumentStorageType.EXTERNAL,
                            absolute_path=abs_path,
                            relative_path=relative_path
                        )
                        
                        if collection:
                            new_doc.collections.append(collection)
                            
                        db.add(new_doc)
                        db.flush()
                    db.commit()
                    successful_count += 1
                    task_tracker.update_task(task_id, processed_items=successful_count + failed_count)
                except Exception as single_error:
                    db.rollback()
                    failed_count += 1
                    err_msg = f"Error en archivo {pdf_path.name}: {str(single_error)}"
                    logger.error(err_msg)
                    errors_list.append(err_msg) # <-- IMPORTANTE: Guardar como string plano para cumplir con IngestStatusResponse
                    task_tracker.update_task(task_id, add_errors=[err_msg], processed_items=successful_count + failed_count)
                    
    final_status = "completed" if not errors_list else "completed_with_errors"
    task_tracker.update_task(task_id, status=final_status, processed_items=successful_count + failed_count, errors=errors_list)

    logger.info(f"Ingesta masiva finalizada. Éxito: {successful_count}, Errores: {failed_count}")
    return {
        "total_detected": total_detected,
        "successful": successful_count,
        "failed": failed_count,
        "errors": errors_list,
        "task_id": task_id
    }


def sync_directory_service(root_path: str, db: Session) -> dict:
    """
    Sincroniza el directorio físico con la base de datos de manera recursiva:
    1. Escanea el root_path físico para obtener todos los archivos PDF actuales.
    2. Consulta en la BD los documentos de tipo EXTERNAL cuyo path esté dentro de root_path.
    3. Compara listas:
        - Si falta en la BD, se indexa y se guarda.
        - Si está en la BD pero no existe físicamente, se elimina/desactiva de la BD.
    4. Devuelve un resumen {"added": int, "removed": int}.
    """
    root_path_obj = Path(root_path).resolve()

    if not root_path_obj.exists() or not root_path_obj.is_dir():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"La ruta de origen no existe o no es un directorio: {root_path}"
        )
    if not os.access(root_path_obj, os.R_OK):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No hay permisos de lectura para el directorio especificado: {root_path}"
        )

    # 1. Escaneo físico recursivo de PDFs
    physical_paths = set()

    def safe_scan(current_dir: Path):
        try:
            with os.scandir(current_dir) as entries:
                for entry in entries:
                    if entry.name.startswith('.'):
                        continue
                    item_path = Path(entry.path)
                    if entry.is_dir(follow_symlinks=False):
                        safe_scan(item_path)
                    elif entry.is_file(follow_symlinks=False) and item_path.suffix.lower() == '.pdf':
                        try:
                            if os.access(item_path, os.R_OK):
                                abs_p = os.path.normpath(str(item_path.resolve()))
                                physical_paths.add(abs_p)
                        except Exception:
                            pass
        except Exception as scan_err:
            logger.warning(f"No se pudo leer el directorio {current_dir}: {scan_err}")

    safe_scan(root_path_obj)

    # 2. Obtener documentos en BD bajo el root_path
    db_docs = db.query(models.Document).filter(
        models.Document.storage_type == models.DocumentStorageType.EXTERNAL
    ).all()

    docs_in_dir = []
    for doc in db_docs:
        if doc.absolute_path:
            norm_doc_path = os.path.normpath(doc.absolute_path)
            try:
                Path(norm_doc_path).relative_to(root_path_obj)
                docs_in_dir.append(doc)
            except ValueError:
                pass

    db_paths_map = {os.path.normpath(doc.absolute_path): doc for doc in docs_in_dir if doc.absolute_path}

    added_count = 0
    removed_count = 0

    # 3. Eliminar huérfanos (BD records que no existen físicamente)
    to_remove = []
    for db_path, doc in db_paths_map.items():
        if db_path not in physical_paths:
            to_remove.append(doc)

    for doc in to_remove:
        db.delete(doc)
        removed_count += 1

    # 4. Añadir nuevos (Archivos físicos que no están en BD)
    to_add = []
    for phys_path in physical_paths:
        if phys_path not in db_paths_map:
            to_add.append(phys_path)

    if to_add:
        collections_cache = {}

        # CORRECCIÓN: Comprobar si ya existe una colección registrada para el root_path actual
        existing_root_col = db.query(models.Collection).filter(
            models.Collection.description == f"Colección creada automáticamente para la ruta: {root_path_obj}"
        ).first()
        
        if existing_root_col:
            collections_cache[root_path_obj] = existing_root_col

        def get_or_create_collection_for_path(folder_path: Path) -> models.Collection:
            folder_path = folder_path.resolve()
            if folder_path in collections_cache:
                return collections_cache[folder_path]
                
            parent_collection = None
            if folder_path != root_path_obj and folder_path.parent:
                try:
                    folder_path.parent.relative_to(root_path_obj)
                    parent_collection = get_or_create_collection_for_path(folder_path.parent)
                except ValueError:
                    pass
                
            parent_id = parent_collection.id if parent_collection else None
            collection_name = folder_path.name
            if folder_path == root_path_obj:
                collection_name = folder_path.name or "Sincronizacion Externa"
                
            existing_col = db.query(models.Collection).filter(
                models.Collection.name == collection_name,
                models.Collection.parent_id == parent_id
            ).first()
            
            if existing_col:
                collections_cache[folder_path] = existing_col
                return existing_col
                
            new_col = models.Collection(
                name=collection_name,
                parent_id=parent_id,
                description=f"Colección creada automáticamente para la ruta: {folder_path}"
            )
            db.add(new_col)
            db.flush()
            collections_cache[folder_path] = new_col
            return new_col

        for phys_path in to_add:
            phys_path_obj = Path(phys_path)
            file_size = phys_path_obj.stat().st_size
            try:
                relative_path = str(phys_path_obj.relative_to(root_path_obj))
            except ValueError:
                relative_path = phys_path_obj.name
                
            new_doc = models.Document(
                filename=phys_path_obj.name,
                storage_path=phys_path,
                file_size=file_size,
                status=models.DocumentStatus.READY,
                storage_type=models.DocumentStorageType.EXTERNAL,
                absolute_path=phys_path,
                relative_path=relative_path
            )
            
            parent_dir = phys_path_obj.parent
            collection = get_or_create_collection_for_path(parent_dir)
            if collection:
                new_doc.collections.append(collection)
                
            db.add(new_doc)
            added_count += 1

    db.commit()

    return {"added": added_count, "removed": removed_count}
