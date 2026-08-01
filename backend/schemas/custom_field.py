import uuid
from pydantic import BaseModel, Field
from typing import Literal

class CustomFieldCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    field_type: Literal["text", "number", "select", "boolean"]
    options: list[str] | None = Field(default=None, description="Opciones en caso de ser tipo select")

class CustomFieldResponse(BaseModel):
    id: uuid.UUID
    name: str
    field_type: str
    options: list[str] | None

    class Config:
        from_attributes = True