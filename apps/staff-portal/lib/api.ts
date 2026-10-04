import { ApiClient } from '@oralai/shared';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

export const apiClient = new ApiClient({
  baseUrl: API_BASE_URL || '/api',
});

export async function api<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  // If API_BASE_URL is not set, route through Next.js proxy /api to preserve Same-Origin cookies
  const path = cleanEndpoint.startsWith('/api') ? cleanEndpoint : `/api${cleanEndpoint}`;
  const url = API_BASE_URL ? `${API_BASE_URL}${cleanEndpoint}` : path;

  const isFormData = typeof FormData !== 'undefined' && options?.body instanceof FormData;

  const res = await fetch(url, {
    ...options,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...options?.headers,
    },
    credentials: 'include',
  });
  if (!res.ok) {
    let errMsg = `API call failed: ${res.statusText}`;
    try {
      const errJson = await res.json();
      errMsg = errJson.message || errJson.detail || errJson.error?.message || errMsg;
    } catch {
      // ignore
    }
    throw new Error(errMsg);
  }
  return res.json();
}
