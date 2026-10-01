// Import types from shared package
import type {
  User,
  Course,
  Topic,
  Criterion,
  Blueprint,
  Exam,
  Doc,
  Chapter,
  Workspace,
  Sitting,
  Chunk,
  Assessment,
  StudentExam,
  ExamSession,
} from "@oralai/shared";

// Types that need to stay local (not yet in shared package)
export type Outcome = {
  id: string;
  code: string;
  description: string;
  weight: number;
};

export type Rubric = {
  id: string;
  name: string;
  version: number;
  criteria: Criterion[];
};

export type SpeechPolicy = {
  provider: "local" | "google" | "gemini" | "local_server";
  preprocessing: "off" | "denoise";
  language: "vi" | "en";
};

export type Result = {
  attempt_number: number;
  created_at: number;
  started_at: number | null;
  completed_at: number | null;
  exam_id: string;
  student_id: string;
  max_attempts: number | null;
  remaining_attempts: number | null;
  id: string;
  status: string;
  exam_name: string;
  student_name: string;
  final_score: number | null;
};

export type Review = Result & {
  history: Sitting[];
  snapshot: {
    rubric_version: number;
    knowledge_version: string;
    llm_model: string;
    ai_provider: string;
  };
  attempts: {
    id: string;
    sequence: number;
    status: string;
    question: { text: string };
    transcript: string | null;
    stt_confidence: number | null;
    assessment: Assessment | null;
    grading_targets?: { id: string; name: string; model: string }[];
    evidence: { id: string; kind: string }[];
    reviews: {
      id: string;
      policy?: { provider: string };
      status: string;
      reason: string;
      created_at: number;
      error: string | null;
      original: { transcript: string; assessment: Assessment | null };
      result: {
        transcript: string;
        stt_confidence: number;
        confidence_source?: string;
        assessment: Assessment;
        preprocessing: string;
      } | null;
    }[];
  }[];
};

// Re-export shared types for backward compatibility
export type {
  User,
  Course,
  Topic,
  Criterion,
  Blueprint,
  Exam,
  Doc,
  Chapter,
  Workspace,
  Sitting,
  Chunk,
  Assessment,
  StudentExam,
  ExamSession,
};

let refreshing: Promise<Response> | null = null;
export async function api<T>(
  path: string,
  init: RequestInit = {},
  retry = true,
): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(init.body && typeof init.body === "string"
        ? { "Content-Type": "application/json" }
        : {}),
      ...init.headers,
    },
  });
  if (response.status === 401 && retry && !path.startsWith("/auth/")) {
    refreshing ||= fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
    }).finally(() => {
      refreshing = null;
    });
    if ((await refreshing).ok) return api<T>(path, init, false);
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const fields = body?.error?.details?.fields
      ?.map(
        (f: { field: string; message: string }) => `${f.field}: ${f.message}`,
      )
      .join("; ");
    throw new Error(
      fields || body?.error?.message || `Lỗi kết nối (${response.status})`,
    );
  }
  return response.json();
}
export function send<T>(
  path: string,
  body?: unknown,
  method = "POST",
): Promise<T> {
  return api<T>(path, {
    method,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}
export const errorText = (e: unknown) =>
  e instanceof Error ? e.message : "Có lỗi, vui lòng thử lại";
