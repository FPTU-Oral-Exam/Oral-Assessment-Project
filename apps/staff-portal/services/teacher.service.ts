/**
 * Teacher Service - Giảng viên Bộ môn (TEACHER)
 * Base path: /api/teacher
 *
 * Nghiệp vụ chuẩn mực:
 * 1. Coi thi: Xem ca thi được phân công (/schedule) & Giám sát phòng thi (/proctor)
 * 2. Đánh giá & Chấm bài: Rà soát bài thi (/results), override điểm, hiệu đính transcript chấm lại, phê duyệt kết quả, chấm chéo thẩm định (blind re-evaluation).
 */

import { apiClient } from '@/lib/api-client';

// ============================================================================
// Types - Proctoring & Schedule
// ============================================================================

export interface TeacherScheduleSlot {
  id: string;
  slot_number: number;
  room: string;
  date: number;
  start_time: string;
  end_time: string;
  status: 'PENDING' | 'READY' | 'IN_PROGRESS' | 'COMPLETED';
  grade_locked: boolean;
  student_count: number;
  exam_id: string;
  exam_name: string;
  course_id: string;
  course_name: string;
  course_code: string;
  semester_name: string;
  batch_id?: string | null;
  batch_name?: string | null;
}

export interface CandidateRosterItem {
  student_id: string;
  name: string;
  username: string;
  email?: string;
  status: 'NOT_STARTED' | 'DEVICE_CHECK' | 'IN_PROGRESS' | 'SUBMITTED' | 'COMPLETED';
  session_id?: string | null;
  started_at?: number | null;
  completed_at?: number | null;
  final_score?: number | null;
}

export interface ProctorRoomDetail {
  slot: {
    id: string;
    slot_number: number;
    room: string;
    date: number;
    start_time: string;
    end_time: string;
    status: string;
    grade_locked: boolean;
    student_count: number;
  };
  exam: {
    id: string;
    name: string;
    course_id: string;
    course_name: string;
    course_code: string;
  };
  candidates: CandidateRosterItem[];
}

// ============================================================================
// Types - Grading & Assessment
// ============================================================================

export interface RubricCriterionDetail {
  name: string;
  score: number;
  max_score?: number;
  weight?: number;
  description?: string;
  feedback?: string;
  comment?: string;
}

export interface RubricDefinitionItem {
  name: string;
  description?: string;
  max_score: number;
  weight: number;
}

export interface AttemptEvidenceItem {
  id: string;
  kind: string;
  status: string;
  sha256?: string;
  size?: number;
}

export interface AttemptItemDetail {
  id: string;
  sequence: number;
  question: {
    text: string;
    topic_id?: string;
    [key: string]: any;
  };
  transcript: string | null;
  stt_confidence: number | null;
  status: string;
  assessment?: {
    score: number | null;
    reasoning_summary?: string;
    criteria?: RubricCriterionDetail[];
    rubric_criteria?: RubricDefinitionItem[];
    enhanced_metrics?: any;
    transcript_edited?: boolean;
    edit_reason?: string;
    manual_override?: boolean;
    override_reason?: string;
    override_by?: string;
  };
  evidence?: AttemptEvidenceItem[];
  grading_targets?: any[];
  reviews?: any[];
}

export interface GradingSessionDetail {
  id: string;
  attempt_number: number;
  exam_id: string;
  student_id: string;
  exam_name: string;
  student_name: string;
  final_score: number | null;
  status: string;
  created_at: number;
  started_at?: number | null;
  completed_at?: number | null;
  attempts: AttemptItemDetail[];
  history?: any[];
  progress?: {
    total_questions: number;
    completed_questions: number;
    current_sequence: number;
    current_stage: string;
    stage_label: string;
    percent: number;
  } | null;
  [key: string]: any;
}

export interface ResultDetail extends Partial<GradingSessionDetail> {
  attempt_id?: string;
  question_text?: string;
  audio_url?: string;
  transcript?: string;
  stt_confidence?: number;
  ai_score?: number;
  ai_feedback?: string;
  criteria_scores?: {
    name: string;
    score: number;
  }[];
  teacher_score?: number;
}

