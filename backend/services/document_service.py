import os
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
