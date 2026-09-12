import asyncio
import uuid

from services import batch_ai_processor


class _Query:
    def __init__(self, document):
        self.document = document

    def filter(self, *_args):
        return self

    def first(self):
        return self.document


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


class _Events:
    def __init__(self):
        self.messages = []

    def broadcast_from_thread(self, _collection_id, message):
        self.messages.append(message)


def test_process_batch_ai_publishes_progress_and_completion(monkeypatch):
    document_id = uuid.uuid4()
    collection_id = uuid.uuid4()
    document = type("Document", (), {"absolute_path": "document.pdf", "storage_path": None})()
    events = _Events()

    monkeypatch.setattr(batch_ai_processor, "SessionLocal", lambda: _Database(document))
    monkeypatch.setattr(batch_ai_processor, "extract_text_from_first_pages", lambda _path: "text")
    monkeypatch.setattr(batch_ai_processor, "analyze_document_metadata", lambda _text: {})
    monkeypatch.setattr(batch_ai_processor, "connection_manager", events)
    monkeypatch.setattr(batch_ai_processor.time, "sleep", lambda _seconds: None)

    asyncio.run(batch_ai_processor.process_batch_ai([document_id], collection_id))

    assert [message["event"] for message in events.messages] == [
        "batch_started",
        "receive_progress",
        "batch_completed",
    ]
    assert events.messages[1]["processed"] == 1
    assert events.messages[1]["total"] == 1
    assert events.messages[2]["status"] == "completed"