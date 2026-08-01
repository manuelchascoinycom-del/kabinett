// services/customFieldsService.ts
import { fetchApi } from './apiClient';

export interface CustomField {
  id?: string;
  name: string;
  type: string;
  options?: string[];
  required?: boolean;
}

export interface CreateCustomFieldPayload {
  name: string;
  type: string;
  options?: string[];
  [key: string]: any;
}

export const customFieldsService = {
  // Obtener todos los campos personalizados
  getAll: async (): Promise<CustomField[]> => {
    return fetchApi<CustomField[]>('/custom-fields');
  },

  create: async (payload: CreateCustomFieldPayload): Promise<CustomField> => {
    return fetchApi<CustomField>('/custom-fields', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
};