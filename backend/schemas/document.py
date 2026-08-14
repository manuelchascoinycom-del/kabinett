from datetime import datetime
import uuid
from typing import Optional, Any, List, Dict
from pydantic import BaseModel

from models import DocumentStorageType # Importar el nuevo Enum


class DocumentBase(BaseModel):
    # Campos que son comunes para la creación y la respuesta
    filename: str
    storage_path: Optional[str] = None
    file_size: Optional[int] = None
    status: str # Usar str para Pydantic, el modelo se encargará de la conversión
    storage_type: DocumentStorageType = DocumentStorageType.UPLOAD # Default
    absolute_path: Optional[str] = None
    relative_path: Optional[str] = None
    raw_text: Optional[str] = None
    error_message: Optional[str] = None
    metadata_suggested: Optional[Dict[str, Any]] = None
    metadata_confirmed: Optional[Dict[str, Any]] = None
    custom_metadata: Optional[Dict[str, Any]] = {}


class DocumentCreate(DocumentBase):
    # Campos específicos para la creación
    pass


class DocumentExternalCreate(BaseModel):
    absolute_path: str
    relative_path: Optional[str] = None
    filename: Optional[str] = None


class DocumentResponse(DocumentBase):
    # Campos específicos para la respuesta
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


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


class ScanRequest(BaseModel):
    path: str


class SyncRequest(BaseModel):
    folder_path: Optional[str] = None
    collection_id: Optional[str] = None


class IngestStatusResponse(BaseModel):
    status: str
    total_items: int
    processed_items: int
    percentage: float
    errors: List[str]
