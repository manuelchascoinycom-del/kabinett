import os
import tempfile
import pytest
from fastapi.testclient import TestClient
from main import app
from security import create_access_token

client = TestClient(app)

def get_auth_header(role: str, user_id: str = "user_test"):
    token = create_access_token(data={"sub": user_id, "role": role})
    return {"Authorization": f"Bearer {token}"}

def test_index_external_non_existent():
    headers = get_auth_header(role="Admin")
    payload = {
        "absolute_path": "C:/path/to/nonexistent/file.pdf",
        "relative_path": "music/file.pdf",
        "filename": "file.pdf"
    }
    response = client.post("/documents/index-external", json=payload, headers=headers)
    assert response.status_code == 404
    assert "El archivo físico no se encuentra" in response.json()["detail"]

def test_index_external_success_and_duplicate():
    # Crear un archivo temporal real para simular un PDF existente
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(b"%PDF-1.4 mock content")
        temp_path = os.path.normpath(tmp.name)

    try:
        headers = get_auth_header(role="Admin")
        payload = {
            "absolute_path": temp_path,
            "relative_path": "temp/test.pdf",
            "filename": "test.pdf"
        }
        
        # 1. Registrar por primera vez
        response = client.post("/documents/index-external", json=payload, headers=headers)
        assert response.status_code == 201
        data = response.json()
        assert data["filename"] == "test.pdf"
        assert data["storage_type"] == "external"
        assert data["absolute_path"] == temp_path
        assert data["relative_path"] == "temp/test.pdf"
        assert data["status"] == "processing"

        # 2. Intentar registrar de nuevo (duplicado)
        response_dup = client.post("/documents/index-external", json=payload, headers=headers)
        assert response_dup.status_code == 409
        assert "ya está registrado" in response_dup.json()["detail"]

    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)
