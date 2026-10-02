import { ApiError } from "./errors";

export interface ApiClientOptions {
  baseUrl: string;
  getToken?: () => string | undefined;
  onAuthError?: (error: ApiError) => void;
}

export class ApiClient {
  private readonly baseUrl: string;
  private readonly getToken: () => string | undefined;
  private readonly onAuthError?: (error: ApiError) => void;
  private refreshing: Promise<Response> | null = null;

  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl;
    this.getToken = options.getToken ?? (() => undefined);
    this.onAuthError = options.onAuthError;
  }

  private getHeaders(init?: RequestInit): Headers {
    const headers = new Headers(init?.headers);
    if (init?.body && typeof init.body === "string" && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    return headers;
  }

  private async request<T>(
    method: string,
    path: string,
    options?: RequestInit & { skipAuthRefresh?: boolean },
  ): Promise<T> {
    const headers = this.getHeaders(options);

    const token = this.getToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      credentials: "include",
      ...options,
    });

    if (response.status === 401 && !options?.skipAuthRefresh && this.refreshing === null) {
      this.refreshing = fetch(`${this.baseUrl}/api/auth/refresh`, {
        method: "POST",
        credentials: "include",
      }).finally(() => {
        this.refreshing = null;
      });

      if ((await this.refreshing).ok) {
        return this.request<T>(method, path, { ...options, skipAuthRefresh: true });
      }
    }

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const error = ApiError.fromResponse(response, body);

      if (error.isAuthError() && this.onAuthError) {
        this.onAuthError(error);
      }

      throw error;
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  async get<T>(path: string, options?: RequestInit): Promise<T> {
    return this.request<T>("GET", path, options);
  }

  async post<T>(path: string, body?: unknown, options?: RequestInit): Promise<T> {
    return this.request<T>("POST", path, {
      ...options,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(path: string, body?: unknown, options?: RequestInit): Promise<T> {
    return this.request<T>("PUT", path, {
      ...options,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  async patch<T>(path: string, body?: unknown, options?: RequestInit): Promise<T> {
    return this.request<T>("PATCH", path, {
      ...options,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(path: string, options?: RequestInit): Promise<T> {
    return this.request<T>("DELETE", path, options);
  }
}
