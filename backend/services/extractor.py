import os
import fitz  # PyMuPDF
import pytesseract
from pdf2image import convert_from_path

# 1. Configuración dinámica de Tesseract
TESSERACT_CMD = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
if os.path.exists(TESSERACT_CMD):
    pytesseract.pytesseract.tesseract_cmd = TESSERACT_CMD
# Si no existe (estamos en Docker/Linux), pytesseract usará automáticamente 'tesseract' del PATH del sistema.

# 2. Configuración dinámica de Poppler
WIN_POPPLER_PATH = r"C:\poppler-26.02.0\Library\bin"
# Si la ruta de Windows existe la usa, de lo contrario (Docker) será None para que use el PATH de Linux
POPPLER_PATH = WIN_POPPLER_PATH if os.path.exists(WIN_POPPLER_PATH) else None


def extract_text_from_first_pages(pdf_path: str, max_pages: int = 3) -> str:
    """
    Extrae texto de un PDF nativo o mediante OCR.
    Valida previamente que el archivo sea un PDF genuino.
    Lanza excepciones en caso de archivo corrupto o formato no válido.
    """
    # 1. VALIDACIÓN DE MAGIC BYTES (Firma de archivo PDF)
    try:
        with open(pdf_path, "rb") as f:
            header = f.read(5)
            if header != b"%PDF-":
                raise ValueError("El archivo no tiene una estructura PDF válida (posible archivo renombrado o corrupto).")
    except Exception as e:
        raise ValueError(f"Fallo al validar la cabecera del archivo: {str(e)}")

    # 2. APERTURA DEL DOCUMENTO
    try:
        doc = fitz.open(pdf_path)
    except Exception as e:
        raise ValueError(f"PDF corrupto o protegido con contraseña: {str(e)}")

    print(f"Iniciando extracción híbrida para: {os.path.basename(pdf_path)}...")

    # 3. INTENTO DE EXTRAER TEXTO NATIVO
    total_pages = min(len(doc), max_pages)
    native_text_parts = []

    for i in range(total_pages):
        page = doc[i]
        text = page.get_text().strip()
        if text:
            native_text_parts.append(f"--- PÁGINA {i+1} ---\n{text}")

    doc.close()

    # Si hay texto nativo suficiente, lo devolvemos directamente
    full_native_text = "\n\n".join(native_text_parts).strip()
    if full_native_text and len(full_native_text) > 20:
        return full_native_text

    # 4. FALLBACK A OCR (Para PDFs escaneados como imagen)
    print("Detección: PDF escaneado (sin texto nativo). Iniciando OCR...")
    ocr_text_parts = []

    try:
        images = convert_from_path(
            pdf_path,
            first_page=1,
            last_page=max_pages,
            poppler_path=POPPLER_PATH
        )

        for idx, img in enumerate(images):
            print(f"Procesando OCR en página {idx+1}...")
            page_text = pytesseract.image_to_string(img, lang="spa+eng").strip()
            if page_text:
                ocr_text_parts.append(f"--- PÁGINA {idx+1} (OCR) ---\n{page_text}")
            else:
                ocr_text_parts.append(f"--- PÁGINA {idx+1} (OCR) ---\n[Sin texto detectable en la imagen]")

    except Exception as e:
        raise RuntimeError(f"Error crítico durante el proceso de OCR: {str(e)}")

    full_ocr_text = "\n\n".join(ocr_text_parts).strip()
    if not full_ocr_text:
        raise RuntimeError("No se pudo obtener texto ni por lectura nativa ni por OCR.")

    return full_ocr_text