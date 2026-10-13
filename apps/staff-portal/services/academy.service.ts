/**
 * Academy Service — Quản lý Ngân hàng Đề, Ma trận Đề & Rubrics
 * 
 * Dành riêng cho Actor ACADEMY (Ban Học thuật / Phòng Khảo thí & Quản trị Học liệu)
 */

import { apiClient } from '@/lib/api-client';
import type {
  AcademicQuestionItem,
  ExamBlueprintMatrix,
  RubricSchema,
  StockHealthStatus,
  GeneratedSampleExam,
  QuestionType,
  SkillCategory,
  DifficultyLevel,
  QuestionStatus,
} from '@/types/academic';

/** Backend Question Type Config response */
export interface QuestionTypeConfigResponse {
  type: string;
  name: string;
  vietnamese_name?: string;
  description: string;
  default_prep_time: number;
  default_response_time: number;
  audio_instruction_url: string | null;
  max_score: number;
  is_active: boolean;
  requires_image: boolean;
  requires_audio_prompt: boolean;
  requires_audio_script: boolean;
  requires_key_points: boolean;
  recommended_question_count: number;
  question_count: number;
  created_at: number;
  updated_at: number;
}

export interface CreateQuestionTypePayload {
  type: string;
  name: string;
  vietnamese_name?: string;
  description?: string;
  default_prep_time: number;
  default_response_time: number;
  audio_instruction_url?: string | null;
  max_score?: number;
  is_active?: boolean;
  requires_image?: boolean;
  requires_audio_prompt?: boolean;
  requires_audio_script?: boolean;
  requires_key_points?: boolean;
  recommended_question_count?: number;
}

export interface QuestionFilterParams {
  type?: QuestionType;
  skill?: SkillCategory;
  difficulty?: DifficultyLevel;
  status?: QuestionStatus;
  is_predicted?: boolean;
  search?: string;
}

export interface CreateQuestionPayload {
  code: string;
  skill: SkillCategory;
  type: QuestionType;
  title: string;
  prompt: string;
  media_url?: string;
  audio_script?: string;
  prep_time: number;
  response_time: number;
  difficulty: DifficultyLevel;
  tags: string[];
  is_predicted?: boolean;
  sample_answer?: string;
  key_points?: string[];
}

export interface CreateMatrixPayload {
  code: string;
  name: string;
  description: string;
  rubric_id: string;
  rules: {
    type: QuestionType;
    question_count: number;
    prep_time: number;
    response_time: number;
    target_difficulty: DifficultyLevel;
    weight_percentage: number;
  }[];
  difficulty_ratio: {
    easy: number;
    medium: number;
    hard: number;
  };
}

export class AcademyService {
  // ==========================================
  // 1. NGÂN HÀNG CÂU HỎI (ITEM BANK)
  // ==========================================

  async getQuestions(params?: QuestionFilterParams): Promise<AcademicQuestionItem[]> {
    try {
      const searchParams = new URLSearchParams();
      if (params?.type) searchParams.set('type', params.type);
      if (params?.skill) searchParams.set('skill', params.skill);
      if (params?.difficulty) searchParams.set('difficulty', params.difficulty);
      if (params?.status) searchParams.set('status', params.status);
      if (params?.is_predicted !== undefined) searchParams.set('is_predicted', String(params.is_predicted));
      if (params?.search) searchParams.set('search', params.search);

      const qs = searchParams.toString();
      const url = qs ? `/academy/questions?${qs}` : '/academy/questions';
      return await apiClient.get<AcademicQuestionItem[]>(url);
    } catch {
      // Fallback khi backend endpoint chưa triển khai (mock handled at Context level)
      return [];
    }
  }

  async getQuestionById(id: string): Promise<AcademicQuestionItem> {
    return apiClient.get<AcademicQuestionItem>(`/academy/questions/${id}`);
  }

  async createQuestion(data: CreateQuestionPayload): Promise<AcademicQuestionItem> {
    return apiClient.post<AcademicQuestionItem>('/academy/questions', data);
  }

  async updateQuestion(id: string, data: Partial<CreateQuestionPayload>): Promise<AcademicQuestionItem> {
    return apiClient.put<AcademicQuestionItem>(`/academy/questions/${id}`, data);
  }

