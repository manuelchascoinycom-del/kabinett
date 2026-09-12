import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, or_, select

from database import get_session
import models
from security import hash_password as get_password_hash
from dependencies import require_roles
from schemas.user import (
    UserCreate,
    UserUpdate,
    UserStatusUpdate,
    UserResponse,
    UserListResponse,
)

router = APIRouter(
    prefix="/admin/users",
    tags=["Admin Users"],
    dependencies=[Depends(require_roles(["Admin"]))]  # <--- Exclusivo Admin
)


@router.get("", response_model=UserListResponse, status_code=status.HTTP_200_OK)
async def list_users(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    db: AsyncSession = Depends(get_session)
):
    """Lista paginada de usuarios con filtros por búsqueda, rol y estado."""
    query = select(models.User)

    if search:
        search_fmt = f"%{search.strip()}%"
        query = query.where(
            or_(
                models.User.name.ilike(search_fmt),
                models.User.email.ilike(search_fmt)
            )
        )

    if role:
        query = query.where(models.User.role == role)

    if is_active is not None:
        query = query.where(models.User.is_active == is_active)

    total = await db.scalar(select(func.count()).select_from(query.subquery()))
    offset = (page - 1) * limit
    users = list((await db.scalars(
        query.order_by(models.User.created_at.desc()).offset(offset).limit(limit)
    )).all())

    return {
        "users": users,
        "total": total,
        "page": page,
        "limit": limit
    }


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(payload: UserCreate, db: AsyncSession = Depends(get_session)):
    """Crea un nuevo usuario asegurando email único y hash de contraseña."""
    existing_user = await db.scalar(
        select(models.User).where(models.User.email == payload.email)
    )
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El correo electrónico ya se encuentra registrado"
        )

    hashed_pwd = get_password_hash(payload.password)
    new_user = models.User(
        email=payload.email,
        name=payload.name,
        hashed_password=hashed_pwd,
        role=payload.role,
        is_active=True
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return new_user


@router.patch("/{user_id}", response_model=UserResponse, status_code=status.HTTP_200_OK)
async def update_user(
    user_id: uuid.UUID,
    payload: UserUpdate,
    db: AsyncSession = Depends(get_session),
    current_user: dict = Depends(require_roles(["Admin"]))
):
    """Actualiza datos, rol o contraseña de un usuario. Evita auto-remover rol de Admin."""
    user = await db.scalar(select(models.User).where(models.User.id == user_id))
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # Autoprotección: No quitarse el rol de Admin a sí mismo
    if str(user.id) == str(current_user.get("sub")) and payload.role and payload.role != "Admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No puedes quitarte el rol de Admin a ti mismo."
        )

    if payload.email and payload.email != user.email:
        existing = await db.scalar(
            select(models.User).where(models.User.email == payload.email)
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El nuevo correo electrónico ya está en uso"
            )
        user.email = payload.email

    if payload.name:
        user.name = payload.name

    if payload.role:
        user.role = payload.role

    if payload.password:
        user.hashed_password = get_password_hash(payload.password)

    await db.commit()
    await db.refresh(user)
    return user


@router.patch("/{user_id}/status", response_model=UserResponse, status_code=status.HTTP_200_OK)
async def toggle_user_status(
    user_id: uuid.UUID,
    payload: UserStatusUpdate,
    db: AsyncSession = Depends(get_session),
    current_user: dict = Depends(require_roles(["Admin"]))
):
    """Activa o desactiva la cuenta de un usuario. Evita la auto-desactivación del Admin actual."""
    user = await db.scalar(select(models.User).where(models.User.id == user_id))
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # Autoprotección: Un Admin no puede desactivarse a sí mismo
    if str(user.id) == str(current_user.get("sub")) and not payload.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No puedes desactivar tu propia cuenta de Administrador."
        )

    user.is_active = payload.is_active
    await db.commit()
    await db.refresh(user)
    return user