import uuid

import pytest

from services.document_service import get_collection_ids_recursive


class _ScalarResult:
    def __init__(self, values):
        self.values = values

    def all(self):
        return self.values


class _Database:
    def __init__(self, children):
        self.children = children

    async def scalars(self, statement):
        parent_id = statement.compile().params["parent_id_1"]
        return _ScalarResult(self.children.get(parent_id, []))


@pytest.mark.asyncio
async def test_get_collection_ids_recursive_returns_uuid_values():
    root_id = uuid.uuid4()
    child_id = uuid.uuid4()
    grandchild_id = uuid.uuid4()
    db = _Database({root_id: [child_id], child_id: [grandchild_id]})

    result = await get_collection_ids_recursive(db, root_id)

    assert result == [root_id, child_id, grandchild_id]