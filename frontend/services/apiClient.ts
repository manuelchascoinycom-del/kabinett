// services/apiClient.ts
import { APP_TEXTS } from '@/app/constants/texts';

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

  // 3. Interceptor de sesión expirada o token inválido (REQ-015)
  if (response.status === 401) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      document.cookie = "auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      
      // Evitar bucle si la petición fallida ya venía de /login
      if (!window.location.pathname.startsWith('/login')) {
        const currentPath = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/login?callbackUrl=${currentPath}`;
      }
    }
    throw new Error(APP_TEXTS.auth.sessionExpired);
  }

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