export interface ScoreOverrideRequest {
  score: number;
  reason: string;
  criteria?: {
    name: string;
    score: number;
    feedback?: string;
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
  session_id?: string | null;
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

// Legacy Type Aliases for Backward Compatibility
export type CourseWorkspace = any;
export type Rubric = any;
export type RubricCriterion = any;
export type CreateRubricRequest = any;
export type UpdateRubricRequest = any;
export type CreateOutcomeRequest = any;
export type UpdateOutcomeRequest = any;
export type CreateTopicRequest = any;
export type UpdateTopicRequest = any;
export type RagSearchResponse = any;
export type ExamBlueprintRequest = any;
export type SemesterGroup = any;
export type AssignedCourse = any;

// ============================================================================
// Teacher Service Implementation
// ============================================================================

export const teacherService = {
  // -------------------------------------------------------------------------
  // 1. Proctoring & Schedule
  // -------------------------------------------------------------------------

  /**
   * Lấy danh sách ca thi giảng viên được phân công coi thi
   * GET /teacher/schedule
   */
  getSchedule: (): Promise<TeacherScheduleSlot[]> => {
    return apiClient.get<TeacherScheduleSlot[]>('/teacher/schedule');
  },

  /**
   * Lấy chi tiết phòng thi và danh sách thí sinh cho ca thi
   * GET /teacher/proctor/{slotId}
   */
  getProctorRoom: (slotId: string): Promise<ProctorRoomDetail> => {
    return apiClient.get<ProctorRoomDetail>(`/teacher/proctor/${slotId}`);
  },

  // -------------------------------------------------------------------------
  // 2. Grading & Results Review
  // -------------------------------------------------------------------------

  /**
   * Lấy danh sách bài thi cần rà soát/chấm điểm
   * GET /teacher/results
   */
  getResults: async (params?: { course_id?: string; exam_id?: string; status?: string }): Promise<any[]> => {
    const res = await apiClient.get<any>('/teacher/results', params);
    return Array.isArray(res) ? res : (Array.isArray(res?.results) ? res.results : []);
  },

  /**
   * Lấy chi tiết bài thi (audio, transcript, điểm AI, toàn bộ attempts và tiêu chí rubric)
   * GET /teacher/results/{sessionId}
   */
  getResultDetail: (sessionId: string): Promise<GradingSessionDetail> => {
    return apiClient.get<GradingSessionDetail>(`/teacher/results/${sessionId}`);
  },

  /**
   * Chấm lại sau khi sửa transcript
   * POST /teacher/attempts/{attemptId}/regrade
   */
  regradeTranscript: (attemptId: string, data: RegradeTranscriptRequest): Promise<{ ok: boolean }> => {
    return apiClient.post<{ ok: boolean }>(`/teacher/attempts/${attemptId}/regrade`, data);
  },

  /**
   * Điều chỉnh điểm chính thức (Override) kèm lý do bắt buộc
   * POST /teacher/attempts/{attemptId}/override
   */
  overrideScore: (attemptId: string, data: ScoreOverrideRequest): Promise<{ ok: boolean }> => {
    return apiClient.post<{ ok: boolean }>(`/teacher/attempts/${attemptId}/override`, data);
  },

  /**
   * Phê duyệt kết quả chính thức cho lần thi
   * POST /teacher/results/{sessionId}/approve
   */
  approveResult: (sessionId: string): Promise<{ ok: boolean }> => {
    return apiClient.post<{ ok: boolean }>(`/teacher/results/${sessionId}/approve`);
  },

  // -------------------------------------------------------------------------
  // 3. Re-Evaluations (Blind Marking)
  // -------------------------------------------------------------------------

  /**
   * Lấy danh sách bài thẩm định chấm chéo
   * GET /teacher/re-evaluations
   */
  getReEvaluations: (): Promise<ReEvaluationItem[]> => {
    return apiClient.get<ReEvaluationItem[]>('/teacher/re-evaluations');
  },

  /**
   * Gửi yêu cầu thẩm định chấm chéo độc lập
   * POST /teacher/attempts/{attemptId}/request-re-eval
   */
  requestReEvaluation: (attemptId: string, data: ReEvaluationRequest): Promise<{ ok: boolean }> => {
    return apiClient.post<{ ok: boolean }>(`/teacher/attempts/${attemptId}/request-re-eval`, data);
  },

  /**
   * Nộp điểm thẩm định vòng 2
   * POST /teacher/re-evaluations/{reEvalId}/submit
   */
  submitReEvaluationScore: (reEvalId: string, score: number, feedback?: string): Promise<{ ok: boolean }> => {
    return apiClient.post<{ ok: boolean }>(`/teacher/re-evaluations/${reEvalId}/submit`, {
      score_2: score,
      feedback,
    });
  },
};
