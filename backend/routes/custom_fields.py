from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_session
import models
from schemas.custom_field import CustomFieldCreate, CustomFieldResponse
from dependencies import require_roles  # <--- Importación actualizada

router = APIRouter(prefix="/custom-fields", tags=["Custom Fields"])

@router.post("", response_model=CustomFieldResponse, status_code=status.HTTP_201_CREATED)
async def create_custom_field(
    payload: CustomFieldCreate, 
    db: AsyncSession = Depends(get_session),
    current_user: dict = Depends(require_roles(["Admin", "Editor"]))  # <--- RBAC
):
    # Evitar nombres duplicados
    existing = await db.scalar(select(models.CustomFieldDefinition).where(
        models.CustomFieldDefinition.name.ilike(payload.name)
    ))
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe un campo personalizado con este nombre")

    new_field = models.CustomFieldDefinition(
        name=payload.name,
        field_type=payload.field_type,
        options=payload.options
    )
    db.add(new_field)
    await db.commit()
    await db.refresh(new_field)
    return new_field

@router.get("", response_model=list[CustomFieldResponse])
async def list_custom_fields(
    db: AsyncSession = Depends(get_session),
    current_user: dict = Depends(require_roles(["Admin", "Editor", "Viewer"]))  # <--- RBAC
):
    return list((await db.scalars(select(models.CustomFieldDefinition))).all())
    
@router.delete("/{field_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_custom_field(
    field_id: str, 
    db: AsyncSession = Depends(get_session),
    current_user: dict = Depends(require_roles(["Admin"]))  # <--- RBAC
):
    # 1. Buscar el campo en la BD
    field = await db.scalar(select(models.CustomFieldDefinition).where(
        models.CustomFieldDefinition.id == field_id
    ))
    
    if not field:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Campo personalizado no encontrado"
        )

    # 2. Eliminar y guardar cambios
    await db.delete(field)
    await db.commit()
    return None