// services/documentService.ts
import { fetchApi, fetchBlob } from './apiClient';

export interface DocumentType {
  id: string;
  title: string;
  composer?: string;
  collection_ids?: string[];
  tags?: string[];
  // Añade aquí el resto de campos de tu documento
}

export interface BackendDocument {
  id: string;
  filename: string;
  status: string;
  metadata_suggested?: {
    title?: string;
    composer?: string;
    tags?: string[];
  };
  metadata_confirmed?: {
    title?: string;
    composer?: string;
    tags?: string[];
  };
  custom_metadata?: Record<string, any>;
}

export interface DocumentFilterPayload {
  search?: string;
  collection_ids?: string[];
  tags?: string[];
  status?: string;
  custom_fields?: Record<string, any>;
  [key: string]: any; // Para permitir otros filtros dinámicos
}

export interface ConfirmMetadataPayload {
  title: string;
  composer: string;
  tags: string[];
  custom_metadata: Record<string, any>;
}

export const documentService = {
  // Obtener todos los documentos
  getAll: async (): Promise<BackendDocument[]> => {
    return fetchApi<BackendDocument[]>('/documents');
  },

  filter: async (payload: DocumentFilterPayload): Promise<BackendDocument[]> => {
    return fetchApi<BackendDocument[]>('/documents/filter', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Filtrar documentos por colección o parámetros
  getByCollection: async (collectionId: string): Promise<DocumentType[]> => {
    return fetchApi<DocumentType[]>(`/collections/${collectionId}/documents`);
  },

  getStatus: async (documentId: string): Promise<BackendDocument> => {
    return fetchApi<BackendDocument>(`/documents/${documentId}/status`);
  },

  confirmMetadata: async (documentId: string, payload: ConfirmMetadataPayload): Promise<BackendDocument> => {
    return fetchApi<BackendDocument>(`/documents/${documentId}/confirm-metadata`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  uploadPdf: async (formData: FormData): Promise<BackendDocument> => {
    return fetchApi<BackendDocument>('/documents/upload-pdf', {
      method: 'POST',
      body: formData,
    });
  },

  // Eliminar un documento
  deleteDocument: async (documentId: string): Promise<void> => {
    return fetchApi<void>(`/documents/${documentId}`, {
      method: 'DELETE',
    });
  },

  // Descargar el binario del PDF
  downloadPdf: async (documentId: string): Promise<Blob> => {
    return fetchBlob(`/documents/${documentId}/download`, {
      method: 'GET',
    });
  },
};