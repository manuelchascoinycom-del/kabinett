import uuid
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from main import app
from security import create_access_token
from services import batch_ai_processor


class _Query:
    def filter(self, *_args):
        return self

    def first(self):
        return self.document

    def __init__(self, document):
        self.document = document


class _Database:
    def __init__(self, document):
        self.document = document

    def query(self, *_args):
        return _Query(self.document)

    def commit(self):
        pass

    def rollback(self):
        pass

    def close(self):
        pass


def test_batch_websocket_requires_token():
    client = TestClient(app)

    try:
        with client.websocket_connect(f"/ws/batch-processing/{uuid.uuid4()}"):
            raise AssertionError("Una conexión sin token no debe aceptarse")
    except WebSocketDisconnect as exc:
        assert exc.code == 1008


def test_batch_websocket_accepts_valid_token():
    client = TestClient(app)
    token = create_access_token({"sub": "user-1", "role": "Viewer"})

    with client.websocket_connect(
        f"/ws/batch-processing/{uuid.uuid4()}?token={token}"
    ) as websocket:
        assert websocket is not None


@pytest.mark.asyncio
async def test_batch_websocket_receives_mocked_batch_events(monkeypatch):
    collection_id = uuid.uuid4()
    document_id = uuid.uuid4()
    document = SimpleNamespace(
        absolute_path="document.pdf",
        storage_path=None,
        metadata_suggested=None,
        status=None,
    )
    token = create_access_token({"sub": "user-1", "role": "Viewer"})

    monkeypatch.setattr(batch_ai_processor, "SessionLocal", lambda: _Database(document))
    monkeypatch.setattr(
        batch_ai_processor,
        "extract_text_from_first_pages",
        lambda _path: "mocked text",
    )
    monkeypatch.setattr(
        batch_ai_processor,
        "analyze_document_metadata",
        lambda _text: {"title": "Mocked document"},
    )
    monkeypatch.setattr(batch_ai_processor.time, "sleep", lambda _seconds: None)

    client = TestClient(app)
    with client.websocket_connect(
        f"/ws/batch-processing/{collection_id}?token={token}"
    ) as websocket:
        await batch_ai_processor.process_batch_ai([document_id], collection_id)

        events = [websocket.receive_json() for _ in range(3)]

    assert [event["event"] for event in events] == [
        "batch_started",
        "receive_progress",
        "batch_completed",
    ]
    assert events[0] == {
        "event": "batch_started",
        "collection_id": str(collection_id),
        "total": 1,
        "processed": 0,
    }
    assert events[1]["document_id"] == str(document_id)
    assert events[1]["processed"] == 1
    assert events[1]["total"] == 1
    assert events[1]["status"] == "completed"
    assert events[2]["processed"] == 1
    assert events[2]["errors"] == 0
    assert events[2]["status"] == "completed"