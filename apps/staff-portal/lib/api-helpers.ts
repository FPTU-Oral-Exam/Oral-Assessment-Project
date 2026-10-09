/**
 * API Error Helpers - Parse và hiển thị lỗi nghiệp vụ chuẩn FastAPI
 *
 * Sử dụng:
 * import { parseApiError, getErrorMessage } from '@/lib/api-helpers';
 *
 * try {
 *   await examinerService.createBatch(...);
 * } catch (error) {
 *   const msg = parseApiError(error, {
 *     INVALID_TEACHER: 'Giảng viên không hợp lệ',
 *     NO_CANDIDATES: 'Không còn thí sinh đủ điều kiện',
 *     NO_ROOMS: 'Vui lòng nhập danh sách phòng thi',
 *   });
 *   toast.error(msg);
 * }
 */

import { ApiError } from '@oralai/shared';

/**
 * Map error codes với message tiếng Việt
 */
export type ErrorCodeMap = Record<string, string>;

/**
 * Parse ApiError và trả về message thân thiện
 */
export function parseApiError(error: unknown, customMessages?: ErrorCodeMap): string {
  // Default messages cho các lỗi phổ biến
  const defaultMessages: ErrorCodeMap = {
    // Auth errors
    INVALID_CREDENTIALS: 'Tên đăng nhập hoặc mật khẩu không đúng',
    AUTH_TOKEN_EXPIRED: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
    AUTH_TOKEN_INVALID: 'Token không hợp lệ',
    AUTH_FORBIDDEN: 'Bạn không có quyền thực hiện thao tác này',

    // Data errors
    DATA_CONFLICT: 'Dữ liệu đã tồn tại trong hệ thống',
    VALIDATION_ERROR: 'Dữ liệu không hợp lệ',

    // Exam errors
    EXAM_NAME_EXISTS: 'Tên kỳ thi đã tồn tại',
    EXAM_EXISTS: 'Môn học này đã có kỳ thi',
    EXAM_NOT_FOUND: 'Không tìm thấy kỳ thi',
    INVALID_TEACHER: 'Giảng viên phụ trách không hợp lệ',
    NO_CANDIDATES: 'Không còn thí sinh đủ điều kiện chưa được phân bổ',
    NO_ROOMS: 'Danh sách phòng thi không được để trống',
    KNOWLEDGE_NOT_READY: 'Ngân hàng câu hỏi chưa sẵn sàng',
    NO_EVIDENCE: 'Không tìm thấy bằng chứng âm thanh',

    // Batch/Allocation errors
    ALLOCATION_FAILED: 'Phân bổ thí sinh thất bại',
    BATCH_FULL: 'Ca thi đã đầy',

    // Rate limiting
    RATE_LIMITED: 'Bạn đã thao tác quá nhanh. Vui lòng chờ và thử lại.',
  };

  // Merge custom messages
  const messages = { ...defaultMessages, ...customMessages };

  // Handle ApiError từ @oralai/shared
  if (error instanceof ApiError) {
    if (error.code && messages[error.code]) {
      return messages[error.code];
    }
    return error.message;
  }

  // Handle Error object
  if (error instanceof Error) {
    return error.message;
  }

  // Handle plain string
  if (typeof error === 'string') {
    return error;
  }

  // Fallback
  return 'Đã xảy ra lỗi không xác định';
}

/**
 * Get error message đơn giản hơn
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Đã xảy ra lỗi không xác định';
}

/**
 * Check if error is an auth error (401/403)
 */
export function isAuthError(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.isAuthError() || error.isForbidden();
  }
  return false;
}

/**
 * Check if error is a server error (5xx)
 */
export function isServerError(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.isServerError();
  }
  return false;
}

/**
 * Format error for logging/debugging
 */
export function formatErrorForLog(error: unknown): string {
  if (error instanceof ApiError) {
    return `[${error.status}] ${error.code || 'UNKNOWN'}: ${error.message}`;
  }
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }
  return String(error);
}
