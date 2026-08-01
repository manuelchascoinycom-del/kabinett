// services/tagService.ts
import { fetchApi } from './apiClient';

export interface Tag {
  id?: string;
  name: string;
  color?: string;
}

export const tagService = {
  // Obtener todas las etiquetas globales
  getAll: async (): Promise<Tag[] | string[]> => {
    return fetchApi<Tag[] | string[]>('/tags');
  },
};