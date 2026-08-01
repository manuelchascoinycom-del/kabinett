// services/collectionService.ts
import { fetchApi } from './apiClient';

export interface Collection {
  id: string;
  name: string;
  document_count: number;
  document_ids?: string[];
}

export const collectionService = {
  // Obtener todas las colecciones
  getAll: async (): Promise<Collection[]> => {
    return fetchApi<Collection[]>('/collections');
  },

  // Asignar un documento a una colección
  addDocument: async (collectionId: string, documentId: string): Promise<void> => {
    return fetchApi<void>(`/collections/${collectionId}/documents/${documentId}`, {
      method: 'POST',
    });
  },

  // Quitar/Desasignar un documento de una colección
  removeDocument: async (collectionId: string, documentId: string): Promise<void> => {
    return fetchApi<void>(`/collections/${collectionId}/documents/${documentId}`, {
      method: 'DELETE',
    });
  },

  // Crear una nueva colección
  create: async (name: string): Promise<Collection> => {
    return fetchApi<Collection>('/collections', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  },

  // Añadir un documento a una colección
  addDocument: async (collectionId: string, documentId: string): Promise<void> => {
    return fetchApi<void>(`/collections/${collectionId}/documents`, {
      method: 'POST',
      body: JSON.stringify({ document_id: documentId }),
    });
  },
};