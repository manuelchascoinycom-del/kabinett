import pytest
from fastapi.testclient import TestClient
from main import app
from security import create_access_token

client = TestClient(app)

# UUID de prueba válido
TEST_UUID = "123e4567-e89b-12d3-a456-426614174000"

def get_auth_header(role: str, user_id: str = "user_test"):
    token = create_access_token(data={"sub": user_id, "role": role})
    return {"Authorization": f"Bearer {token}"}

# --- PRUEBAS DE ACCESO POR ROL (RBAC) ---

def test_viewer_cannot_delete_document():
    headers = get_auth_header(role="Viewer")
    response = client.delete(f"/documents/{TEST_UUID}", headers=headers)
    assert response.status_code == 403
    assert response.json()["detail"] == "Operation not permitted for your role"

def test_viewer_cannot_upload_document():
    headers = get_auth_header(role="Viewer")
    response = client.post("/documents/upload-pdf", headers=headers)
    assert response.status_code == 403

def test_editor_cannot_delete_document():
    headers = get_auth_header(role="Editor")
    response = client.delete(f"/documents/{TEST_UUID}", headers=headers)
    assert response.status_code == 403

def test_admin_can_access_delete_endpoint():
    headers = get_auth_header(role="Admin")
    response = client.delete(f"/documents/{TEST_UUID}", headers=headers)
    # Admin SÍ supera la barrera de RBAC (devolverá 404 Not Found porque el doc no existe en BD, pero NO un 403)
    assert response.status_code != 403