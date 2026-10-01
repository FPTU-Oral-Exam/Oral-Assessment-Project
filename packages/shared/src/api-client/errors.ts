export class ApiError extends Error {
  constructor(
    public status: number,
    public message: string,
    public code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }

  static fromResponse(response: Response, body: unknown): ApiError {
    const detail = (body as { detail?: { code?: string; message?: string } } | undefined)?.detail;
    const code = typeof detail === "object" ? detail?.code : undefined;
    const message = typeof detail === "object" ? detail?.message : (body as { detail?: string })?.detail || "Unknown error";
    return new ApiError(response.status, message || "Request failed", code);
  }

  isAuthError(): boolean {
    return this.status === 401 || this.code === "AUTH_TOKEN_EXPIRED" || this.code === "AUTH_TOKEN_INVALID";
  }

  isForbidden(): boolean {
    return this.status === 403 || this.code === "AUTH_FORBIDDEN";
  }

  isNotFound(): boolean {
    return this.status === 404;
  }

  isServerError(): boolean {
    return this.status >= 500;
  }
}

export interface ApiResponse<T> {
  data: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
}
