# utils/pdf_utils.py
import fitz

import fitz
import os

import fitz
import os

import fitz
import os

import fitz
import os
import io
from PIL import Image

import fitz
import os
import io
from PIL import Image

import fitz
import os
import io
from PIL import Image

import fitz
import os
import io
from PIL import Image

def force_normalize_pdf(file_path: str) -> bool:
    """
    Fuerza la normalización y reconstrucción de un PDF bajo demanda.
    Convierte las páginas a escala de grises (110 DPI, JPEG calidad 80) 
    y aplica limpieza profunda (garbage=4).
    """
    try:
        doc_fitz = fitz.open(file_path)
        new_doc = fitz.open()
        
        for page in doc_fitz:
            pix = page.get_pixmap(dpi=110)
            img_bytes = pix.tobytes("png")
            
            img = Image.open(io.BytesIO(img_bytes))
            if img.mode != "L":
                img = img.convert("L")
                
            buffer = io.BytesIO()
            img.save(buffer, format="JPEG", quality=80, optimize=True)
            compressed_jpeg = buffer.getvalue()
            
            new_page = new_doc.new_page(width=page.rect.width, height=page.rect.height)
            new_page.insert_image(new_page.rect, stream=compressed_jpeg)
            
        doc_fitz.close()
        
        # Guardado profundo con limpieza de objetos huérfanos
        new_doc.save(
            file_path, 
            garbage=4, 
            deflate=True
        )
        new_doc.close()
        return True
    except Exception as e:
        print(f"🚨 Error en normalización manual de {file_path}: {e}")
        return False