/**
 * Teacher Service - Giảng viên Bộ môn (TEACHER)
 * Base path: /api/admin
 */

import { apiClient, ApiError } from '@/lib/api-client';
import type { Workspace, Course, LearningOutcome, Topic, Doc, Exam } from '@oralai/shared';

// ============================================================================
// Types
// ============================================================================

export interface CourseWorkspace {
  course: {
    id: string;
    code: string;
    name: string;
  };
  documents: Doc[];
  learning_outcomes: LearningOutcome[];
  topics: Topic[];
  rubrics: Rubric[];
  exams: Exam[];
}

export interface Rubric {
  id: string;
  name: string;
  criteria: RubricCriterion[];
}

export interface RubricCriterion {
  name: string;
  description?: string;
  max_score: number;
  weight: number;
}

export interface CreateRubricRequest {
  name: string;
  criteria: Omit<RubricCriterion, 'id'>[];
}

export interface UpdateRubricRequest {
  name?: string;
  criteria?: Omit<RubricCriterion, 'id'>[];
}

export interface CreateOutcomeRequest {
  code: string;
  description: string;
  weight: number;
}

export interface UpdateOutcomeRequest {
  code?: string;
  description?: string;
  weight?: number;
}

export interface CreateTopicRequest {
  name: string;
  outcome_ids: string[];
  description?: string;
  chapter_ids?: string[];
}

export interface UpdateTopicRequest {
  name?: string;
  outcome_ids?: string[];
  description?: string;
}

export interface RagSearchResponse {
  query: string;
  matches: {
    chunk_id: string;
    content: string;
    page_number?: number;
    similarity_score: number;
  }[];
}

export interface ExamBlueprintRequest {
  course_id: string;
  rubric_id: string;
  name: string;
  description?: string;
  time_limit: number;
  question_count: number;
  blueprint: {
    topic_id: string;
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    count: number;
  }[];
  max_attempts?: number;
}

export interface ResultDetail {
  attempt_id: string;
  exam_id?: string;
  exam_name?: string;
  course_name?: string;
  student_name: string;
  student_id?: string;
  question_text?: string;
  audio_url?: string;
  transcript: string;
  stt_confidence: number;
  ai_score: number;
  ai_feedback: string;
  status: string;
  criteria_scores: {
    name: string;
    score: number;
  }[];
  teacher_score?: number;
  final_score?: number;
}

export interface ScoreOverrideRequest {
  score: number;
  reason: string;
  criteria?: {
    name: string;
    score: number;
  }[];
}

export interface RegradeTranscriptRequest {
  corrected_transcript: string;
  reason: string;
}

export interface ReEvaluationRequest {
  teacher_id_2: string;
  reason: string;
  reason_detail: string;
  blind_marking?: boolean;
}

export interface ReEvaluationItem {
  id: string;
  attempt_id: string;
  student_name: string;
  teacher_1_name: string;
  teacher_2_name: string;
  reason: string;
  reason_detail?: string;
  status: string;
  score_1?: number | null;
  score_2?: number | null;
  final_score?: number | null;
  blind_marking: boolean;
  created_at: number;
  completed_at?: number | null;
}

export interface ExamBatchInfo {
  batch_id: string;
  name: string;
  date: number;
  start_time: string;
  end_time: string;
  total_assigned: number;
  status: string;
  slot_count: number;
  rooms: string[];
}

export interface ExamInfo {
  id: string;
  name: string;
  status: string;
  time_limit: number;
  question_count: number;
  batches: ExamBatchInfo[];
}

export interface AssignedCourse {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: string;
  exams: ExamInfo[];
}

export interface SemesterGroup {
  semester_id: string | null;
  semester_name: string;
  semester_code?: string | null;
  semester_year?: number | null;
  semester_term?: string | null;
  semester_status?: string | null;
  start_date?: number | null;
  end_date?: number | null;
  courses: AssignedCourse[];
}

// ============================================================================
// Teacher Service
// ============================================================================

