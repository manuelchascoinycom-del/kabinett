# routes/auth.py
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
import models
from security import create_access_token, verify_password, hash_password as get_password_hash
from dependencies import get_current_user
from schemas.user import UserProfileResponse, ChangePasswordRequest

router = APIRouter(prefix="/auth", tags=["Auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


@router.post("/login", response_model=TokenResponse, status_code=status.HTTP_200_OK)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """
    Endpoint para autenticación con JSON payload {"username": "...", "password": "..."}.
    Consulta directamente a la base de datos y genera el JWT con id de usuario y rol.
    """
    user = db.query(models.User).filter(models.User.email == payload.username).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La cuenta de usuario se encuentra desactivada",
        )

    if not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
            headers={"WWW-Authenticate": "Bearer"},
        )

    role_value = user.role.value if hasattr(user.role, "value") else str(user.role)

    access_token = create_access_token(
        data={"sub": str(user.id), "role": role_value}
    )

    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserProfileResponse, status_code=status.HTTP_200_OK)
def get_current_user_profile(
    db: Session = Depends(get_db),
    current_user_dict: dict = Depends(get_current_user)
):
    """Retorna la información del perfil del usuario autenticado."""
    user_id = current_user_dict.get("sub")
    user = db.query(models.User).filter(models.User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )

    return user


@router.put("/change-password", status_code=status.HTTP_200_OK)
def change_password(
    payload: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user_dict: dict = Depends(get_current_user)
):
    """Permite al usuario autenticado cambiar su propia contraseña."""
    user_id = current_user_dict.get("sub")
    user = db.query(models.User).filter(models.User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )

    # 1. Validar que la contraseña actual sea correcta
    if not verify_password(payload.current_password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La contraseña actual es incorrecta"
        )

    # 2. Asignar nuevo hash
    user.hashed_password = get_password_hash(payload.new_password)
    db.commit()

    return {"detail": "Contraseña actualizada exitosamente"}