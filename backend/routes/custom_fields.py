from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
import models
from schemas.custom_field import CustomFieldCreate, CustomFieldResponse
from dependencies import get_current_user

router = APIRouter(prefix="/custom-fields", tags=["Custom Fields"])

@router.post("", response_model=CustomFieldResponse, status_code=status.HTTP_201_CREATED)
def create_custom_field(payload: CustomFieldCreate, db: Session = Depends(get_db)):
    # Evitar nombres duplicados
    existing = db.query(models.CustomFieldDefinition).filter(
        models.CustomFieldDefinition.name.ilike(payload.name)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe un campo personalizado con este nombre")

    new_field = models.CustomFieldDefinition(
        name=payload.name,
        field_type=payload.field_type,
        options=payload.options
    )
    db.add(new_field)
    db.commit()
    db.refresh(new_field)
    return new_field

@router.get("", response_model=list[CustomFieldResponse])
def list_custom_fields(db: Session = Depends(get_db)):
    return db.query(models.CustomFieldDefinition).all()
    
@router.delete("/{field_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_custom_field(field_id: str, db: Session = Depends(get_db)):
    # 1. Buscar el campo en la BD
    field = db.query(models.CustomFieldDefinition).filter(
        models.CustomFieldDefinition.id == field_id
    ).first()
    
    if not field:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Campo personalizado no encontrado"
        )

    # 2. Eliminar y guardar cambios
    db.delete(field)
    db.commit()
    return None
