// services/apiClient.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const isFormData = options?.body instanceof FormData;

  // Solo añadimos Content-Type: application/json si NO es FormData
  const defaultHeaders: HeadersInit = isFormData
    ? {}
    : { 'Content-Type': 'application/json' };

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