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

export interface BatchStatus {
  total: number;
  ready: number;
  is_processing: boolean;
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
  update: async (collectionId: string, name: string): Promise<Collection> => {
    return fetchApi<Collection>(`/collections/${collectionId}`, {
      method: 'PUT',
      body: JSON.stringify({ name }),
    });


  },
  generateBatchAI: async (collectionId: string): Promise<{ message: string; queued: number }> => {
    return fetchApi<{ message: string; queued: number }>(`/collections/${collectionId}/generate-batch-ai`, {
      method: 'POST',
    }); 
  },

  getBatchStatus: async (collectionId: string): Promise<BatchStatus> => {
    return fetchApi<BatchStatus>(`/collections/${collectionId}/batch-status`);
  },
  cancelBatchAI: async (collectionId: string): Promise<{ message: string }> => {
    return fetchApi<{ message: string }>(`/collections/${collectionId}/batch-cancel`, {
      method: 'POST',
    });
  },


  moveDocument: async (documentId: string, targetCollectionId: string): Promise<void> => {
    return fetchApi<void>(`/collections/${documentId}/move`, {
      method: 'PUT',
      body: JSON.stringify({ target_collection_id: targetCollectionId }),
    });
  },
};

  
