import os
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine
import models

# Importar routers
from routes import documents, collections, custom_fields, tags, search

load_dotenv()

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Kabinett API")

origins = ["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:4200"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir los routers modularizados
app.include_router(documents.router)
app.include_router(collections.router)
app.include_router(custom_fields.router)
app.include_router(tags.router)
app.include_router(search.router)