export const teacherService = {
  // -------------------------------------------------------------------------
  // Course Workspace
  // -------------------------------------------------------------------------

  /**
   * Lấy danh sách môn học giảng viên phụ trách
   */
  getCourses: (): Promise<Course[]> => {
    return apiClient.get<Course[]>('/admin/courses');
  },

  /**
   * Lấy danh sách học kỳ và môn học giảng viên phụ trách
   */
  getTeacherSemesters: (): Promise<SemesterGroup[]> => {
    return apiClient.get<SemesterGroup[]>('/admin/teacher-semesters');
  },

  /**
   * Lấy toàn bộ cấu trúc dữ liệu môn học (RAG, LO, Topics, Rubrics, Exams)
   */
  getCourseWorkspace: (courseId: string): Promise<CourseWorkspace> => {
    return apiClient.get<CourseWorkspace>(`/admin/courses/${courseId}/workspace`);
  },

  // -------------------------------------------------------------------------
  // Document & RAG
  // -------------------------------------------------------------------------

  /**
   * Upload giáo trình PDF lên MinIO
   * Kích hoạt Celery worker trích xuất text & embedding
   */
  uploadDocument: (courseId: string, file: File): Promise<Doc> => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.postForm<Doc>(`/admin/courses/${courseId}/documents`, formData);
  },

  /**
   * Xem nội dung chunks đã bóc tách từ PDF
   */
  getDocumentContent: (documentKey: string): Promise<{
    chunks: {
      chunk_id: string;
      content: string;
      page_number: number;
    }[];
  }> => {
    return apiClient.get<{
      chunks: { chunk_id: string; content: string; page_number: number }[];
    }>(`/admin/documents/${documentKey}/content`);
  },

  /**
   * Thử lại quá trình bóc tách & embedding nếu gặp sự cố
   */
  retryDocumentProcessing: (documentKey: string): Promise<{ ok: boolean }> => {
    return apiClient.post<{ ok: boolean }>(`/admin/documents/${documentKey}/retry`);
  },

  /**
   * Thử nghiệm tìm kiếm vector ngữ nghĩa (RAG Search)
   */
  ragSearch: (courseId: string, query: string, topicId?: string): Promise<RagSearchResponse> => {
    return apiClient.get<RagSearchResponse>(`/admin/courses/${courseId}/rag`, {
      q: query,
      topic_id: topicId,
    });
  },

  // -------------------------------------------------------------------------
  // Learning Outcomes (LO)
  // -------------------------------------------------------------------------

  /**
   * Tạo Chuẩn đầu ra (Learning Outcome)
   */
  createOutcome: (courseId: string, data: CreateOutcomeRequest): Promise<LearningOutcome> => {
    return apiClient.post<LearningOutcome>(`/admin/courses/${courseId}/outcomes`, data);
  },

  /**
   * Cập nhật Chuẩn đầu ra
   */
  updateOutcome: (outcomeId: string, data: UpdateOutcomeRequest): Promise<LearningOutcome> => {
    return apiClient.put<LearningOutcome>(`/admin/outcomes/${outcomeId}`, data);
  },

  /**
   * Xóa Chuẩn đầu ra
   */
  deleteOutcome: (outcomeId: string): Promise<{ ok: boolean }> => {
    return apiClient.delete<{ ok: boolean }>(`/admin/outcomes/${outcomeId}`);
  },

  // -------------------------------------------------------------------------
  // Topics
  // -------------------------------------------------------------------------

  /**
   * Tạo Chủ đề thi
   */
  createTopic: (courseId: string, data: CreateTopicRequest): Promise<Topic> => {
    return apiClient.post<Topic>(`/admin/courses/${courseId}/topics`, data);
  },

  /**
   * Cập nhật Chủ đề thi
   */
  updateTopic: (topicId: string, data: UpdateTopicRequest): Promise<Topic> => {
    return apiClient.put<Topic>(`/admin/topics/${topicId}`, data);
  },

  /**
   * Xóa Chủ đề thi
   */
  deleteTopic: (topicId: string): Promise<{ ok: boolean }> => {
    return apiClient.delete<{ ok: boolean }>(`/admin/topics/${topicId}`);
  },

  // -------------------------------------------------------------------------
  // Rubrics
  // -------------------------------------------------------------------------

  /**
   * Tạo Rubric tiêu chí đánh giá
   */
  createRubric: (courseId: string, data: CreateRubricRequest): Promise<Rubric> => {
    return apiClient.post<Rubric>(`/admin/courses/${courseId}/rubrics`, data);
  },

  /**
   * Cập nhật Rubric
   */
  updateRubric: (rubricId: string, data: UpdateRubricRequest): Promise<Rubric> => {
    return apiClient.put<Rubric>(`/admin/rubrics/${rubricId}`, data);
  },

  /**
   * Xóa Rubric
   */
  deleteRubric: (rubricId: string): Promise<{ ok: boolean }> => {
    return apiClient.delete<{ ok: boolean }>(`/admin/rubrics/${rubricId}`);
  },

  // -------------------------------------------------------------------------
  // Item Bank
  // -------------------------------------------------------------------------

  /**
   * Tạo câu hỏi trong ngân hàng đề thi
   */
  createItem: (courseId: string, data: {
    topic_id: string;
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    prompt: string;
    expected_points: string[];
    key_terms?: string[];
    status?: string;
  }): Promise<{ id: string }> => {
    return apiClient.post<{ id: string }>(`/admin/courses/${courseId}/items`, data);
  },

  /**
   * Xóa câu hỏi khỏi ngân hàng đề thi
   */
  deleteItem: (itemId: string): Promise<{ ok: boolean }> => {
    return apiClient.delete<{ ok: boolean }>(`/admin/items/${itemId}`);
  },

  /**
   * Import nhiều câu hỏi cùng lúc
   */
  importItems: (courseId: string, data: { items: unknown[] }): Promise<{ ok: boolean }> => {
    return apiClient.post<{ ok: boolean }>(`/admin/courses/${courseId}/items/import`, data);
  },

  // -------------------------------------------------------------------------
  // Exam Blueprint & Publishing
  // -------------------------------------------------------------------------

  /**
   * Tạo Exam Blueprint (phân bổ số câu theo topic & độ khó)
   */
  createExam: (data: ExamBlueprintRequest): Promise<Exam> => {
    return apiClient.post<Exam>('/admin/exams', data);
  },

  /**
   * Cập nhật cấu hình Exam Blueprint
   */
  updateExam: (examId: string, data: Partial<ExamBlueprintRequest>): Promise<Exam> => {
    return apiClient.put<Exam>(`/admin/exams/${examId}`, data);
  },

  /**
   * Gán kỳ thi cho đợt thi (Assignment)
   */
  assignExamToSlot: (examId: string, slotId: string, data?: { student_ids?: string[] }): Promise<{ ok: boolean }> => {
    return apiClient.post<{ ok: boolean }>(`/admin/exams/${examId}/assign`, {
      slot_id: slotId,
      ...data,
    });
  },

  /**
   * Xóa đề thi nháp
   */
  deleteExam: (examId: string): Promise<{ ok: boolean }> => {
    return apiClient.delete<{ ok: boolean }>(`/admin/exams/${examId}`);
  },

  /**
   * Công bố đề thi - Đóng băng Snapshot bất biến
   */
  publishExam: (examId: string): Promise<{ ok: boolean; snapshot_id: string }> => {
    return apiClient.post<{ ok: boolean; snapshot_id: string }>(`/admin/exams/${examId}/publish`);
  },

  // -------------------------------------------------------------------------
  // Grading & Results
  // -------------------------------------------------------------------------

  /**
   * Lấy danh sách bài thi cần rà soát/chấm điểm
   */
  getResults: (params?: { course_id?: string; status?: string }): Promise<{
    results: {
      attempt_id: string;
      student_name: string;
      course_name: string;
      ai_score: number;
      status: string;
      created_at: number;
    }[];
  }> => {
    return apiClient.get<{
      results: {
        attempt_id: string;
        student_name: string;
        course_name: string;
        ai_score: number;
        status: string;
        created_at: number;
      }[];
    }>('/admin/results', params);
  },

  /**
   * Lấy chi tiết bài thi (audio, transcript, điểm AI)
   */
  getResultDetail: (attemptId: string): Promise<ResultDetail> => {
    return apiClient.get<ResultDetail>(`/admin/results/${attemptId}`);
  },

  /**
   * Chấm lại sau khi sửa transcript
   */
  regradeTranscript: (attemptId: string, data: RegradeTranscriptRequest): Promise<{ ok: boolean }> => {
    return apiClient.post<{ ok: boolean }>(`/admin/attempts/${attemptId}/regrade-transcript`, data);
  },

  /**
   * Điều chỉnh điểm chính thức (Override)
   */
  overrideScore: (attemptId: string, data: ScoreOverrideRequest): Promise<{ ok: boolean }> => {
    return apiClient.post<{ ok: boolean }>(`/admin/attempts/${attemptId}/override`, data);
  },

  /**
   * Phê duyệt kết quả chính thức
   */
  approveResult: (attemptId: string): Promise<{ ok: boolean }> => {
    return apiClient.post<{ ok: boolean }>(`/admin/results/${attemptId}/approve`);
  },

  // -------------------------------------------------------------------------
  // Re-Evaluations (Blind Marking)
  // -------------------------------------------------------------------------

  /**
   * Lấy danh sách bài thẩm định chấm chéo
   */
  getReEvaluations: (): Promise<ReEvaluationItem[]> => {
    return apiClient.get<ReEvaluationItem[]>('/admin/re-evaluations');
  },

  /**
   * Gửi yêu cầu thẩm định chấm chéo độc lập
   */
  requestReEvaluation: (attemptId: string, data: ReEvaluationRequest): Promise<{ ok: boolean }> => {
    return apiClient.post<{ ok: boolean }>(`/admin/attempts/${attemptId}/request-re-eval`, data);
  },

  /**
   * Nộp điểm thẩm định vòng 2
   */
  submitReEvaluationScore: (reEvalId: string, score: number): Promise<{ ok: boolean }> => {
    return apiClient.post<{ ok: boolean }>(`/admin/re-evaluations/${reEvalId}/submit`, { score_2: score });
  },
};
