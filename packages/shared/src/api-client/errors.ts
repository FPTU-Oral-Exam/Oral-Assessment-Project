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
    const err = (body as any)?.error || (body as any)?.detail;
    const code = typeof err === "object" ? err?.code : undefined;
    const message = typeof err === "object" ? err?.message : (typeof err === "string" ? err : ((body as any)?.message || "Request failed"));
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
