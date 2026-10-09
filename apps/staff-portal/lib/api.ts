/**
 * Legacy API wrapper - Tương thích ngược với mã cũ
 *
 * Lưu ý: Các component mới nên sử dụng:
 * - Services: import { examinerService, teacherService, adminService, authService } from '@/services';
 * - Core Client: import { apiClient } from '@/lib/api-client';
 *
 * File này được giữ lại để Strangler Fig Migration không làm hỏng UI cũ.
 * @deprecated Sử dụng services trong thư mục @/services thay thế.
 */

import { apiClient as newApiClient, ApiError } from './api-client';

// Re-export ApiError cho mã cũ
export { ApiError };

// Re-export apiClient mới
export { apiClient } from './api-client';

/**
 * @deprecated Sử dụng examinerService, teacherService, adminService, authService
 */
export async function api<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const path = cleanEndpoint.startsWith('/api') ? cleanEndpoint : `/api${cleanEndpoint}`;

  try {
    if (options?.method === 'POST' || options?.method === 'PUT' || options?.method === 'PATCH') {
      const body = options.body instanceof FormData
        ? options.body
        : (options.body ? JSON.parse(options.body as string) : undefined);

      if (options.method === 'POST') {
        return await newApiClient.post<T>(path, body);
      } else if (options.method === 'PUT') {
        return await newApiClient.put<T>(path, body);
      } else {
        return await newApiClient.patch<T>(path, body);
      }
    } else if (options?.method === 'DELETE') {
      return await newApiClient.delete<T>(path);
    } else {
      return await newApiClient.get<T>(path);
    }
  } catch (error) {
    if (error instanceof ApiError) {
      throw new Error(error.message);
    }
    throw error;
  }
}
