from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
import models
from security import create_access_token, verify_password

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
    # 1. Buscar usuario por email en la BD
    user = db.query(models.User).filter(models.User.email == payload.username).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 2. Verificar que la cuenta no esté desactivada
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La cuenta de usuario se encuentra desactivada",
        )

    # 3. Validar hash de contraseña
    if not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 4. Obtener valor del rol (soporta si es enum o string)
    role_value = user.role.value if hasattr(user.role, "value") else str(user.role)

    # 5. Generar JWT firmado
    access_token = create_access_token(
        data={"sub": str(user.id), "role": role_value}
    )

    return {"access_token": access_token, "token_type": "bearer"}