/**
 * useApi - React hook cho gọi API với loading/error state
 *
 * Sử dụng:
 *
 * ```tsx
 * function SemesterList() {
 *   const { data, loading, error, execute } = useApi(
 *     () => examinerService.getSemesters()
 *   );
 *
 *   useEffect(() => { execute(); }, []);
 *
 *   if (loading) return <Spinner />;
 *   if (error) return <Error message={error} onRetry={execute} />;
 *
 *   return <List data={data} />;
 * }
 * ```
 */

'use client';

import { useState, useCallback, useRef } from 'react';
import { ApiError } from '@oralai/shared';

export interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export interface UseApiReturn<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  execute: () => Promise<T | null>;
  reset: () => void;
}

/**
 * Hook cho API calls với automatic state management
 */
export function useApi<T>(
  apiFn: () => Promise<T>,
  options?: {
    /** Chạy ngay khi mount (default: false) */
    immediate?: boolean;
    /** Callback khi thành công */
    onSuccess?: (data: T) => void;
    /** Callback khi lỗi */
    onError?: (error: ApiError) => void;
  }
): UseApiReturn<T> {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: options?.immediate ?? false,
    error: null,
  });

  const mountedRef = useRef(true);

  // Cập nhật state an toàn (kiểm tra mounted)
  const safeSetState = useCallback((newState: Partial<UseApiState<T>>) => {
    if (mountedRef.current) {
      setState(prev => ({ ...prev, ...newState }));
    }
  }, []);

  const execute = useCallback(async (): Promise<T | null> => {
    safeSetState({ loading: true, error: null });

    try {
      const result = await apiFn();
      safeSetState({ data: result, loading: false });
      options?.onSuccess?.(result);
      return result;
    } catch (err) {
      const errorMsg = err instanceof ApiError ? err.message :
                       err instanceof Error ? err.message :
                       'Đã xảy ra lỗi không xác định';
      safeSetState({ error: errorMsg, loading: false });

      if (err instanceof ApiError) {
        options?.onError?.(err);
      }

      return null;
    }
  }, [apiFn, safeSetState, options]);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return {
    data: state.data,
    loading: state.loading,
    error: state.error,
    execute,
    reset,
  };
}

/**
 * useApiMutation - Hook cho mutations (POST, PUT, DELETE)
 * Tự động set loading khi gọi, reset khi unmount
 */
export function useApiMutation<TData, TVariables = void>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: {
    onSuccess?: (data: TData, variables: TVariables) => void;
    onError?: (error: ApiError, variables: TVariables) => void;
  }
) {
  const [state, setState] = useState<{
    data: TData | null;
    loading: boolean;
    error: string | null;
  }>({
    data: null,
    loading: false,
    error: null,
  });

  const mountedRef = useRef(true);

  const mutate = useCallback(async (variables: TVariables): Promise<TData | null> => {
    setState({ data: null, loading: true, error: null });

    try {
      const result = await mutationFn(variables);
      if (mountedRef.current) {
        setState({ data: result, loading: false, error: null });
        options?.onSuccess?.(result, variables);
      }
      return result;
    } catch (err) {
      const errorMsg = err instanceof ApiError ? err.message :
                       err instanceof Error ? err.message :
                       'Đã xảy ra lỗi không xác định';
      if (mountedRef.current) {
        setState({ data: null, loading: false, error: errorMsg });
        if (err instanceof ApiError) {
          options?.onError?.(err, variables);
        }
      }
      return null;
    }
  }, [mutationFn, options]);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return {
    data: state.data,
    loading: state.loading,
    error: state.error,
    mutate,
    reset,
  };
}
