// TODO: Move QuestionItem to exam.ts once defined
export interface QuestionItem {
  id: string;
  type: string;
  text: string;
  [key: string]: unknown;
}

export interface ScheduleSlot {
  id: string;
  exam_id: string;
  slot_number: number;
  date: number;
  start_time: string;
  end_time: string;
  room: string;
  max_students: number;
  exam_variant_id: string | null;
  exam_variant: ExamVariant | null;
  status: "PENDING" | "READY" | "IN_PROGRESS" | "COMPLETED";
  grade_locked: boolean;
  student_count: number;
}

export interface ExamVariant {
  id: string;
  exam_id: string;
  name: string;
  questions: QuestionItem[];
  created_by: string;
  status: "CREATING" | "READY" | "ASSIGNED";
}

export interface SlotAssignment {
  id: string;
  slot_id: string;
  student_id: string;
}

export interface StudentResult {
  student_id: string;
  username: string;
  name: string;
  score_ai: number | null;
  score_final: number | null;
  score_pk: number | null;
  status: string;
}

export interface ReEvaluation {
  id: string;
  attempt_id: string;
  teacher_id_1: string;
  teacher_id_2: string;
  reason: "RECONTROLL" | "GRADE_DISPUTE" | "EXAMINER_REQUEST";
  reason_detail: string | null;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  score_1: number | null;
  score_2: number | null;
  final_score: number | null;
  blind_marking: boolean;
  created_at: number;
  completed_at: number | null;
}
