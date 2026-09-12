import os
from pathlib import Path

import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session
from sqlalchemy.orm import selectinload
from database import get_db, get_session
import models
from schemas.collection_update import CollectionUpdate

import shutil

from schemas.collection import (
    CollectionCreate,
    CollectionResponse,
    AssignDocumentSchema,
    CollectionNode,
    MoveDocumentSchema,
)
from dependencies import require_roles  # <--- Importación actualizada

router = APIRouter(prefix="/collections", tags=["Collections"])

@router.post("", response_model=CollectionResponse, status_code=status.HTTP_201_CREATED)
async def create_collection(
    payload: CollectionCreate, 
    db: AsyncSession = Depends(get_session),
    current_user: dict = Depends(require_roles(["Admin", "Editor"]))  # <--- RBAC
):
    # Validar si se proporciona un parent_id y comprobar si existe en la base de datos
    if payload.parent_id:
        parent_collection = await db.scalar(
            select(models.Collection).where(models.Collection.id == payload.parent_id)
        )
        if not parent_collection:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"La colección padre con ID {payload.parent_id} no existe."
            )

    new_collection = models.Collection(
        name=payload.name,
        description=payload.description,
        parent_id=payload.parent_id
    )
    db.add(new_collection)
    await db.commit()
    await db.refresh(new_collection)
    
    return CollectionResponse(
        id=new_collection.id,
        name=new_collection.name,
        description=new_collection.description,
        parent_id=new_collection.parent_id,
        created_at=new_collection.created_at,
        document_count=0
    )

@router.put("/{collection_id}", response_model=CollectionResponse)
async def update_collection(
    collection_id: uuid.UUID,
    payload: CollectionUpdate,
    db: AsyncSession = Depends(get_session),
    current_user: dict = Depends(require_roles(["Admin", "Editor"]))
):
    collection = await db.scalar(select(models.Collection).where(models.Collection.id == collection_id))
    if not collection:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Colección no encontrada")

    # Validar si el nuevo nombre es válido
    if not payload.name or payload.name.strip() == "":
        raise HTTPException(status_code=400, detail="El nombre de la colección no puede estar vacío")

    # 1. Comprobar si tiene una descripción que incluya la ruta física
    if collection.description and "Colección creada automáticamente para la ruta: " in collection.description:
        old_path_str = collection.description.replace("Colección creada automáticamente para la ruta: ", "").strip()
        old_path = Path(old_path_str)
        
        if old_path.exists():
            new_path = old_path.parent / payload.name
            
            # Renombrar físicamente
            try:
                os.rename(old_path, new_path)
                
                # Actualizar la descripción en el modelo para reflejar la nueva ruta
                collection.description = f"Colección creada automáticamente para la ruta: {new_path}"
                
            except OSError as e:
                raise HTTPException(status_code=500, detail=f"Error al renombrar el directorio físico: {str(e)}")
    # Validar si el nuevo nombre es válido
    if not payload.name or payload.name.strip() == "":
        raise HTTPException(status_code=400, detail="El nombre de la colección no puede estar vacío")

    # 1. Comprobar si tiene una descripción que incluya la ruta física
    if collection.description and "Colección creada automáticamente para la ruta: " in collection.description:
        old_path_str = collection.description.replace("Colección creada automáticamente para la ruta: ", "").strip()
        old_path = Path(old_path_str)
        
        if old_path.exists():
            new_path = old_path.parent / payload.name
            
            # Renombrar físicamente
            try:
                os.rename(old_path, new_path)
                
                # Actualizar la descripción en el modelo para reflejar la nueva ruta
                collection.description = f"Colección creada automáticamente para la ruta: {new_path}"
                
            except OSError as e:
                raise HTTPException(status_code=500, detail=f"Error al renombrar el directorio físico: {str(e)}")

    
    collection.name = payload.name
    await db.commit()
    await db.refresh(collection)
    
    doc_count = await db.scalar(
        select(func.count(models.document_collections.c.document_id)).where(
            models.document_collections.c.collection_id == collection.id
        )
    )

    return CollectionResponse(
        id=collection.id,
        name=collection.name,
        description=collection.description,
        parent_id=collection.parent_id,
        created_at=collection.created_at,
        document_count=doc_count
    )



@router.get("", response_model=list[CollectionNode] | list[CollectionResponse])
async def list_collections(
    db: AsyncSession = Depends(get_session),
    tree: bool = False,  # Nuevo parámetro para solicitar estructura de árbol
    current_user: dict = Depends(require_roles(["Admin", "Editor", "Viewer"]))  # <--- RBAC
):
    result = await db.execute(select(
        models.Collection,
        func.count(models.document_collections.c.document_id).label("doc_count")
    ).outerjoin(models.document_collections).group_by(models.Collection.id))
    collections = result.all()

    if not tree:
        result = []
        for col, count in collections:
            result.append(CollectionResponse(
                id=col.id,
                name=col.name,
                description=col.description,
                parent_id=col.parent_id,
                created_at=col.created_at,
                document_count=count
            ))
        return result
    else:
        # Lógica para construir el árbol
        collection_map = {str(col.id): CollectionNode(
            id=col.id,
            name=col.name,
            description=col.description,
            parent_id=col.parent_id,
            created_at=col.created_at,
            document_count=count,
            children=[]
        ) for col, count in collections}

        # CORRECCIÓN: Usar .items() en lugar de .values() para desempaquetar col_id y node correctamente
        for col_id, node in collection_map.items():
            if node.parent_id:
                parent = collection_map.get(str(node.parent_id))
                if parent: # Asegurarse de que el padre existe
                    parent.children.append(node)

        # Retornar solo las colecciones raíz (sin parent_id)
        return [node for node in collection_map.values() if not node.parent_id]


