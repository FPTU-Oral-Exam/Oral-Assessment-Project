import { useCallback, useRef, useState } from 'react';
import { ChunkedUploader, UploadProgress, UploadOptions } from '@oralai/shared';

export interface UseChunkedUploadResult {
  isUploading: boolean;
  progress: UploadProgress | null;
  error: string | null;
  upload: (file: File, attemptId: string, kind: 'AUDIO' | 'VIDEO', mimeType: string, token: string) => Promise<string>;
  reset: () => void;
}

export function useChunkedUpload(): UseChunkedUploadResult {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const uploaderRef = useRef<ChunkedUploader | null>(null);

  // Get API URL from environment or use default
  const getBaseUrl = (): string => {
    return import.meta.env.VITE_API_URL || 'http://localhost:8000';
  };

  const upload = useCallback(
    async (file: File, attemptId: string, kind: 'AUDIO' | 'VIDEO', mimeType: string, token: string): Promise<string> => {
      setIsUploading(true);
      setError(null);
      setProgress(null);

      try {
        // Create new uploader instance with current base URL
        const baseUrl = getBaseUrl();
        const uploader = new ChunkedUploader(baseUrl);

        // BUG FIX: Set token getter so ChunkedUploader can get the token dynamically
        // Without this, the token won't be sent with upload requests, causing 401 errors
        uploader.setTokenGetter(() => token);

        uploaderRef.current = uploader;

        const options: UploadOptions = {
          attemptId,
          kind,
          mimeType,
          onProgress: (prog: UploadProgress) => {
            setProgress(prog);
          },
          onChunkComplete: (chunkIndex: number) => {
            // Chunk completed - progress already updated via onProgress
            console.log(`Chunk ${chunkIndex + 1} uploaded`);
          },
        };

        const result = await uploader.upload(file, options);
        return result.id;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Upload failed';
        setError(errorMessage);
        throw err;
      } finally {
        setIsUploading(false);
      }
    },
    []
  );

  const reset = useCallback(() => {
    setIsUploading(false);
    setProgress(null);
    setError(null);
  }, []);

  return {
    isUploading,
    progress,
    error,
    upload,
    reset,
  };
}
