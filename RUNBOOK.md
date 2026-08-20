# Runbook: Document Management System

## Overview
This document provides troubleshooting and operational procedures for the Document Management System (Frontend + Backend + Gemini Integration).

## 1. System Health & Logs
### Check Container Status
`docker-compose ps`

### View Application Logs
- **Frontend**: `docker-compose logs -f frontend`
- **Backend**: `docker-compose logs -f backend`

## 2. Common Troubleshooting
### OCR & PDF Processing Errors
- **Error**: "Unable to get page count".
- **Diagnosis**: Missing system dependencies in the backend container.
- **Fix**: Ensure `poppler-utils` is installed in the Dockerfile. Rebuild with `docker-compose up --build`.

### PDF View Issues / Caching
- **Error**: Normalized documents not showing updates.
- **Diagnosis**: Browser caching.
- **Fix**: We append a timestamp query param to requests. If it persists, force clear browser cache or check if `cache-control` headers are being set correctly in the nginx/proxy layer.

### Gemini AI Integration
- **Error**: AI features not working or "API Key Missing".
- **Diagnosis**: Environment variable mismatch.
- **Fix**: Verify `GEMINI_API_KEY` and `GEMINI_MODEL` are present in the backend `.env` file and correctly passed to the container.

### UI Synchronization Issues
- **Error**: Sidebar counter doesn't match actual document count.
- **Diagnosis**: Stale local state.
- **Fix**: Ensure `fetchDocuments()` is called after `handleDeleteDocument` or successful uploads.

### PDF Streaming (Range Requests)
- **Error**: Large documents fail to stream.
- **Diagnosis**: Backend serving full blobs instead of partial content.
- **Fix**: Ensure the backend handles `Range` headers in the file serving endpoint for authenticated requests.

## 3. Maintenance
### Database
- Connectivity issues: Verify `DB_HOST` and credentials in `.env`.
- Rebuild: `docker-compose up -d --force-recreate`

### Build System
- If `docker build` fails due to cache: `docker-compose build --no-cache`