  async deleteQuestion(id: string): Promise<{ ok: boolean }> {
    return apiClient.delete<{ ok: boolean }>(`/academy/questions/${id}`);
  }

  async approveQuestion(id: string): Promise<AcademicQuestionItem> {
    return apiClient.post<AcademicQuestionItem>(`/academy/questions/${id}/approve`, {});
  }

  // ==========================================
  // 2. MA TRẬN ĐỀ THI (EXAM MATRIX BLUEPRINT)
  // ==========================================

  async getMatrices(): Promise<ExamBlueprintMatrix[]> {
    try {
      return await apiClient.get<ExamBlueprintMatrix[]>('/academy/matrices');
    } catch {
      return [];
    }
  }

  async getMatrixById(id: string): Promise<ExamBlueprintMatrix> {
    return apiClient.get<ExamBlueprintMatrix>(`/academy/matrices/${id}`);
  }

  async createMatrix(data: CreateMatrixPayload): Promise<ExamBlueprintMatrix> {
    return apiClient.post<ExamBlueprintMatrix>('/academy/matrices', data);
  }

  async updateMatrix(id: string, data: Partial<CreateMatrixPayload>): Promise<ExamBlueprintMatrix> {
    return apiClient.put<ExamBlueprintMatrix>(`/academy/matrices/${id}`, data);
  }

  async deleteMatrix(id: string): Promise<{ ok: boolean }> {
    return apiClient.delete<{ ok: boolean }>(`/academy/matrices/${id}`);
  }

  async getStockHealth(matrixId: string): Promise<{
    matrix_id: string;
    is_ready_for_publishing: boolean;
    health_breakdown: StockHealthStatus[];
  }> {
    return apiClient.get(`/academy/matrices/${matrixId}/stock-health`);
  }

  async generateSampleExam(matrixId: string): Promise<GeneratedSampleExam> {
    return apiClient.post<GeneratedSampleExam>(`/academy/matrices/${matrixId}/generate-sample`, {});
  }

  // ==========================================
  // 3. TIÊU CHUẨN RUBRICS (RUBRICS STUDIO)
  // ==========================================

  async getRubrics(): Promise<RubricSchema[]> {
    try {
      return await apiClient.get<RubricSchema[]>('/academy/rubrics');
    } catch {
      return [];
    }
  }

  async getRubricById(id: string): Promise<RubricSchema> {
    return apiClient.get<RubricSchema>(`/academy/rubrics/${id}`);
  }

  async createRubric(data: Omit<RubricSchema, 'id' | 'updated_at'>): Promise<RubricSchema> {
    return apiClient.post<RubricSchema>('/academy/rubrics', data);
  }

  async updateRubric(id: string, data: Partial<RubricSchema>): Promise<RubricSchema> {
    return apiClient.put<RubricSchema>(`/academy/rubrics/${id}`, data);
  }

  async deleteRubric(id: string): Promise<{ ok: boolean }> {
    return apiClient.delete<{ ok: boolean }>(`/academy/rubrics/${id}`);
  }

  // ==========================================
  // 4. QUY CHUẨN DẠNG BÀI (QUESTION TYPE CONFIGS)
  // ==========================================

  async getQuestionTypeConfigs(): Promise<QuestionTypeConfigResponse[]> {
    try {
      return await apiClient.get<QuestionTypeConfigResponse[]>('/academy/question-types');
    } catch {
      return [];
    }
  }

  async createQuestionType(data: CreateQuestionTypePayload): Promise<QuestionTypeConfigResponse> {
    return apiClient.post<QuestionTypeConfigResponse>('/academy/question-types', data);
  }

  async updateQuestionTypeConfig(
    type: string,
    data: Partial<CreateQuestionTypePayload>,
    syncExistingQuestions: boolean = false
  ): Promise<QuestionTypeConfigResponse> {
    const query = syncExistingQuestions ? '?sync_existing_questions=true' : '';
    return apiClient.put<QuestionTypeConfigResponse>(`/academy/question-types/${type}${query}`, data);
  }
}

export const academyService = new AcademyService();

