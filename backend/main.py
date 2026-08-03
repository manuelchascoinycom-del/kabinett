import os
from dotenv import load_dotenv
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from database import engine
import models

# Importar routers
from routes import documents, collections, custom_fields, tags, search
from dependencies import security_scheme, get_current_user

load_dotenv()

models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Kabinett API",
    version="1.0.0",
    dependencies=[Depends(security_scheme), Depends(get_current_user)]
)

origins = ["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:4200"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 1. Incluir routers
app.include_router(documents.router)
app.include_router(collections.router)
app.include_router(custom_fields.router)
app.include_router(tags.router)
app.include_router(search.router)


# 2. Generador de OpenAPI para forzar el botón Authorize y candados en Swagger
def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema

    openapi_schema = get_openapi(
        title=app.title,
        version="1.0.0",
        description="Kabinett API con Autenticación JWT",
        routes=app.routes,
    )

    # Asegura la clave 'components' y define HTTPBearer
    components = openapi_schema.setdefault("components", {})
    components["securitySchemes"] = {
        "HTTPBearer": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
        }
    }

    # Aplica la seguridad globalmente a la documentación
    openapi_schema["security"] = [{"HTTPBearer": []}]

    app.openapi_schema = openapi_schema
    return app.openapi_schema


app.openapi = custom_openapi