import uuid

from fastapi.testclient import TestClient

from main import app
from security import create_access_token


def test_batch_websocket_requires_token():
    client = TestClient(app)

    try:
        with client.websocket_connect(f"/ws/batch-processing/{uuid.uuid4()}"):
            raise AssertionError("Una conexión sin token no debe aceptarse")
    except Exception as exc:
        assert exc.code == 1008


def test_batch_websocket_accepts_valid_token():
    client = TestClient(app)
    token = create_access_token({"sub": "user-1", "role": "Viewer"})

    with client.websocket_connect(
        f"/ws/batch-processing/{uuid.uuid4()}?token={token}"
    ) as websocket:
        assert websocket is not None