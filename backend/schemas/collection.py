import uuid
from datetime import datetime
from pydantic import BaseModel, Field

class CollectionCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Nombre de la colección")
    description: str | None = Field(None, description="Descripción opcional")

class CollectionResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None
    created_at: datetime
    document_count: int = 0

    class Config:
        from_attributes = True

class AssignDocumentSchema(BaseModel):
    document_id: uuid.UUID