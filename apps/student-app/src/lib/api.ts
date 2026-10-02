// apps/student-app/src/lib/api.ts
import { ApiClient, type User, type StudentExam, type ExamSession, type QuestionAttempt } from '@oralai/shared';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class StudentApiClient {
  private client: ApiClient;
  private token: string | null = null;

  constructor() {
    this.client = new ApiClient({
      baseUrl: API_BASE_URL,
      getToken: () => this.token || undefined,
    });
  }

  setToken(token: string) {
    this.token = token;
  }

  clearToken() {
    this.token = null;
  }

  // Auth endpoints
  async login(username: string, password: string) {
    const response = await this.client.post<{
      user: User;
      token: string;
    }>('/api/auth/login', { username, password });

    if (response.token) {
      this.setToken(response.token);
    }

    return response;
  }

  async logout() {
    await this.client.post('/api/auth/logout');
    this.clearToken();
  }

  async getMe() {
    return this.client.get<User>('/api/auth/me');
  }

  // Exam endpoints
  async getAvailableExams() {
    return this.client.get<StudentExam[]>('/api/exams/available');
  }

  async createSession(examId: string, newAttempt = false) {
    return this.client.post<ExamSession>('/api/exam-sessions', {
      exam_id: examId,
      new_attempt: newAttempt,
    });
  }

  async getSession(sessionKey: string) {
    return this.client.get<ExamSession>(`/api/exam-sessions/${sessionKey}`);
  }

  async startSession(sessionKey: string) {
    return this.client.post<ExamSession>(`/api/exam-sessions/${sessionKey}/start`);
  }

  // Question attempt endpoints
  async startAttempt(attemptKey: string) {
    return this.client.post<QuestionAttempt>(`/api/question-attempts/${attemptKey}/start`);
  }

  async submitAttempt(
    attemptKey: string,
    transcript: string,
    sttConfidence: number,
    idempotencyKey: string
  ) {
    return this.client.post<QuestionAttempt>(
      `/api/question-attempts/${attemptKey}/submit`,
      {
        transcript,
        stt_confidence: sttConfidence,
      },
      {
        headers: {
          'X-Idempotency-Key': idempotencyKey,
        },
      }
    );
  }

  async finishSession(sessionKey: string) {
    return this.client.post<ExamSession>(`/api/exam-sessions/${sessionKey}/finish`);
  }

  // Results endpoints
  async getResults() {
    return this.client.get<StudentExam[]>('/api/student/results');
  }

  async getResult(sessionKey: string) {
    return this.client.get<{
      session_id: string;
      exam_name: string;
      status: string;
      score: number | null;
      completed_at: number | null;
      grading_message?: string;
      attempts: Array<{
        sequence: number;
        question: string;
        transcript?: string;
        stt_confidence?: number;
        status: string;
        question_score: number | null;
        audio_url?: string;
      }>;
    }>(`/api/student/results/${sessionKey}`);
  }

  // Upload endpoints (using ChunkedUploader directly in hook)
  getUploadInitUrl() {
    return `${API_BASE_URL}/api/uploads/init`;
  }

  getChunkUrl(uploadKey: string, index: number) {
    return `${API_BASE_URL}/api/uploads/${uploadKey}/chunks/${index}`;
  }

  getCompleteUrl(uploadKey: string) {
    return `${API_BASE_URL}/api/uploads/${uploadKey}/complete`;
  }
}

export const api = new StudentApiClient();
