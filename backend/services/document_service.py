import os
import logging
from pathlib import Path
from typing import Union, Dict, Any
from sqlalchemy.orm import Session
from fastapi import HTTPException, status, BackgroundTasks
import models
from schemas.document import DocumentExternalCreate

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


def process_bulk_ingestion(root_path: str, db: Session, batch_size: int = 50) -> Dict[str, Any]:
    """
    Recorre de forma recursiva el directorio raíz `root_path` y registra de manera asíncrona
    los documentos PDF encontrados como almacenamiento externo, organizándolos en colecciones
    que replican la estructura de carpetas.
    Procesa en lotes (batches) para optimizar las transacciones.
    """
    root_path_obj = Path(root_path).resolve()
    
    if not root_path_obj.exists() or not root_path_obj.is_dir():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"La ruta de origen no existe o no es un directorio: {root_path}"
        )
        
    logger.info(f"Iniciando ingesta masiva desde {root_path_obj} con tamaño de lote {batch_size}")
    
    # Caché para evitar consultas redundantes y mantener la jerarquía de colecciones en memoria durante el proceso.
    # Clave: ruta absoluta de la carpeta (Path), Valor: objeto Collection
    collections_cache = {}
    
    # Función auxiliar para asegurar que una carpeta y sus ancestros (hasta el root_path)
    # tengan su correspondiente colección creada y vinculada en la base de datos.
    def get_or_create_collection_for_path(folder_path: Path) -> models.Collection:
        folder_path = folder_path.resolve()
        if folder_path in collections_cache:
            return collections_cache[folder_path]
            
        # Determinar la colección padre buscando el ancestro
        parent_collection = None
        if folder_path != root_path_obj and folder_path.parent:
            # Solo buscar parent si el padre sigue dentro de la jerarquía de root_path_obj
            try:
                # Comprobar si folder_path es relativo a root_path_obj
                folder_path.parent.relative_to(root_path_obj)
                parent_collection = get_or_create_collection_for_path(folder_path.parent)
            except ValueError:
                pass
            
        # Determinar el parent_id
        parent_id = parent_collection.id if parent_collection else None
        
        # El nombre de la colección será el nombre de la carpeta
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
            
        # Si no existe, crearla
        new_col = models.Collection(
            name=collection_name,
            parent_id=parent_id,
            description=f"Colección creada automáticamente para la ruta: {folder_path}"
        )
        db.add(new_col)
        db.flush()  # Para obtener el ID generado sin comprometer la transacción completa
        collections_cache[folder_path] = new_col
        return new_col

    # Recorrer el directorio recursivamente y agrupar archivos por procesar
    # Guardamos tuplas de (archivo_pdf_path, coleccion_asociada)
    pending_files = []
    
    for dirpath, dirnames, filenames in os.walk(root_path_obj):
        # Saltar carpetas ocultas
        dirnames[:] = [d for d in dirnames if not d.startswith('.')]
        
        current_dir_path = Path(dirpath)
        
        # Filtrar archivos PDF
        pdf_files = [f for f in filenames if f.lower().endswith('.pdf') and not f.startswith('.')]
        if not pdf_files:
            continue
            
        # Asegurar la colección para esta carpeta
        try:
            collection = get_or_create_collection_for_path(current_dir_path)
        except Exception as e:
            logger.error(f"Error asegurando colección para {current_dir_path}: {e}")
            continue
            
        for pdf_file in pdf_files:
            pdf_path = current_dir_path / pdf_file
            pending_files.append((pdf_path, collection))

    total_detected = len(pending_files)
    logger.info(f"Se detectaron {total_detected} archivos PDF para ingesta.")
    
    successful_count = 0
    failed_count = 0
    errors_list = []
    
    # Procesar por lotes (batches)
    for i in range(0, len(pending_files), batch_size):
        batch = pending_files[i : i + batch_size]
        
        try:
            # Usar savepoint anidado para el lote para que podamos revertir solo el lote si falla
            with db.begin_nested():
                batch_documents = []
                for pdf_path, collection in batch:
                    abs_path = os.path.normpath(str(pdf_path.resolve()))
                    
                    # Validar si ya existe el documento por su absolute_path para evitar conflictos
                    existing = db.query(models.Document).filter(
                        models.Document.absolute_path == abs_path
                    ).first()
                    
                    if existing:
                        # Si ya existe, simplemente lo vinculamos a la colección si no lo está
                        if collection and collection not in existing.collections:
                            existing.collections.append(collection)
                        successful_count += 1
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
                
            db.commit()
            
        except Exception as batch_error:
            db.rollback()
            logger.warning(f"Fallo en lote {i//batch_size + 1}. Procesando elementos individualmente. Error: {batch_error}")
            
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
                except Exception as single_error:
                    db.rollback()
                    failed_count += 1
                    err_msg = f"Error al procesar archivo individual {pdf_path}: {single_error}"
                    logger.error(err_msg)
                    errors_list.append({"file": str(pdf_path), "error": str(single_error)})
                    
    logger.info(f"Ingesta masiva completada. Éxito: {successful_count}, Errores: {failed_count}")
    return {
        "total_detected": total_detected,
        "successful": successful_count,
        "failed": failed_count,
        "errors": errors_list
    }
