# Kabinett API Reference

**Versión:** 1.0.0
**Base:** API con Autenticación JWT

## Autenticación
Esta API utiliza autenticación **Bearer JWT**. Todas las rutas (excepto login) requieren incluir el token en el header `Authorization: Bearer <token>`.

---

## 1. Auth (Autenticación)

### Login
- **Endpoint**: `POST /auth/login`
- **Descripción**: Autenticación mediante JSON payload `{username, password}`. Retorna un JWT.

### Get Current User Profile
- **Endpoint**: `GET /auth/me`
- **Descripción**: Retorna la información del perfil del usuario autenticado.

### Change Password
- **Endpoint**: `PUT /auth/change-password`
- **Descripción**: Cambia la contraseña del usuario autenticado.

---

## 2. Documents (Gestión Documental)

### Upload PDF
- **Endpoint**: `POST /documents/upload-pdf`
- **Formato**: `multipart/form-data`

### Index External Document
- **Endpoint**: `POST /documents/index-external`
- **Descripción**: Indexa PDF externo sin copiar archivo ("in-place").

### Scan / Ingesta
- **Dry Run**: `POST /documents/scan-dry-run` (Recursivo, sin cambios en DB).
- **Bulk Ingest**: `POST /documents/bulk-ingest` (Asíncrono).
- **Get Ingest Status**: `GET /documents/ingest-status/{task_id}`
- **Sync Directory**: `POST /documents/sync` (Sincroniza folder_path o collection_id).

### List & Filter
- **List Documents**: `GET /documents`
  - **Params**: `page`, `limit` (default 20), `sort_by` (default "created_at"), `order` (default "desc").
- **Filter Documents**: `POST /documents/filter` (Payload avanzado para filtrado).

### Document Operations
- **Get Status**: `GET /documents/{document_id}/status`
- **Confirm Metadata**: `POST /documents/{document_id}/confirm-metadata`
- **Download/View**:
  - `GET /documents/{document_id}/file`
  - `GET /documents/{document_id}/download`
- **Delete**: `DELETE /documents/{document_id}`

### Manual Processing
- **Generate Metadata (AI)**: `POST /documents/{item_id}/generate-metadata`
- **Normalize Manual**: `POST /documents/{doc_id}/normalize-manual`
  - *Uso*: Reparación bajo demanda de PDFs que fallan en el visor.

---

## 3. Collections (Colecciones)

### Management
- **List/Create**: `GET /collections` (soporta `tree=true`), `POST /collections`
- **Delete**: `DELETE /collections/{collection_id}`

### Documents in Collection
- **Assign**: `POST /collections/{collection_id}/documents`
- **Get List**: `GET /collections/{collection_id}/documents`
- **Remove (Desasignar)**: `DELETE /collections/{collection_id}/documents/{document_id}`
  - *Nota*: Elimina la relación lógica. El documento permanece intacto en disco y tabla maestra.

---

## 4. Custom Fields & Tags

### Custom Fields
- **List/Create**: `GET /custom-fields`, `POST /custom-fields`
- **Delete**: `DELETE /custom-fields/{field_id}`

### Tags
- **List Tags**: `GET /tags`
  - *Uso*: Retorna todas las etiquetas para autocompletado en frontend.

---

## 5. Search (Búsqueda)

### Global Search
- **Endpoint**: `GET /search`
- **Query Params**: `q` (mínimo 3 caracteres).
- **Alcance**: Busca en: `filename`, `raw_text`, `título`, `compositor` y `etiquetas`.

---

## 6. Admin Users

### User Management
- **List**: `GET /admin/users` (Filtros: `search`, `role`, `is_active`).
- **Create**: `POST /admin/users`
- **Update**: `PATCH /admin/users/{user_id}`
- **Toggle Status**: `PATCH /admin/users/{user_id}/status`
  - *Seguridad*: Evita auto-desactivación del Admin actual.