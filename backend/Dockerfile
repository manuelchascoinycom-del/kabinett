# 1. Imagen base de Python ligera
FROM python:3.11-slim

# 2. Directorio de trabajo
WORKDIR /app

# 3. Instalar dependencias del sistema necesarias
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

# 4. Copiar e instalar dependencias de Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 5. Copiar el resto del código del backend
COPY . .

# 6. Exponer el puerto de FastAPI
EXPOSE 8000

# 7. Comando para iniciar la aplicación (ajusta "main:app" según tu estructura real)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]