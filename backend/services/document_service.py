import os
from pathlib import Path
from typing import Union, Dict, Any
from sqlalchemy.orm import Session
from fastapi import HTTPException, status, BackgroundTasks
import models
from schemas.document import DocumentExternalCreate

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
