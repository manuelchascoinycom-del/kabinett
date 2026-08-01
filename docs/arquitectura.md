# Especificación Técnica de Arquitectura: Kabinett

Este documento define la arquitectura de software, el flujo de datos y las decisiones tecnológicas para el MVP de Kabinett, un Gestor Documental Inteligente.

---

## 1. Stack Tecnológico

El sistema se compone de tres módulos desacoplados bajo una arquitectura cliente-servidor con procesamiento en segundo plano:

* **Frontend:** Angular (Última versión estable). Cliente SPA que gestiona la UI, la carga por drag-and-drop y el visor de PDFs de alta velocidad.
* **Backend (API REST):** FastAPI (Python). Framework asíncrono de alto rendimiento encargado de exponer endpoints REST, coordinar la autenticación, interactuar con la base de datos y disparar tareas asíncronas.
* **Servicio de IA (Agéntico):** CrewAI (Python). Orquestador de agentes autónomos que procesa el texto de los PDFs para clasificar y sugerir metadatos.
* **Base de Datos:** PostgreSQL (compatible con Supabase). Almacenamiento relacional para documentos, etiquetas, colecciones y metadatos dinámicos.
* **Cola de Tareas y Caché:** Redis + Celery. Buffer para gestionar la ingesta asíncrona de archivos y el procesamiento pesado de OCR/Lectura sin bloquear el hilo principal de FastAPI.

---

## 2. Diagrama de Flujo y Comunicación

El flujo de información para la ingesta y catalogación de un PDF sigue la siguiente ruta:

1.  **Carga (Client-to-Server):** El usuario sube un PDF desde Angular (`POST /upload-pdf`).
2.  **Registro rápido:** FastAPI guarda la referencia del archivo en PostgreSQL con estado `"Procesando"` y encola una tarea en **Celery**. FastAPI responde de inmediato al cliente con un `202 Accepted` para no bloquear la interfaz.
3.  **Procesamiento asíncrono (Workers):**
    * **Paso A (Extracción/OCR):** El worker de Celery lee las primeras 3 a 5 páginas usando `PyMuPDF`.
    * **Paso B (Agentes de IA):** Se invoca el flujo de `CrewAI` pasándole el texto extraído. Los agentes analizan la estructura musical, el compositor y proponen etiquetas.
4.  **Persistencia:** El worker actualiza el registro en PostgreSQL con los metadatos sugeridos y cambia el estado del documento a `"Listo para revisión"`.
5.  **Sincronización:** El frontend (Angular) refleja los metadatos propuestos para que el usuario los confirme o edite.

---

## 3. Modelo de Datos Relacional (PostgreSQL)

Para dar soporte a todas las historias de usuario de los Módulos 1, 2, 3 y 4, la base de datos se estructurará con las siguientes entidades principales:

### Entidad: `documents` (Documentos)
* `id`: UUID (Primary Key)
* `filename`: VARCHAR (Nombre original del archivo)
* `storage_path`: VARCHAR (Ruta en el almacenamiento/S3)
* `file_size`: INTEGER (Tamaño en bytes)
* `status`: VARCHAR (Estados: `uploading`, `processing`, `error`, `pending_review`, `ready`)
* `raw_text`: TEXT (Contenido extraído de las primeras páginas para Full-Text Search)
* `metadata_suggested`: JSONB (Metadatos propuestos por CrewAI: título, compositor, tags preliminares)
* `metadata_confirmed`: JSONB (Metadatos finales editados y validados por el usuario)
* `created_at`: TIMESTAMP
* `updated_at`: TIMESTAMP

### Entidad: `collections` (Colecciones Virtuales)
* `id`: UUID (Primary Key)
* `name`: VARCHAR (Nombre de la colección, ej. "Sonatas de piano")
* `description`: TEXT
* `created_at`: TIMESTAMP

### Tabla Intermedia: `document_collections` (Relación Muchos a Muchos)
* `document_id`: UUID (Foreign Key -> `documents.id` con ON DELETE CASCADE)
* `collection_id`: UUID (Foreign Key -> `collections.id` con ON DELETE CASCADE)

### Entidad: `tags` (Etiquetas)
* `id`: UUID (Primary Key)
* `name`: VARCHAR (Nombre único de la etiqueta, ej. "#barroco")

### Tabla Intermedia: `document_tags` (Relación Muchos a Muchos)
* `document_id`: UUID (Foreign Key -> `documents.id`)
* `tag_id`: UUID (Foreign Key -> `tags.id`)

### Entidad: `custom_fields` (Campos Personalizados Dinámicos)
* `id`: UUID (Primary Key)
* `label`: VARCHAR (Nombre del campo, ej. "Dificultad", "Instrumentación")
* `field_type`: VARCHAR (Tipos: `text`, `number`, `select`)
* `options`: JSONB (Opciones predefinidas si el tipo es `select`, ej: `["Fácil", "Medio", "Difícil"]`)

---

## 4. Estrategia de Búsqueda (Full-Text Search)
* Se habilitará un índice de texto completo en la base de datos PostgreSQL utilizando `tsvector` sobre los campos: `filename`, `metadata_confirmed` y `raw_text`.
* Esto permitirá que las búsquedas globales de la API se ejecuten con operadores `@@` en milisegundos, cumpliendo con el tiempo límite de respuesta de 1 segundo de las historias de usuario.