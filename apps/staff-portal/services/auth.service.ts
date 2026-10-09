/**
 * Auth Service - Xác thực, Đăng nhập, Đăng xuất, Session
 * Base path: /api/auth
 */

import { apiClient, ApiError } from '@/lib/api-client';
import type { User } from '@oralai/shared';

// ============================================================================
// Types
// ============================================================================

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
  access_token: string;
}

export interface RefreshResponse {
  user: User;
  token: string;
  access_token: string;
}

export interface LogoutResponse {
  ok: boolean;
}

// ============================================================================
// Auth Service
// ============================================================================

export const authService = {
  /**
   * Đăng nhập bằng username & password
   * @throws {ApiError} INVALID_CREDENTIALS (401), RATE_LIMITED (429)
   */
  login: (data: LoginRequest): Promise<LoginResponse> => {
    return apiClient.post<LoginResponse>('/auth/login', data);
  },

  /**
   * Lấy thông tin user hiện tại từ session
   * @throws {ApiError} INVALID_CREDENTIALS (401)
   */
  getMe: (): Promise<User> => {
    return apiClient.get<User>('/auth/me');
  },

  /**
   * Refresh access token bằng refresh token từ cookie
   */
  refresh: (): Promise<RefreshResponse> => {
    return apiClient.post<RefreshResponse>('/auth/refresh');
  },

  /**
   * Đăng xuất - thu hồi session và xóa cookie
   */
  logout: (): Promise<LogoutResponse> => {
    return apiClient.post<LogoutResponse>('/auth/logout');
  },

  /**
   * Bắt đầu luồng Google SSO (FPT Edu)
   */
  googleStart: (): void => {
    window.location.href = '/api/auth/google/start';
  },

  /**
   * Callback xử lý sau khi Google OAuth redirect về
   * (Server tự động xử lý, client chỉ redirect)
   */
  googleCallback: (): void => {
    window.location.href = '/api/auth/google/callback';
  },
};
