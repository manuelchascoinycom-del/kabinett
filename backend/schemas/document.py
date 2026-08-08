import uuid
from typing import Optional, Any, List, Dict
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

class FilterPayloadSchema(BaseModel):
    query: Optional[str] = ""
    search: Optional[str] = ""
    collection_id: Optional[str] = None
    collection_ids: Optional[List[str]] = []
    composers: Optional[List[str]] = []
    tags: Optional[List[str]] = []
    custom_filters: Optional[Dict[str, Any]] = {}
    custom_fields: Optional[Dict[str, Any]] = {}
    page: Optional[int] = 1
    limit: Optional[int] = 20