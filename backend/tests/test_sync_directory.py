import os
import tempfile
from pathlib import Path
import pytest
from database import SessionLocal
import models
from services.document_service import sync_directory_service

def cleanup_sync(db):
    db.rollback()
    docs = db.query(models.Document).filter(
        models.Document.filename.in_(["sync_doc1.pdf", "sync_doc2.pdf", "sync_doc3.pdf", "sync_doc4.pdf"])
    ).all()
    for doc in docs:
        db.delete(doc)
        
    cols = db.query(models.Collection).filter(
        models.Collection.name.in_(["sync_folder_a", "sync_folder_b"])
    ).all()
    for col in cols:
        db.delete(col)
        
    db.commit()

@pytest.fixture(name="db_session")
def fixture_db_session():
    db = SessionLocal()
    cleanup_sync(db)
    try:
        yield db
    finally:
        cleanup_sync(db)
        db.close()


def test_sync_directory_service_flow(db_session):
    # Creamos un directorio temporal con:
    # root/
    #   sync_doc1.pdf
    #   sync_folder_a/
    #     sync_doc2.pdf
    with tempfile.TemporaryDirectory() as tmpdir:
        root_path = Path(tmpdir)
        
        # 1. Crear archivos físicos iniciales
        doc1 = root_path / "sync_doc1.pdf"
        doc1.write_bytes(b"%PDF-1.4 initial 1")
        
        folder_a = root_path / "sync_folder_a"
        folder_a.mkdir()
        doc2 = folder_a / "sync_doc2.pdf"
        doc2.write_bytes(b"%PDF-1.4 initial 2")
        
        # Sincronizamos por primera vez -> Debería añadir 2 archivos
        res1 = sync_directory_service(str(root_path), db_session)
        assert res1 == {"added": 2, "removed": 0}
        
        # Validar en base de datos
        docs_db = db_session.query(models.Document).filter(
            models.Document.filename.in_(["sync_doc1.pdf", "sync_doc2.pdf"])
        ).all()
        assert len(docs_db) == 2
        
        # 2. Sincronizar sin cambios -> Debería dar {"added": 0, "removed": 0}
        res2 = sync_directory_service(str(root_path), db_session)
        assert res2 == {"added": 0, "removed": 0}
        
        # 3. Eliminar físicamente sync_doc1.pdf y añadir físicamente sync_doc3.pdf
        doc1.unlink()
        
        doc3 = root_path / "sync_doc3.pdf"
        doc3.write_bytes(b"%PDF-1.4 newly added 3")
        
        # Sincronizamos -> Debería añadir 1 y remover 1
        res3 = sync_directory_service(str(root_path), db_session)
        assert res3 == {"added": 1, "removed": 1}
        
        # Validar en base de datos: sync_doc1.pdf ya no debe existir, sync_doc2 y sync_doc3 sí.
        doc1_db = db_session.query(models.Document).filter(models.Document.filename == "sync_doc1.pdf").first()
        assert doc1_db is None
        
        doc2_db = db_session.query(models.Document).filter(models.Document.filename == "sync_doc2.pdf").first()
        assert doc2_db is not None
        
        doc3_db = db_session.query(models.Document).filter(models.Document.filename == "sync_doc3.pdf").first()
        assert doc3_db is not None
        assert doc3_db.storage_type == models.DocumentStorageType.EXTERNAL
