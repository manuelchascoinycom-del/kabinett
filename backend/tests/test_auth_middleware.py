import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

from dependencies import get_current_user
from security import create_access_token


@pytest.fixture()
def client(monkeypatch: pytest.MonkeyPatch) -> TestClient:
    monkeypatch.setenv("SECRET_KEY", "test-secret")
    monkeypatch.setenv("ALGORITHM", "HS256")
    monkeypatch.setenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60")

    app = FastAPI()

    @app.get("/protected")
    def protected_route(current_user: dict = Depends(get_current_user)):
        return {"ok": True, "user": current_user}

    return TestClient(app)


def test_protected_endpoint_without_token_returns_401(client: TestClient):
    res = client.get("/protected")
    assert res.status_code == 401


def test_protected_endpoint_with_invalid_token_returns_401(client: TestClient):
    res = client.get("/protected", headers={"Authorization": "Bearer invalid.token.value"})
    assert res.status_code == 401


def test_protected_endpoint_with_valid_token_returns_200(client: TestClient):
    token = create_access_token({"sub": "user-1", "role": "admin"})
    res = client.get("/protected", headers={"Authorization": f"Bearer {token}"})

    assert res.status_code == 200
    assert res.json()["user"]["sub"] == "user-1"
    assert res.json()["user"]["role"] == "admin"
