from datetime import timedelta

import pytest
from fastapi import HTTPException

import security


def test_hash_password_and_verify_password_success_and_failure():
    hashed = security.hash_password("password123")
    assert hashed != "password123"
    assert security.verify_password("password123", hashed) is True
    assert security.verify_password("wrong", hashed) is False


def test_create_and_decode_access_token_returns_claims(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("SECRET_KEY", "test-secret")
    monkeypatch.setenv("ALGORITHM", "HS256")
    monkeypatch.setenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60")

    token = security.create_access_token({"sub": "user-1", "role": "admin"})
    payload = security.decode_access_token(token)

    assert payload["sub"] == "user-1"
    assert payload["role"] == "admin"


def test_decode_access_token_expired_fails(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("SECRET_KEY", "test-secret")
    monkeypatch.setenv("ALGORITHM", "HS256")
    monkeypatch.setenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60")

    token = security.create_access_token(
        {"sub": "user-1", "role": "admin"},
        expires_delta=timedelta(seconds=-1),
    )

    with pytest.raises(HTTPException) as exc:
        security.decode_access_token(token)

    assert exc.value.status_code == 401


def test_decode_access_token_tampered_fails(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("SECRET_KEY", "test-secret")
    monkeypatch.setenv("ALGORITHM", "HS256")
    monkeypatch.setenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60")

    token = security.create_access_token({"sub": "user-1", "role": "admin"})
    tampered = token[:-1] + ("a" if token[-1] != "a" else "b")

    with pytest.raises(HTTPException) as exc:
        security.decode_access_token(tampered)

    assert exc.value.status_code == 401
