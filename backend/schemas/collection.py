import uuid
from datetime import datetime
from pydantic import BaseModel, Field

class CollectionCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Nombre de la colección")
    description: str | None = Field(None, description="Descripción opcional")
    parent_id: uuid.UUID | None = Field(None, description="ID de la colección padre para jerarquía")


class CollectionResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None
    parent_id: uuid.UUID | None = None
    created_at: datetime
    document_count: int = 0

    class Config:
        from_attributes = True


class CollectionNode(CollectionResponse):
    children: list["CollectionNode"] = []


# Necesario para resolver correctamente los modelos recursivos con forward references en Pydantic v2
CollectionNode.model_rebuild()


class AssignDocumentSchema(BaseModel):
    document_id: uuid.UUID