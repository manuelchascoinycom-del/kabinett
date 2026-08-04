// services/userService.ts
import { fetchApi } from './apiClient';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'Admin' | 'Editor' | 'Viewer';
  is_active: bool;
  created_at: string;
}

export interface UserListResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  role: string;
}

export interface UpdateUserPayload {
  name?: string;
  email?: string;
  role?: string;
  password?: string;
}

export const userService = {
  getUsers: async (params?: { page?: number; limit?: number; search?: string; role?: string; is_active?: boolean }): Promise<UserListResponse> => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.search) query.append('search', params.search);
    if (params?.role) query.append('role', params.role);
    if (params?.is_active !== undefined) query.append('is_active', params.is_active.toString());

    const queryString = query.toString() ? `?${query.toString()}` : '';
    return fetchApi<UserListResponse>(`/admin/users${queryString}`);
  },

  createUser: async (payload: CreateUserPayload): Promise<User> => {
    return fetchApi<User>('/admin/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateUser: async (id: string, payload: UpdateUserPayload): Promise<User> => {
    return fetchApi<User>(`/admin/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  toggleUserStatus: async (id: string, isActive: boolean): Promise<User> => {
    return fetchApi<User>(`/admin/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active: isActive }),
    });
  },
};