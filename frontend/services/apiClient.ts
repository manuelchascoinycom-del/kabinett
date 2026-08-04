// services/apiClient.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const isFormData = options?.body instanceof FormData;

  // 1. Obtener token de localStorage si estamos en el cliente (navegador)
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  // 2. Encabezados por defecto (añadimos Authorization si existe token)
  const defaultHeaders: HeadersInit = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options?.headers,
    },
  };

  const response = await fetch(url, config);

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(
      `Error API [${response.status}] ${response.statusText}: ${errorBody}`
    );
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}