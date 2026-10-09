/**
 * Examiner Service - Quản lý Khảo thí (EXAMINER)
 * Base path: /api/examiner
 */

import { apiClient, ApiError } from '@/lib/api-client';
import type { Semester, SemesterDetail, CourseBasic, Exam, ExamBatch, BatchStudent, AllocationResult } from '@oralai/shared';

// ============================================================================
// Types
// ============================================================================

export interface CreateSemesterRequest {
  name: string;
  year: number;
  term: 'SPRING' | 'SUMMER' | 'FALL';
  start_date: number;
  end_date: number;
}

export interface AddCourseRequest {
  /** Chọn từ Master Catalog */
  master_course_id?: string;
  /** Hoặc tạo mới */
  code?: string;
  name?: string;
  description?: string;
  credits?: number;
  department_code?: string;
}

export interface CourseDetail {
  id: string;
  code: string;
  name: string;
  description?: string;
  credits: number;
  department_code: string;
  status: string;
  semester_id: string;
  teacher?: { id: string; name: string } | null;
  candidate_count?: number;
  batch_count?: number;
}

export interface MasterCourse {
  id: string;
  code: string;
  name: string;
  department_code: string;
  credits: number;
  description?: string;
}

export interface CreateExamRequest {
  name: string;
  description?: string;
  exam_type?: 'FINAL' | 'MIDTERM' | 'RESIT';
  time_limit: number;
  question_count: number;
}

export interface CreateBatchRequest {
  name: string;
  date: number;
  start_time: string;
  end_time: string;
  rooms: string[];
  max_students_per_room: number;
  assigned_teacher_id: string;
}

export interface GenerateVariantsResponse {
  variants_count: number;
  message: string;
}

export interface CandidateImportResult {
  total_rows: number;
  imported: number;
  skipped: number;
  created_users: number;
  errors: string[];
}

export interface CandidatePoolResponse {
  total: number;
  eligible_count: number;
  disqualified_count: number;
  assigned_count: number;
  unassigned_count: number;
  candidates: CourseCandidate[];
}

export interface CourseCandidate {
  id: string;
  roll_number: string;
  full_name: string;
  eligibility_status: 'ELIGIBLE' | 'DISQUALIFIED';
  allocation_status: 'UNASSIGNED' | 'ASSIGNED';
  batch_id?: string | null;
  batch_name?: string | null;
  room?: string | null;
}

export interface SlotResultsResponse {
  slot_id: string;
  room: string;
  is_locked: boolean;
  students: SlotStudentResult[];
}

export interface SlotStudentResult {
  student_id: string;
  roll_number: string;
  name: string;
  ai_score: number;
  teacher_score?: number;
  final_score: number;
  confidence: number;
  discrepancy: number;
  flag_discrepancy: boolean;
  status: string;
  audio_url?: string;
}

export interface ReEvaluationRequest {
  teacher_id_2: string;
  reason: 'GRADE_DISPUTE' | 'STT_ERROR' | 'OTHER';
  reason_detail?: string;
  blind_marking?: boolean;
}

export interface BatchStudentsResponse {
  batch_id: string;
  name: string;
  rooms: {
    room: string;
    slot_id: string;
    students: {
      student_id: string;
      roll_number: string;
      full_name: string;
    }[];
  }[];
}

// ============================================================================
// Examiner Service
// ============================================================================

