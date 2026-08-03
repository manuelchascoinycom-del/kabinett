from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
from fastapi import HTTPException, status
from jwt import exceptions as jwt_exceptions
from passlib.context import CryptContext

_PWD_CONTEXT = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain_password: str) -> str:
    return _PWD_CONTEXT.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return _PWD_CONTEXT.verify(plain_password, hashed_password)


def _get_secret_key() -> str:
    secret = os.getenv("SECRET_KEY")
    if not secret:
        raise RuntimeError("SECRET_KEY is not set")
    return secret


def _get_algorithm() -> str:
    return os.getenv("ALGORITHM", "HS256")


def _get_access_token_expire_minutes() -> int:
    raw = os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60")
    return int(raw)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    if "sub" not in data or "role" not in data:
        raise ValueError("data must include sub and role")

    expire = datetime.now(timezone.utc) + (
        expires_delta
        if expires_delta is not None
        else timedelta(minutes=_get_access_token_expire_minutes())
    )

    payload = dict(data)
    payload["sub"] = str(data["sub"])
    payload["role"] = data["role"]
    payload["exp"] = expire

    return jwt.encode(payload, _get_secret_key(), algorithm=_get_algorithm())


def decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(token, _get_secret_key(), algorithms=[_get_algorithm()])
    except jwt_exceptions.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
