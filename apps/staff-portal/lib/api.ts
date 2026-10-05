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
    if (res.status === 401 && typeof window !== 'undefined') {
      window.location.href = `/login?from=${encodeURIComponent(window.location.pathname)}`;
    }
    let errMsg = `API call failed: ${res.statusText}`;
    try {
      const errJson = await res.json();
      errMsg =
        errJson.error?.message ||
        errJson.detail?.message ||
        errJson.message ||
        (typeof errJson.detail === 'string' ? errJson.detail : null) ||
        (errJson.detail ? JSON.stringify(errJson.detail) : null) ||
        errMsg;
    } catch {
      // ignore
    }
    throw new Error(errMsg);
  }
  return res.json();
}
