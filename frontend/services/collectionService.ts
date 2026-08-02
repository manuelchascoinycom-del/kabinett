// services/collectionService.ts
import { fetchApi } from './apiClient';

export interface Collection {
  id: string;
  name: string;
  document_count: number;
  document_ids?: string[];
}

export const collectionService = {
  getAll: async (): Promise<Collection[]> => {
    return fetchApi<Collection[]>('/collections');
  },

  removeDocument: async (collectionId: string, documentId: string): Promise<void> => {
    return fetchApi<void>(`/collections/${collectionId}/documents/${documentId}`, {
      method: 'DELETE',
    });
  },

  create: async (name: string): Promise<Collection> => {
    return fetchApi<Collection>('/collections', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  },

  addDocument: async (collectionId: string, documentId: string): Promise<void> => {
    return fetchApi<void>(`/collections/${collectionId}/documents`, {
      method: 'POST',
      body: JSON.stringify({ document_id: documentId }),
    });
  },

  delete: async (collectionId: string): Promise<void> => {
    return fetchApi<void>(`/collections/${collectionId}`, {
      method: 'DELETE',
    });
  },
};