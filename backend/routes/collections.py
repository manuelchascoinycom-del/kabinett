import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
import models
from schemas.collection import CollectionCreate, CollectionResponse, AssignDocumentSchema
from dependencies import get_current_user

router = APIRouter(prefix="/collections", tags=["Collections"])

@router.post("", response_model=CollectionResponse, status_code=status.HTTP_201_CREATED)
def create_collection(payload: CollectionCreate, db: Session = Depends(get_db)):
    new_collection = models.Collection(
        name=payload.name,
        description=payload.description
    )
    db.add(new_collection)
    db.commit()
    db.refresh(new_collection)
    return CollectionResponse(
        id=new_collection.id,
        name=new_collection.name,
        description=new_collection.description,
        created_at=new_collection.created_at,
        document_count=0
    )

@router.get("", response_model=list[CollectionResponse])
def list_collections(db: Session = Depends(get_db)):
    collections = db.query(
        models.Collection,
        func.count(models.document_collections.c.document_id).label("doc_count")
    ).outerjoin(models.document_collections).group_by(models.Collection.id).all()

    result = []
    for col, count in collections:
        result.append(CollectionResponse(
            id=col.id,
            name=col.name,
            description=col.description,
            created_at=col.created_at,
            document_count=count
        ))
    return result

@router.post("/{collection_id}/documents", status_code=status.HTTP_200_OK)
def assign_document_to_collection(
    collection_id: uuid.UUID, 
    payload: AssignDocumentSchema, 
    db: Session = Depends(get_db)
):
    collection = db.query(models.Collection).filter(models.Collection.id == collection_id).first()
    if not collection:
        raise HTTPException(status_code=404, detail="Colección no encontrada")

    document = db.query(models.Document).filter(models.Document.id == payload.document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Documento no encontrado")

    if document not in collection.documents:
        collection.documents.append(document)
        db.commit()

    return {"message": "Documento asignado a la colección correctamente"}

@router.delete("/{collection_id}/documents/{document_id}", status_code=status.HTTP_200_OK)
def remove_document_from_collection(
    collection_id: uuid.UUID, 
    document_id: uuid.UUID, 
    db: Session = Depends(get_db)
):
    """
    CRITERIO DE DESASIGNACIÓN: Elimina la relación lógica en document_collections.
    El documento permanece intacto en la tabla 'documents' y en el disco físico.
    """
    collection = db.query(models.Collection).filter(models.Collection.id == collection_id).first()
    if not collection:
        raise HTTPException(status_code=404, detail="Colección no encontrada")

    document = db.query(models.Document).filter(models.Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Documento no encontrado")

    if document in collection.documents:
        collection.documents.remove(document)
        db.commit()

    return {"message": "Documento eliminado de la colección (permanece en la biblioteca raíz)"}

@router.get("/{collection_id}/documents")
def get_documents_by_collection(collection_id: uuid.UUID, db: Session = Depends(get_db)):
    collection = db.query(models.Collection).filter(models.Collection.id == collection_id).first()
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
def delete_collection(collection_id: str, db: Session = Depends(get_db)):
    collection = db.query(models.Collection).filter(
        models.Collection.id == collection_id
    ).first()
    
    if not collection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Colección no encontrada"
        )

    # Elimina la colección de la base de datos
    db.delete(collection)
    db.commit()
    return None
