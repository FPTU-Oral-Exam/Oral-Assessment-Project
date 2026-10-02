import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApiClient } from "./client";
import { ApiError } from "./errors";

describe("ApiClient", () => {
  let mockFetch: ReturnType<typeof vi.fn>;
  let client: ApiClient;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch as unknown as typeof fetch;
    client = new ApiClient({ baseUrl: "http://localhost:8000" });
  });

  it("should make GET request", async () => {
    const mockData = { id: "1", name: "Test" };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockData),
    });

    const result = await client.get<typeof mockData>("/test");
    expect(result).toEqual(mockData);
    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:8000/test",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("should add Authorization header with token", async () => {
    const getToken = () => "test-token";
    const clientWithToken = new ApiClient({
      baseUrl: "http://localhost:8000",
      getToken,
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });

    await clientWithToken.get("/test");
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe("http://localhost:8000/test");
    const headers = options.headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer test-token");
  });

  it("should throw ApiError on non-ok response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ detail: "Not found" }),
    });

    await expect(client.get("/test")).rejects.toThrow(ApiError);
  });

  it("should call onAuthError callback on 401", async () => {
    const onAuthError = vi.fn();
    const clientWithCallback = new ApiClient({
      baseUrl: "http://localhost:8000",
      onAuthError,
    });

    // First call returns 401, second call (refresh) returns 401 too (refresh fails)
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ detail: { code: "AUTH_TOKEN_EXPIRED", message: "Token expired" } }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ detail: { code: "AUTH_TOKEN_EXPIRED", message: "Token expired" } }),
      });

    try {
      await clientWithCallback.get("/test");
    } catch {
      // Expected to throw
    }

    expect(onAuthError).toHaveBeenCalledWith(expect.any(ApiError));
  });
});

describe("ApiError", () => {
  it("should identify auth errors", () => {
    const error = new ApiError(401, "Unauthorized", "AUTH_TOKEN_EXPIRED");
    expect(error.isAuthError()).toBe(true);
    expect(error.isForbidden()).toBe(false);
  });

  it("should identify forbidden errors", () => {
    const error = new ApiError(403, "Forbidden", "AUTH_FORBIDDEN");
    expect(error.isAuthError()).toBe(false);
    expect(error.isForbidden()).toBe(true);
  });

  it("should identify server errors", () => {
    const error = new ApiError(500, "Server error");
    expect(error.isServerError()).toBe(true);
  });
});
