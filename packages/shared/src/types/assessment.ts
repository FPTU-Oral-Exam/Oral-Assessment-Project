export interface Criterion {
  name: string;
  description?: string;
  max_score: number;
  weight?: number;
}

export interface CriterionScore {
  name: string;
  score: number | null;
  comment: string;
}

export interface Chunk {
  id: string;
  content: string;
  page?: number;
  document_id: string;
  heading?: string | null;
}

export interface Assessment {
  id?: string;
  attempt_id?: string;
  score: number | null;
  confidence: number | null;
  status?: "COMPLETED" | "FAILED" | "NOT_GRADED";
  error?: string;
  error_code?: string;
  review_required: boolean;
  reasoning_summary: string;
  model?: string;
  criteria?: CriterionScore[];
  retrieved_chunks?: Chunk[];
}

export interface Evidence {
  id: string;
  attempt_id: string;
  kind: "AUDIO" | "VIDEO";
  url?: string;
  size?: number;
  created_at?: number;
}
