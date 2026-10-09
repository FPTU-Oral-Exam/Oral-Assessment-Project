/**
 * Core HTTP Client cho Staff Portal
 * - Cookie HTTP-only tự động (credentials: 'include')
 * - Tự động nhận diện FormData (upload audio/PDF)
 * - Bắt lỗi HTTP theo format chuẩn FastAPI
 * - Auto-redirect 401 về /login
 */

import { ApiError } from '@oralai/shared';

export interface ApiClientOptions {
  /** Base URL của API (VD: '/api' hoặc 'http://localhost:8000/api') */
  baseUrl?: string;
  /** Custom handler cho lỗi 401 (mặc định: redirect về /login) */
  onUnauthorized?: () => void;
}

export class AppApiClient {
  private readonly baseUrl: string;
  private readonly onUnauthorized?: () => void;

  constructor(options: ApiClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? '/api';
    this.onUnauthorized = options.onUnauthorized;
  }

  /**
   * Tạo URL đầy đủ với query params
   */
  private buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
    const url = `${this.baseUrl}${path}`;
    if (!params) return url;

    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        searchParams.set(key, String(value));
      }
    }
    const queryString = searchParams.toString();
    return queryString ? `${url}?${queryString}` : url;
  }

  /**
   * Build headers, tự động bỏ Content-Type cho FormData
   */
  private buildHeaders(init?: RequestInit): Headers {
    const headers = new Headers(init?.headers);
    // FormData cần để browser tự set Content-Type với boundary
    const isFormData = init?.body instanceof FormData;
    if (!isFormData && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    return headers;
  }

  /**
   * Parse error response từ FastAPI backend
   */
  private parseError(response: Response, body: unknown): ApiError {
    // FastAPI có thể trả về:
    // 1. { detail: "message string" }
    // 2. { detail: { code: "ERROR_CODE", message: "message" } }
    // 3. { error: { code: "ERROR_CODE", message: "message" } }
    // 4. { error: "message string" }
    // 5. { message: "message string" }
    const raw = body as Record<string, unknown>;

    let code: string | undefined;
    let message: string;

    // Case 2 & 3: Structured error
    const structuredDetail = raw?.detail && typeof raw.detail === 'object' ? raw.detail as Record<string, unknown> : null;
    const structuredError = raw?.error && typeof raw.error === 'object' ? raw.error as Record<string, unknown> : null;

    if (structuredDetail) {
      code = structuredDetail?.code as string | undefined;
      message = (structuredDetail?.message as string) || JSON.stringify(raw.detail);
    } else if (structuredError) {
      code = structuredError?.code as string | undefined;
      message = (structuredError?.message as string) || JSON.stringify(raw.error);
    } else {
      // Case 1, 4, 5: Simple error
      message =
        (raw?.detail as string) ||
        (raw?.error as string) ||
        (raw?.message as string) ||
        `HTTP ${response.status}: ${response.statusText}`;
    }

    return new ApiError(response.status, message, code);
  }

  /**
   * Core request method
   */
  private async request<T>(
    method: string,
    path: string,
    options?: RequestInit & { params?: Record<string, string | number | boolean | undefined> },
  ): Promise<T> {
    const url = this.buildUrl(path, options?.params);
    const headers = this.buildHeaders(options);

    const response = await fetch(url, {
      method,
      headers,
      credentials: 'include',
      ...options,
    });

    // Handle 401 Unauthorized
    if (response.status === 401) {
      if (this.onUnauthorized) {
        this.onUnauthorized();
      } else if (typeof window !== 'undefined') {
        window.location.href = `/login?from=${encodeURIComponent(window.location.pathname)}`;
      }
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    // Parse response body
    let body: unknown = {};
    try {
      body = await response.json();
    } catch {
      // Empty body or non-JSON
    }

    // Handle errors
    if (!response.ok) {
      const error = this.parseError(response, body);
      throw error;
    }

    return body as T;
  }

  /**
   * GET request
   */
  async get<T>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
    return this.request<T>('GET', path, { params });
  }

  /**
   * POST request với JSON body
   */
  async post<T>(path: string, data?: unknown): Promise<T> {
    return this.request<T>('POST', path, {
      body: data !== undefined ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * POST request với FormData (file upload)
   */
  async postForm<T>(path: string, formData: FormData): Promise<T> {
    return this.request<T>('POST', path, {
      body: formData,
    });
  }

  /**
   * PUT request
   */
  async put<T>(path: string, data?: unknown): Promise<T> {
    return this.request<T>('PUT', path, {
      body: data !== undefined ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PATCH request
   */
  async patch<T>(path: string, data?: unknown): Promise<T> {
    return this.request<T>('PATCH', path, {
      body: data !== undefined ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path);
  }

  /**
   * GET request trả về Blob (file download)
   */
  async getBlob(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<Blob> {
    const url = this.buildUrl(path, params);
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
    });

    if (response.status === 401) {
      if (this.onUnauthorized) {
        this.onUnauthorized();
      } else if (typeof window !== 'undefined') {
        window.location.href = `/login?from=${encodeURIComponent(window.location.pathname)}`;
      }
    }

    if (!response.ok) {
      let body: unknown = {};
      try { body = await response.json(); } catch { /* ignore */ }
      throw this.parseError(response, body);
    }

    return response.blob();
  }
}

/**
 * Singleton instance cho toàn bộ app
 */
export const apiClient = new AppApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL || '/api',
});

/**
 * Re-export ApiError để tiện sử dụng
 */
export { ApiError };
