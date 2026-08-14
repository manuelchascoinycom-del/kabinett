import os
import tempfile
from pathlib import Path
import pytest
from database import SessionLocal
import models
from services.document_service import process_bulk_ingestion

def cleanup(db):
    # Eliminar registros residuales relacionados con la prueba
    db.rollback()
    
    docs = db.query(models.Document).filter(
        models.Document.filename.in_(["doc1.pdf", "doc2.pdf", "doc3.pdf", "doc.pdf"])
    ).all()
    for doc in docs:
        db.delete(doc)
        
    cols = db.query(models.Collection).filter(
        models.Collection.name.in_(["folder_a", "folder_b"])
    ).all()
    for col in cols:
        db.delete(col)
        
    db.commit()

@pytest.fixture(name="db_session")
def fixture_db_session():
    db = SessionLocal()
    # Limpieza inicial
    cleanup(db)
    try:
        yield db
    finally:
        # Limpieza final
        cleanup(db)
        db.close()


def test_process_bulk_ingestion_success(db_session):
    # Crear estructura temporal para la prueba
    # root/
    #   doc1.pdf
    #   folder_a/
    #     doc2.pdf
    #     folder_b/
    #       doc3.pdf
    with tempfile.TemporaryDirectory() as tmpdir:
        root_path = Path(tmpdir)
        
        doc1 = root_path / "doc1.pdf"
        doc1.write_bytes(b"%PDF-1.4 test 1")
        
        folder_a = root_path / "folder_a"
        folder_a.mkdir()
        doc2 = folder_a / "doc2.pdf"
        doc2.write_bytes(b"%PDF-1.4 test 2")
        
        folder_b = folder_a / "folder_b"
        folder_b.mkdir()
        doc3 = folder_b / "doc3.pdf"
        doc3.write_bytes(b"%PDF-1.4 test 3")
        
        # Ejecutar ingesta masiva
        result = process_bulk_ingestion(str(root_path), db_session, batch_size=2)
        
        # Validar el resultado del servicio
        assert result["total_detected"] == 3
        assert result["successful"] == 3
        assert result["failed"] == 0
        assert len(result["errors"]) == 0
        
        # Validar que los documentos se hayan guardado en la base de datos
        docs = db_session.query(models.Document).filter(
            models.Document.filename.in_(["doc1.pdf", "doc2.pdf", "doc3.pdf"])
        ).all()
        assert len(docs) == 3
        
        filenames = {d.filename for d in docs}
        assert "doc1.pdf" in filenames
        assert "doc2.pdf" in filenames
        assert "doc3.pdf" in filenames
        
        # Validar las colecciones creadas
        cols = db_session.query(models.Collection).filter(
            models.Collection.name.in_([root_path.name, "folder_a", "folder_b"])
        ).all()
        assert len(cols) >= 2  # Al menos folder_a y folder_b deben estar
        
        col_names = {c.name for c in cols}
        assert "folder_a" in col_names
        assert "folder_b" in col_names
        
        # Validar jerarquía de colecciones
        col_folder_b = db_session.query(models.Collection).filter(models.Collection.name == "folder_b").first()
        col_folder_a = db_session.query(models.Collection).filter(models.Collection.name == "folder_a").first()
        
        assert col_folder_b.parent_id == col_folder_a.id
        
        # Validar relaciones de documentos con colecciones
        db_doc3 = db_session.query(models.Document).filter(models.Document.filename == "doc3.pdf").first()
        assert len(db_doc3.collections) == 1
        assert db_doc3.collections[0].id == col_folder_b.id


def test_process_bulk_ingestion_duplicate_prevention(db_session):
    with tempfile.TemporaryDirectory() as tmpdir:
        root_path = Path(tmpdir)
        doc = root_path / "doc.pdf"
        doc.write_bytes(b"%PDF-1.4 duplicate")
        
        # Primer registro exitoso
        result1 = process_bulk_ingestion(str(root_path), db_session)
        assert result1["successful"] == 1
        
        # Segundo intento de ingesta masiva (debe ignorar o no duplicar el documento en la BD)
        result2 = process_bulk_ingestion(str(root_path), db_session)
        assert result2["successful"] == 1  # Retorna éxito porque ya existía o lo enlazó
        
        docs = db_session.query(models.Document).filter(
            models.Document.absolute_path == os.path.normpath(str(doc.resolve()))
        ).all()
        assert len(docs) == 1  # Sigue habiendo un único registro en la BD