export const examinerService = {
  // -------------------------------------------------------------------------
  // Semester Management
  // -------------------------------------------------------------------------

  /**
   * Lấy danh sách học kỳ
   */
  getSemesters: (): Promise<Semester[]> => {
    return apiClient.get<Semester[]>('/examiner/semesters');
  },

  /**
   * Tạo học kỳ mới
   * @throws {ApiError} 400 nếu end_date <= start_date
   */
  createSemester: (data: CreateSemesterRequest): Promise<Semester> => {
    return apiClient.post<Semester>('/examiner/semesters', data);
  },

  /**
   * Lấy chi tiết học kỳ kèm danh sách môn học
   */
  getSemesterDetail: (semesterId: string): Promise<SemesterDetail> => {
    return apiClient.get<SemesterDetail>(`/examiner/semesters/${semesterId}`);
  },

  /**
   * Kích hoạt học kỳ (DRAFT -> ACTIVE)
   */
  activateSemester: (semesterId: string): Promise<{ ok: boolean }> => {
    return apiClient.post<{ ok: boolean }>(`/examiner/semesters/${semesterId}/activate`);
  },

  /**
   * Kết thúc học kỳ (ACTIVE -> COMPLETED)
   */
  completeSemester: (semesterId: string): Promise<{ ok: boolean }> => {
    return apiClient.post<{ ok: boolean }>(`/examiner/semesters/${semesterId}/complete`);
  },

  // -------------------------------------------------------------------------
  // Master Course Catalog
  // -------------------------------------------------------------------------

  /**
   * Lấy danh mục môn học khung toàn trường
   */
  getMasterCourses: (): Promise<MasterCourse[]> => {
    return apiClient.get<MasterCourse[]>('/examiner/master-courses');
  },

  // -------------------------------------------------------------------------
  // Course Management
  // -------------------------------------------------------------------------

  /**
   * Thêm môn học vào học kỳ
   */
  addCourseToSemester: (semesterId: string, data: AddCourseRequest): Promise<CourseDetail> => {
    return apiClient.post<CourseDetail>(`/examiner/semesters/${semesterId}/courses`, data);
  },

  /**
   * Lấy chi tiết môn học
   */
  getCourseDetail: (courseId: string): Promise<CourseDetail> => {
    return apiClient.get<CourseDetail>(`/examiner/courses/${courseId}`);
  },

  /**
   * Cập nhật thông tin môn học
   */
  updateCourse: (courseId: string, data: Partial<CourseDetail>): Promise<CourseDetail> => {
    return apiClient.put<CourseDetail>(`/examiner/courses/${courseId}`, data);
  },

  // -------------------------------------------------------------------------
  // Candidate Pool (Không chia lớp)
  // -------------------------------------------------------------------------

  /**
   * Import thí sinh từ Excel (3 cột: MSSV, Họ tên, Trạng thái đủ điều kiện)
   * Tự động tạo tài khoản STUDENT nếu chưa có
   */
  importCandidates: (courseId: string, fileData: string): Promise<CandidateImportResult> => {
    return apiClient.post<CandidateImportResult>(`/examiner/courses/${courseId}/candidates/import`, {
      file_data: fileData,
    });
  },

  /**
   * Lấy danh sách thí sinh của môn học (Candidate Pool)
   */
  getCandidates: (courseId: string, params?: {
    eligibility_status?: 'ELIGIBLE' | 'DISQUALIFIED';
    allocation_status?: 'UNASSIGNED' | 'ASSIGNED';
    search?: string;
  }): Promise<CandidatePoolResponse> => {
    return apiClient.get<CandidatePoolResponse>(`/examiner/courses/${courseId}/candidates`, params);
  },

  // -------------------------------------------------------------------------
  // Exam Management
  // -------------------------------------------------------------------------

  /**
   * Lấy danh sách kỳ thi của môn học
   */
  getExamsByCourse: (courseId: string): Promise<Exam[]> => {
    return apiClient.get<Exam[]>(`/examiner/courses/${courseId}/exams`);
  },

  /**
   * Tạo kỳ thi mới
   * @throws {ApiError} EXAM_NAME_EXISTS (409) nếu tên trùng
   */
  createExam: (courseId: string, data: CreateExamRequest): Promise<Exam> => {
    return apiClient.post<Exam>(`/examiner/courses/${courseId}/exams`, data);
  },

  // -------------------------------------------------------------------------
  // Batch Management (Đợt thi + Auto-Allocation)
  // -------------------------------------------------------------------------

  /**
   * Lấy danh sách các đợt thi của kỳ thi
   */
  getBatches: (examId: string): Promise<ExamBatch[]> => {
    return apiClient.get<ExamBatch[]>(`/examiner/exams/${examId}/batches`);
  },

  /**
   * Tạo đợt thi & kích hoạt thuật toán phân bổ tự động (Round-Robin)
   * @throws {ApiError}
   * - INVALID_TEACHER: Giảng viên không có role TEACHER
   * - NO_CANDIDATES: Không còn thí sinh đủ điều kiện
   * - NO_ROOMS: Danh sách phòng trống
   */
  createBatch: (examId: string, data: CreateBatchRequest): Promise<AllocationResult> => {
    return apiClient.post<AllocationResult>(`/examiner/exams/${examId}/batches`, data);
  },

  /**
   * Lấy danh sách thí sinh trong đợt thi (chia theo phòng)
   */
  getBatchStudents: (batchId: string): Promise<BatchStudentsResponse> => {
    return apiClient.get<BatchStudentsResponse>(`/examiner/batches/${batchId}/students`);
  },

  /**
   * Sinh mã đề song song từ Ngân hàng đề thi (ATA)
   */
  generateVariants: (examId: string): Promise<GenerateVariantsResponse> => {
    return apiClient.post<GenerateVariantsResponse>(`/examiner/exams/${examId}/generate-variants`);
  },

  // -------------------------------------------------------------------------
  // Results & Grading
  // -------------------------------------------------------------------------

  /**
   * Lấy bảng điểm ca thi
   */
  getSlotResults: (slotId: string): Promise<SlotResultsResponse> => {
    return apiClient.get<SlotResultsResponse>(`/examiner/slots/${slotId}/results`);
  },

  /**
   * Xuất bảng điểm FAP (Excel/CSV)
   */
  exportSlotResults: async (slotId: string): Promise<Blob> => {
    return apiClient.getBlob(`/examiner/slots/${slotId}/export`);
  },

  /**
   * Lấy danh sách giảng viên (role=TEACHER)
   */
  getTeachers: (): Promise<{ id: string; name: string; username: string; role: string }[]> => {
    return apiClient.get<{ id: string; name: string; username: string; role: string }[]>('/examiner/teachers');
  },

  /**
   * Khóa sổ điểm ca thi
   */
  lockSlot: (slotId: string): Promise<{ ok: boolean }> => {
    return apiClient.post<{ ok: boolean }>(`/examiner/slots/${slotId}/lock`);
  },

  /**
   * Mở khóa sổ điểm khẩn cấp
   */
  unlockSlot: (slotId: string, reason: string): Promise<{ ok: boolean }> => {
    return apiClient.post<{ ok: boolean }>(`/examiner/slots/${slotId}/unlock`, { reason });
  },

  // -------------------------------------------------------------------------
  // Re-Evaluation (Phúc khảo chấm mù)
  // -------------------------------------------------------------------------

  /**
   * Yêu cầu phúc khảo - chỉ định GV2 chấm mù
   */
  requestReEvaluation: (attemptId: string, data: ReEvaluationRequest): Promise<{ ok: boolean }> => {
    return apiClient.post<{ ok: boolean }>(`/examiner/attempts/${attemptId}/request-re-eval`, data);
  },
};
