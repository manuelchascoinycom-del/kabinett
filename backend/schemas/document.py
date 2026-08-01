import uuid
from typing import Optional, Any
from pydantic import BaseModel

class ConfirmMetadataSchema(BaseModel):
    title: str
    composer: str
    tags: list[str]
    custom_metadata: Optional[dict[str, Any]] = {}

class DocumentStatusResponse(BaseModel):
    id: uuid.UUID
    status: str
    metadata_suggested: Optional[dict] = None
    metadata_confirmed: Optional[dict] = None
    custom_metadata: Optional[dict] = None
    error_message: Optional[str] = None

    class Config:
        from_attributes = True