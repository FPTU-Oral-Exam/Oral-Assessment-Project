export type ExamStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export type SessionStatus =
  | "ASSIGNED"
  | "DEVICE_CHECK"
  | "IN_PROGRESS"
  | "UPLOADING"
  | "SUBMITTED"
  | "REVIEW_REQUIRED"
  | "COMPLETED";

export type AttemptStatus =
  | "READY"
  | "RECORDING"
  | "PROCESSING"
  | "SUBMITTED"
  | "GRADED"
  | "SKIPPED";

export interface Blueprint {
  topic_id: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  count: number;
}

export interface Exam {
  id: string;
  name: string;
  course_id?: string;
  course_name?: string;
  status: ExamStatus;
  time_limit: number;
  question_count?: number;
  blueprint?: Blueprint[];
  rubric_id?: string;
  max_attempts?: number;
  practice?: boolean;
}

export interface StudentExam extends Omit<Exam, "status"> {
  session_id?: string | null;
  status: SessionStatus;
  attempt_count: number;
  remaining_attempts?: number | null;
  can_start_new: boolean;
  history?: Sitting[];
}

export interface Sitting {
  id: string;
  attempt_number: number;
  status: SessionStatus;
  created_at: number;
  started_at?: number | null;
  completed_at?: number | null;
  final_score?: number | null;
}

export interface ExamSession {
  id: string;
  exam_id: string;
  exam_name: string;
  status: SessionStatus;
  started_at?: number | null;
  time_limit: number;
  server_time: number;
  question_count: number;
  answered_count: number;
  current_attempt?: QuestionAttempt | null;
  attempt_number?: number;
  final_score?: number | null;
  grading_message?: string | null;
  practice: boolean;
}

export interface QuestionAttempt {
  id: string;
  sequence: number;
  text?: string;
  status: AttemptStatus;
  transcript?: string | null;
  stt_confidence?: number | null;
  started_at?: number;
  submitted_at?: number;
}
