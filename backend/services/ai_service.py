import os
import json
from google import genai
from google.genai import types
from pydantic import BaseModel, Field

# Definimos el esquema Pydantic para Structured Output de Gemini
class MetadataSuggestionSchema(BaseModel):
    title: str = Field(description="Título de la obra musical o documento")
    composer: str = Field(description="Nombre del compositor o autor principal")
    tags: list[str] = Field(description="Array de 3 a 5 etiquetas descriptivas (ej: Pianístico, Barroco, Partitura)")

def analyze_document_metadata(raw_text: str) -> dict:
    if not raw_text or not raw_text.strip():
        return {
            "title": "Documento sin título",
            "composer": "Desconocido",
            "tags": ["Sin OCR"]
        }

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("⚠️ GEMINI_API_KEY no encontrada en las variables de entorno.")
        return {
            "title": "Documento procesado",
            "composer": "Desconocido",
            "tags": ["Error API Key"]
        }

    client = genai.Client(api_key=api_key)

    prompt = f"""
    Eres un musicólogo y archivero experto en catalogar documentos y partituras musicales.
    Analiza el siguiente texto extraído mediante OCR de una partitura/documento y extrae la información requerida:

    TEXTO EXTRAÍDO:
    \"\"\"{raw_text[:3000]}\"\"\"
    """

    try:
        # ⚡ 1. Cambiado a 'gemini-1.5-flash' (o 'gemini-2.0-flash')
        response = client.models.generate_content(
            model='gemini-2.5-flash', 
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=MetadataSuggestionSchema,
                temperature=0.2,
            ),
        )

        # ⚡ 2. Si usas Pydantic Structured Output, 'parsed' devuelve el objeto formateado
        if hasattr(response, 'parsed') and response.parsed:
            return response.parsed.model_dump()
            
        return json.loads(response.text)

    except Exception as e:
        # Imprime el error detallado en la consola del backend de FastAPI
        print(f"❌ Error REAL al consultar Gemini: {type(e).__name__} - {e}")
        return {
            "title": "Documento procesado",
            "composer": "Desconocido",
            "tags": ["Pendiente de revisión"]
        }