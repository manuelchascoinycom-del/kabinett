from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
from security import verify_password, create_access_token
import models

router = APIRouter(
    prefix="/auth",
    tags=["Auth"]
)


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
    Verifica el hash de la contraseña y genera el JWT con los claims sub y role.
    """
    # Buscar usuario por email/username en la BD
    user = db.query(models.User).filter(models.User.email == payload.username).first() if hasattr(models, "User") else None

    # Si aún no tienes modelo User en BD, puedes usar esta validación de contingencia/dev
    if not user:
        # Ejemplo para pruebas locales si aún no hay tabla de usuarios cargada
        if payload.username == "admin@kabinett.com" and payload.password == "admin123":
            access_token = create_access_token(
                data={"sub": payload.username, "role": "Admin"}
            )
            return {"access_token": access_token, "token_type": "bearer"}
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Validación real con hash de contraseña
    if not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Generación de token firmado
    access_token = create_access_token(
        data={"sub": str(user.id), "role": user.role}
    )

    return {"access_token": access_token, "token_type": "bearer"}