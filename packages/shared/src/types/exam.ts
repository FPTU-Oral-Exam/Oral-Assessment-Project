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

export interface ExamDetail extends Exam {
  slot_count: number;
}

export interface RoomAllocation {
  room: string;
  assigned_count: number;
}

export interface ExamBatch {
  batch_id: string;
  name: string;
  date: number;
  start_time: string;
  end_time: string;
  assigned_teacher_id: string;
  total_assigned: number;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED';
  rooms: RoomAllocation[];
}

export interface AllocationResult {
  batch_id: string;
  name?: string;
  date?: number;
  start_time?: string;
  end_time?: string;
  assigned_teacher_id?: string;
  total_assigned: number;
  status?: string;
  rooms: RoomAllocation[];
  remaining_unassigned: number;
}

export interface BatchStudent {
  roll_number: string;
  full_name: string;
  room: string;
  eligibility_status: 'ELIGIBLE' | 'DISQUALIFIED';
}

export interface Exam {
  id: string;
  course_id?: string;
  name: string;
  description?: string;
  course_name?: string;
  status?: ExamStatus;
  exam_type?: 'FINAL' | 'MIDTERM' | 'RESIT';
  time_limit: number;
  question_count: number;
  batch_count?: number;
  slot_count?: number;
  rubric_id?: string | null;
  blueprint?: Blueprint[];
  max_attempts?: number;
  practice?: boolean;
  created_at?: number;
  published_at?: number | null;
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
