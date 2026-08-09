// services/collectionService.ts
import { fetchApi } from './apiClient';

export interface Collection {
  id: string;
  name: string;
  document_count: number;
  document_ids?: string[];
  parent_id?: string | null;
  children?: Collection[];
}

export const collectionService = {
  getAll: async (): Promise<Collection[]> => {
    return fetchApi<Collection[]>('/collections?tree=true');
  },

  removeDocument: async (collectionId: string, documentId: string): Promise<void> => {
    return fetchApi<void>(`/collections/${collectionId}/documents/${documentId}`, {
      method: 'DELETE',
    });
  },

  // CORRECCIÓN: Añadido parentId opcional para soportar la creación de subcolecciones
  create: async (name: string, parentId?: string | null): Promise<Collection> => {
    return fetchApi<Collection>('/collections', {
      method: 'POST',
      body: JSON.stringify({ 
        name, 
        parent_id: parentId ?? null 
      }),
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