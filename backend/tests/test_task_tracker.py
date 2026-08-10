import pytest
from fastapi.testclient import TestClient
from main import app
from security import create_access_token
from services.task_tracker import task_tracker

def test_task_tracker_logic():
    # Asegurar que está limpio
    task_tracker.delete_task("test_task_123")
    
    # 1. Crear tarea
    task = task_tracker.create_task("test_task_123", total_items=10, status="processing")
    assert task["status"] == "processing"
    assert task["total_items"] == 10
    assert task["processed_items"] == 0
    assert task["percentage"] == 0.0
    assert task["errors"] == []

    # 2. Recuperar tarea
    retrieved = task_tracker.get_task("test_task_123")
    assert retrieved == task

    # 3. Actualizar progreso (porcentaje se calcula solo)
    updated = task_tracker.update_task("test_task_123", processed_items=5)
    assert updated["processed_items"] == 5
    assert updated["percentage"] == 50.0

    # 4. Actualizar estado y errores
    updated = task_tracker.update_task(
        "test_task_123", 
        status="completed", 
        processed_items=10, 
        add_errors=["Error 1"]
    )
    assert updated["status"] == "completed"
    assert updated["processed_items"] == 10
    assert updated["percentage"] == 100.0
    assert updated["errors"] == ["Error 1"]

    # 5. Eliminar tarea
    deleted = task_tracker.delete_task("test_task_123")
    assert deleted is True
    assert task_tracker.get_task("test_task_123") is None


def test_endpoint_ingest_status_404():
    client = TestClient(app)
    token = create_access_token(data={"sub": "user_test", "role": "Admin"})
    headers = {"Authorization": f"Bearer {token}"}

    response = client.get("/documents/ingest-status/nonexistent_task_id", headers=headers)
    assert response.status_code == 404
    assert "No se encontró ninguna tarea" in response.json()["detail"]


def test_endpoint_ingest_status_success():
    # Registrar la tarea en el tracker antes de consultarla
    task_id = "test_task_456"
    task_tracker.create_task(task_id, total_items=5, status="processing")
    task_tracker.update_task(task_id, processed_items=2, add_errors=["Warn"])

    client = TestClient(app)
    token = create_access_token(data={"sub": "user_test", "role": "Admin"})
    headers = {"Authorization": f"Bearer {token}"}

    response = client.get(f"/documents/ingest-status/{task_id}", headers=headers)
    assert response.status_code == 200
    
    data = response.json()
    assert data["status"] == "processing"
    assert data["total_items"] == 5
    assert data["processed_items"] == 2
    assert data["percentage"] == 40.0
    assert data["errors"] == ["Warn"]

    # Limpiar
    task_tracker.delete_task(task_id)
