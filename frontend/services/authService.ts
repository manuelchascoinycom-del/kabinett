import { fetchApi } from './apiClient';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

function parseApiErrorMessage(err: unknown): string | null {
  if (!(err instanceof Error)) return null;

  const marker = ': ';
  const idx = err.message.indexOf(marker);
  if (idx < 0) return err.message;

  const rawBody = err.message.slice(idx + marker.length).trim();
  if (!rawBody) return err.message;

  if (rawBody.startsWith('{') || rawBody.startsWith('[')) {
    try {
      const parsed = JSON.parse(rawBody) as { detail?: string };
      if (typeof parsed?.detail === 'string' && parsed.detail.trim()) {
        return parsed.detail;
      }
    } catch {
      return rawBody;
    }
  }

  return rawBody;
}

export const authService = {
  login: async (payload: LoginRequest): Promise<LoginResponse> => {
    try {
      return await fetchApi<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    } catch (err) {
      const message = parseApiErrorMessage(err);
      throw new Error(message || 'Error');
    }
  },
};

