import os
import tempfile
from pathlib import Path
import pytest
from fastapi import HTTPException
from services.document_service import scan_directory_dry_run

def test_scan_directory_non_existent():
    with pytest.raises(HTTPException) as exc_info:
        scan_directory_dry_run("C:/path/to/nonexistent/directory_12345")
    assert exc_info.value.status_code == 404
    assert "no existe" in exc_info.value.detail

def test_scan_directory_is_file():
    with tempfile.NamedTemporaryFile(delete=False) as tmp:
        temp_file_path = tmp.name
    
    try:
        with pytest.raises(HTTPException) as exc_info:
            scan_directory_dry_run(temp_file_path)
        assert exc_info.value.status_code == 400
        assert "es un archivo" in exc_info.value.detail
    finally:
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)

def test_scan_directory_success():
    # Crear una estructura temporal de prueba
    # root/
    #   file1.pdf (10 bytes)
    #   file2.txt (ignore)
    #   .hidden_file.pdf (ignore)
    #   .hidden_dir/
    #     file3.pdf (ignore)
    #   subdir/
    #     file4.PDF (20 bytes)
    #     subsubdir/
    #       file5.pdf (30 bytes)
    with tempfile.TemporaryDirectory() as tmpdir:
        root_path = Path(tmpdir)
        
        # Crear files
        file1 = root_path / "file1.pdf"
        file1.write_bytes(b"1234567890")
        
        file2 = root_path / "file2.txt"
        file2.write_bytes(b"hello world")
        
        hidden_file = root_path / ".hidden_file.pdf"
        hidden_file.write_bytes(b"hidden")
        
        hidden_dir = root_path / ".hidden_dir"
        hidden_dir.mkdir()
        file3 = hidden_dir / "file3.pdf"
        file3.write_bytes(b"hidden_dir_pdf")
        
        subdir = root_path / "subdir"
        subdir.mkdir()
        file4 = subdir / "file4.PDF"
        file4.write_bytes(b"12345678901234567890")
        
        subsubdir = subdir / "subsubdir"
        subsubdir.mkdir()
        file5 = subsubdir / "file5.pdf"
        file5.write_bytes(b"123456789012345678901234567890")
        
        # Ejecutar escaneo
        result = scan_directory_dry_run(root_path)
        
        # Validar estructura y acumuladores
        assert result["name"] == root_path.name
        assert result["total_folders"] == 2  # subdir, subsubdir
        assert result["total_files"] == 3    # file1.pdf, file4.PDF, file5.pdf
        assert result["total_size"] == 60    # 10 + 20 + 30
        
        # Comprobar ficheros en raíz
        root_files = {f["name"]: f for f in result["files"]}
        assert "file1.pdf" in root_files
        assert root_files["file1.pdf"]["size"] == 10
        assert "file2.txt" not in root_files
        assert ".hidden_file.pdf" not in root_files
        
        # Comprobar subcarpetas
        subfolders = {s["name"]: s for s in result["subfolders"]}
        assert ".hidden_dir" not in subfolders
        assert "subdir" in subfolders
        
        subdir_node = subfolders["subdir"]
        assert subdir_node["total_folders"] == 1  # subsubdir
        assert subdir_node["total_files"] == 2    # file4.PDF, file5.pdf
        assert subdir_node["total_size"] == 50    # 20 + 30
        
        subdir_files = {f["name"]: f for f in subdir_node["files"]}
        assert "file4.PDF" in subdir_files
        assert subdir_files["file4.PDF"]["size"] == 20
        
        subsubdir_node = subdir_node["subfolders"][0]
        assert subsubdir_node["name"] == "subsubdir"
        assert subsubdir_node["total_folders"] == 0
        assert subsubdir_node["total_files"] == 1
        assert subsubdir_node["total_size"] == 30
        assert subsubdir_node["files"][0]["name"] == "file5.pdf"


def test_endpoint_scan_dry_run_non_existent():
    from fastapi.testclient import TestClient
    from main import app
    from security import create_access_token

    client = TestClient(app)
    token = create_access_token(data={"sub": "user_test", "role": "Admin"})
    headers = {"Authorization": f"Bearer {token}"}

    payload = {"path": "C:/path/to/nonexistent/directory_12345"}
    response = client.post("/documents/scan-dry-run", json=payload, headers=headers)
    assert response.status_code == 404
    assert "no existe" in response.json()["detail"]


def test_endpoint_scan_dry_run_success():
    from fastapi.testclient import TestClient
    from main import app
    from security import create_access_token

    client = TestClient(app)
    token = create_access_token(data={"sub": "user_test", "role": "Admin"})
    headers = {"Authorization": f"Bearer {token}"}

    with tempfile.TemporaryDirectory() as tmpdir:
        root_path = Path(tmpdir)
        file1 = root_path / "file1.pdf"
        file1.write_bytes(b"1234567890")

        payload = {"path": str(root_path)}
        response = client.post("/documents/scan-dry-run", json=payload, headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["name"] == root_path.name
        assert data["total_folders"] == 0
        assert data["total_files"] == 1
        assert data["total_size"] == 10
        assert data["files"][0]["name"] == "file1.pdf"
