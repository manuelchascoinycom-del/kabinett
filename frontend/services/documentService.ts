// services/documentService.ts
import { fetchApi, fetchBlob } from './apiClient';

export interface BackendDocument {
  id: string;
  filename: string;
  status: string;
  metadata_confirmed?: {
    title?: string;
    composer?: string;
    tags?: string[];
  };
  metadata_suggested?: {
    title?: string;
    composer?: string;
    tags?: string[];
  };
  custom_metadata?: Record<string, any>;
}

export interface DocumentListResponse {
  data: BackendDocument[];
  total: number;
}

export interface FilterPayload {
  query?: string;
  search?: string;
  collection_id?: string | null;
  collection_ids?: string[];
  composers?: string[];
  tags?: string[];
  custom_filters?: Record<string, any>;
  custom_fields?: Record<string, any>;
  page?: number;
  limit?: number;
  sort_by?: string;
  order?: string;

}

export const documentService = {
  getAll: async (page = 1, limit = 20, sort_by = 'created_at', order = 'desc'): Promise<DocumentListResponse> => {
    return fetchApi<DocumentListResponse>(`/documents?page=${page}&limit=${limit}&sort_by=${sort_by}&order=${order}`);
  },

  // Filtrar documentos con paginación
  filter: async (payload: FilterPayload): Promise<DocumentListResponse> => {
    return fetchApi<DocumentListResponse>('/documents/filter', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Subir PDF
  uploadPdf: async (formData: FormData): Promise<any> => {
    return fetchApi<any>('/documents/upload-pdf', {
      method: 'POST',
      body: formData,
    });
  },

  // Obtener estado de procesamiento
  getStatus: async (documentId: string): Promise<any> => {
    return fetchApi<any>(`/documents/${documentId}/status`);
  },

  async bulkIngest(path: string) {
    return fetchApi<any>('/documents/bulk-ingest', { // O la ruta exacta que use tu backend
      method: 'POST',
      body: JSON.stringify({ path }),
    });
  },

  // Obtener estado de la ingesta de una tarea
  getIngestStatus: async (taskId: string): Promise<any> => {
    return fetchApi<any>(`/documents/ingest-status/${taskId}`);
  },

  // Confirmar metadatos
  confirmMetadata: async (documentId: string, payload: any): Promise<any> => {
    return fetchApi<any>(`/documents/${documentId}/confirm-metadata`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Generar metadatos usando IA
  generateMetadata: async (itemId: string): Promise<{ title: string; composer: string; tags: string[] }> => {
    return fetchApi<{ title: string; composer: string; tags: string[] }>(`/documents/${itemId}/generate-metadata`, {
      method: 'POST',
    });
  },


  // Eliminar documento
  deleteDocument: async (documentId: string): Promise<void> => {
    return fetchApi<void>(`/documents/${documentId}`, {
      method: 'DELETE',
    });
  },

  // Descargar PDF
  downloadPdf: async (documentId: string): Promise<Blob> => {
    return fetchBlob(`/documents/${documentId}/download`, {
      method: 'GET',
    });
  },

  // Reparar PDF
  normalizeManual: async (documentId: string): Promise<void> => {
    return fetchApi<void>(`/documents/${documentId}/normalize-manual`, {
      method: 'POST',
    });
  },

  // Sincronizar directorio o colección externa
  syncCollection: async (pathOrId: string): Promise<{ added: number; removed: number }> => {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pathOrId);
    const body = isUuid
      ? { collection_id: pathOrId }
      : { folder_path: pathOrId };

    return fetchApi<{ added: number; removed: number }>('/documents/sync', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
};
