export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
  currentChunk: number;
  totalChunks: number;
}

export interface UploadOptions {
  attemptId: string;
  kind: "AUDIO" | "VIDEO";
  mimeType: string;
  onProgress?: (progress: UploadProgress) => void;
  onChunkComplete?: (chunkIndex: number) => void;
}

interface UploadInitResponse {
  id: string;
  chunk_size: number;
  expires_at: number;
}

interface UploadStatusResponse {
  id: string;
  status: "PENDING" | "COMPLETED" | "FAILED";
  received_chunks: number[];
  total_chunks: number;
}

export class ChunkedUploader {
  private readonly CHUNK_SIZE = 4 * 1024 * 1024; // 4MB
  private readonly baseUrl: string;
  private getToken?: () => string | undefined;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setTokenGetter(getToken: () => string | undefined): void {
    this.getToken = getToken;
  }

  private getHeaders(): Headers {
    const headers = new Headers();
    const token = this.getToken?.();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    return headers;
  }

  async upload(file: File, options: UploadOptions): Promise<{ id: string }> {
    const { attemptId, kind, mimeType, onProgress, onChunkComplete } = options;

    const cleanMimeType = (mimeType || 'audio/webm').split(';')[0].trim();

    // Step 1: Initialize upload
    const initResponse = await fetch(`${this.baseUrl}/api/uploads/init`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...Object.fromEntries(this.getHeaders()),
      },
      body: JSON.stringify({
        attempt_id: attemptId,
        kind,
        size: file.size,
        sha256: await this.computeFileHash(file),
        mime_type: cleanMimeType,
      }),
      credentials: "include",
    });

    if (!initResponse.ok) {
      let errMsg = "Failed to initialize upload";
      try {
        const errJson = await initResponse.json();
        errMsg = errJson.message || errJson.detail || errMsg;
      } catch {
        // ignore
      }
      throw new Error(`Upload Failed: ${errMsg}`);
    }

    const { id: uploadId, chunk_size } = (await initResponse.json()) as UploadInitResponse;
    const chunkSize = chunk_size || this.CHUNK_SIZE;
    const totalChunks = Math.ceil(file.size / chunkSize);

    // Step 2: Upload chunks
    let uploadedBytes = 0;
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const chunk = file.slice(start, end);

      const chunkHash = await this.computeChunkHash(chunk);

      const chunkResponse = await fetch(
        `${this.baseUrl}/api/uploads/${uploadId}/chunks/${i}`,
        {
          method: "PUT",
          headers: {
            "X-Chunk-Sha256": chunkHash,
            ...Object.fromEntries(this.getHeaders()),
          },
          body: chunk,
          credentials: "include",
        },
      );

      if (!chunkResponse.ok) {
        throw new Error(`Failed to upload chunk ${i}`);
      }

      uploadedBytes += chunk.size;

      if (onProgress) {
        onProgress({
          loaded: uploadedBytes,
          total: file.size,
          percentage: Math.round((uploadedBytes / file.size) * 100),
          currentChunk: i + 1,
          totalChunks,
        });
      }

      if (onChunkComplete) {
        onChunkComplete(i);
      }
    }

    // Step 3: Complete upload
    const completeResponse = await fetch(
      `${this.baseUrl}/api/uploads/${uploadId}/complete`,
      {
        method: "POST",
        headers: Object.fromEntries(this.getHeaders()),
        credentials: "include",
      },
    );

    if (!completeResponse.ok) {
      throw new Error("Failed to complete upload");
    }

    return { id: uploadId };
  }

  async resume(uploadId: string, file: File, options: UploadOptions): Promise<{ id: string }> {
    const statusResponse = await fetch(
      `${this.baseUrl}/api/uploads/${uploadId}/status`,
      {
        headers: Object.fromEntries(this.getHeaders()),
        credentials: "include",
      },
    );

    if (!statusResponse.ok) {
      throw new Error("Failed to get upload status");
    }

    const { received_chunks, total_chunks } = (await statusResponse.json()) as UploadStatusResponse;
    const chunkSize = this.CHUNK_SIZE;

    for (let i = 0; i < total_chunks; i++) {
      if (received_chunks.includes(i)) continue;

      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const chunk = file.slice(start, end);
      const chunkHash = await this.computeChunkHash(chunk);

      await fetch(`${this.baseUrl}/api/uploads/${uploadId}/chunks/${i}`, {
        method: "PUT",
        headers: {
          "X-Chunk-Sha256": chunkHash,
          ...Object.fromEntries(this.getHeaders()),
        },
        body: chunk,
        credentials: "include",
      });

      if (options.onChunkComplete) {
        options.onChunkComplete(i);
      }
    }

    await fetch(`${this.baseUrl}/api/uploads/${uploadId}/complete`, {
      method: "POST",
      headers: Object.fromEntries(this.getHeaders()),
      credentials: "include",
    });

    return { id: uploadId };
  }

  private async computeFileHash(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  private async computeChunkHash(chunk: Blob): Promise<string> {
    const buffer = await chunk.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
}
