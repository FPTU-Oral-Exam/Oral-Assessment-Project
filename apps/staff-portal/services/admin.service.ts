/**
 * Admin Service - Quản trị hệ thống (SYSTEM_ADMIN)
 * Base path: /api/admin
 */

import { apiClient } from '@/lib/api-client';

export interface AdminUser {
  id: string;
  username: string;
  name: string;
  role: string;
}

/** Alias for AdminUser - used across the codebase */
export type UserRecord = AdminUser;

export interface PlatformConfig {
  ai_provider: string;
  ai_config_source?: 'env' | 'admin';
  llm_model: string;
  embedding_model: string;
  stt_model: string;
  google_login_enabled: boolean;
  google_client_id: string;
  public_origin: string;
  gemini_key_configured: boolean;
  google_secret_configured: boolean;
  google_redirect_uri: string;
}

export const adminService = {
  // -------------------------------------------------------------------------
  // Users
  // -------------------------------------------------------------------------

  /**
   * Lấy danh sách người dùng hệ thống
   */
  getUsers: (params?: { role?: string }): Promise<AdminUser[]> => {
    return apiClient.get<AdminUser[]>('/admin/users', params as Record<string, string>);
  },

  // -------------------------------------------------------------------------
  // Platform Settings
  // -------------------------------------------------------------------------

  /**
   * Lấy cấu hình nền tảng
   */
  getPlatformConfig: (): Promise<PlatformConfig> => {
    return apiClient.get<PlatformConfig>('/admin/settings/platform');
  },

  /**
   * Cập nhật cấu hình nền tảng
   */
  updatePlatformConfig: (data: Partial<PlatformConfig>): Promise<PlatformConfig> => {
    return apiClient.post<PlatformConfig>('/admin/settings/platform', data);
  },
};
