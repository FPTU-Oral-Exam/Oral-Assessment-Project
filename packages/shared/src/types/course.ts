export interface Course {
  id: string;
  code: string;
  name: string;
  description?: string;
  credits?: number;
  teacher_id?: string | null;
  semester_id?: string | null;
  status: "ACTIVE" | "ARCHIVED";
  created_at?: number;
}

export interface CourseDetail extends Course {
  semester_id: string;
  teacher?: { id: string; name: string } | null;
  section_count: number;
}

export interface LearningOutcome {
  id: string;
  code: string;
  description: string;
  weight: number;
  course_id: string;
}

export interface Topic {
  id: string;
  name: string;
  course_id: string;
  outcome_ids: string[];
  description?: string;
}

export interface Doc {
  id: string;
  filename: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  error?: string | null;
  topic_id?: string | null;
  kind: "TEXTBOOK" | "SUPPLEMENT";
  page_count?: number | null;
}

export interface Chapter {
  id: string;
  document_id: string;
  title: string;
  level: number;
  start_page: number;
  end_page: number;
  source: string;
}

export interface Workspace {
  chapters: Chapter[];
  outcomes: LearningOutcome[];
  topics: Topic[];
  documents: Doc[];
}