@router.post("/{collection_id}/documents", status_code=status.HTTP_200_OK)
async def assign_document_to_collection(
    collection_id: uuid.UUID, 
    payload: AssignDocumentSchema, 
    db: AsyncSession = Depends(get_session),
    current_user: dict = Depends(require_roles(["Admin", "Editor"]))  # <--- RBAC
):
    collection = await db.scalar(select(models.Collection).options(selectinload(models.Collection.documents)).where(models.Collection.id == collection_id))
    if not collection:
        raise HTTPException(status_code=404, detail="Colección no encontrada")

    document = await db.scalar(select(models.Document).where(models.Document.id == payload.document_id))
    if not document:
        raise HTTPException(status_code=404, detail="Documento no encontrado")

    if document not in collection.documents:
        collection.documents.append(document)
        await db.commit()

    return {"message": "Documento asignado a la colección correctamente"}

@router.delete("/{collection_id}/documents/{document_id}", status_code=status.HTTP_200_OK)
async def remove_document_from_collection(
    collection_id: uuid.UUID, 
    document_id: uuid.UUID, 
    db: AsyncSession = Depends(get_session),
    current_user: dict = Depends(require_roles(["Admin"]))  # <--- RBAC
):
    """
    CRITERIO DE DESASIGNACIÓN: Elimina la relación lógica en document_collections.
    El documento permanece intacto en la tabla 'documents' y en el disco físico.
    """
    collection = await db.scalar(select(models.Collection).options(selectinload(models.Collection.documents)).where(models.Collection.id == collection_id))
    if not collection:
        raise HTTPException(status_code=404, detail="Colección no encontrada")

    document = await db.scalar(select(models.Document).where(models.Document.id == document_id))
    if not document:

                raise HTTPException(status_code=404, detail="Documento no encontrado")

    if document in collection.documents:
        collection.documents.remove(document)
        await db.commit()

    return {"message": "Documento eliminado de la colección (permanece en la biblioteca raíz)"}

@router.put("/{document_id}/move", status_code=status.HTTP_200_OK)
async def move_document(
    document_id: uuid.UUID,
    payload: MoveDocumentSchema,
    db: AsyncSession = Depends(get_session),
    current_user: dict = Depends(require_roles(["Admin", "Editor"]))
):
    """
    Mueve un documento de su colección actual a una colección de destino.
    Si ambas tienen ruta física, mueve el archivo en disco.
    """
    # 1. Obtener documento y colección de destino
    doc = await db.scalar(select(models.Document).options(selectinload(models.Document.collections)).where(models.Document.id == document_id))
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")

    target_coll = await db.scalar(select(models.Collection).where(models.Collection.id == payload.target_collection_id))
    if not target_coll:
        raise HTTPException(status_code=404, detail="Colección de destino no encontrada")

    # 2. Identificar la colección actual (asumimos que solo tiene una por ahora)
    if not doc.collections:
        raise HTTPException(status_code=400, detail="El documento no tiene una colección asociada")
    
    source_coll = doc.collections[0]
    
    # 3. Comprobación física
    # Buscamos rutas en la descripción como convención actual del proyecto
    source_path_str = None
    if source_coll.description and "Colección creada automáticamente para la ruta: " in source_coll.description:
        source_path_str = source_coll.description.replace("Colección creada automáticamente para la ruta: ", "").strip()
    
    target_path_str = None
    if target_coll.description and "Colección creada automáticamente para la ruta: " in target_coll.description:
        target_path_str = target_coll.description.replace("Colección creada automáticamente para la ruta: ", "").strip()

    if source_path_str and target_path_str:
        if not doc.absolute_path or not os.path.exists(doc.absolute_path):
             raise HTTPException(status_code=404, detail="Archivo físico original no encontrado")
        
        new_file_path = os.path.join(target_path_str, doc.filename)
        
        # Crear directorio si no existe
        os.makedirs(target_path_str, exist_ok=True)
        
        # Mover archivo
        try:
            shutil.move(doc.absolute_path, new_file_path)
            doc.absolute_path = new_file_path
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error al mover archivo físico: {str(e)}")

    # 4. Actualizar relación en BD
    try:
        doc.collections.remove(source_coll)
        doc.collections.append(target_coll)
        await db.commit()
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al actualizar la base de datos: {str(e)}")

    return {"message": "Documento movido exitosamente"}

@router.get("/{collection_id}/documents")
async def get_documents_by_collection(
    collection_id: uuid.UUID, 
    db: AsyncSession = Depends(get_session),
    current_user: dict = Depends(require_roles(["Admin", "Editor", "Viewer"]))  # <--- RBAC
):
    collection = await db.scalar(select(models.Collection).options(selectinload(models.Collection.documents)).where(models.Collection.id == collection_id))
    if not collection:
        raise HTTPException(status_code=404, detail="Colección no encontrada")

    return [
        {
            "id": str(doc.id),
            "filename": doc.filename,
            "status": doc.status.value if hasattr(doc.status, "value") else str(doc.status),
            "metadata_confirmed": doc.metadata_confirmed,
            "metadata_suggested": doc.metadata_suggested
        }
        for doc in collection.documents
    ]
    
@router.delete("/{collection_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_collection(
    collection_id: uuid.UUID,  # CORRECCIÓN: Cambiado de str a uuid.UUID para evitar errores con Supabase/Postgres
    db: AsyncSession = Depends(get_session),
    current_user: dict = Depends(require_roles(["Admin"]))  # <--- RBAC
):
    collection = await db.scalar(select(models.Collection).where(
        models.Collection.id == collection_id
    ))
    
    if not collection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Colección no encontrada"
        )

    # Elimina la colección de la base de datos
    await db.delete(collection)
    await db.commit()
    return None