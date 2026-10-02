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

  async getAvailableExams() {
    return this.client.get<StudentExam[]>('/api/exams/available');
  }

  async createSession(examId: string) {
    return this.client.post<ExamSession>('/api/exam-sessions', {
      exam_id: examId,
    });
  }

  async startSession(sessionId: string) {
    return this.client.post<ExamSession>(
      `/api/exam-sessions/${sessionId}/start`
    );
  }

  async getSession(sessionId: string) {
    return this.client.get<ExamSession>(
      `/api/exam-sessions/${sessionId}`
    );
  }

  async startAttempt(attemptId: string) {
    return this.client.post<QuestionAttempt>(
      `/api/question-attempts/${attemptId}/start`
    );
  }

  async submitAttempt(attemptId: string, durationSeconds?: number) {
    return this.client.post<QuestionAttempt>(
      `/api/question-attempts/${attemptId}/submit`,
      { duration_seconds: durationSeconds }
    );
  }

  async finishSession(sessionId: string) {
    return this.client.post<ExamSession>(
      `/api/exam-sessions/${sessionId}/finish`
    );
  }

  async getResults() {
    return this.client.get<StudentExam[]>(
      '/api/student/results'
    );
  }

  async getResult(sessionId: string) {
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
        status: string;
        question_score: number | null;
        audio_url?: string;
      }>;
    }>(`/api/student/results/${sessionId}`);
  }
}

export const api = new StudentApiClient();
