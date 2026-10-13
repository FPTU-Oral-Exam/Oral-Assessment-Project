'use client';

import React, { createContext, useContext, useState, useMemo, useEffect, ReactNode } from 'react';
import type {
  AcademicQuestionItem,
  ExamBlueprintMatrix,
  RubricSchema,
  QuestionType,
  SkillCategory,
  DifficultyLevel,
  QuestionStatus,
  StockHealthStatus,
  GeneratedSampleExam,
  QuestionTypeConfig,
} from '@/types/academic';
import { QUESTION_TYPES_META, DEFAULT_QUESTION_TYPE_CONFIGS } from '@/types/academic';
import {
  academyService,
  type QuestionTypeConfigResponse,
  type CreateQuestionTypePayload,
} from '@/services/academy.service';

interface AcademicContextValue {
  // Data
  questions: AcademicQuestionItem[];
  filteredQuestions: AcademicQuestionItem[];
  matrices: ExamBlueprintMatrix[];
  activeMatrix: ExamBlueprintMatrix | null;
  rubrics: RubricSchema[];
  activeRubric: RubricSchema | null;
  questionTypeConfigs: Record<string, QuestionTypeConfig>;
  isLoading: boolean;
  error: string | null;

  // Filters
  selectedSkill: SkillCategory;
  selectedType: QuestionType | 'ALL';
  selectedDifficulty: DifficultyLevel | 'ALL';
  selectedStatus: QuestionStatus | 'ALL';
  searchQuery: string;

  // Filter setters
  setSelectedSkill: (skill: SkillCategory) => void;
  setSelectedType: (type: QuestionType | 'ALL') => void;
  setSelectedDifficulty: (difficulty: DifficultyLevel | 'ALL') => void;
  setSelectedStatus: (status: QuestionStatus | 'ALL') => void;
  setSearchQuery: (query: string) => void;
  resetFilters: () => void;

  // Question actions
  addQuestion: (data: Omit<AcademicQuestionItem, 'id' | 'usage_count' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateQuestion: (id: string, data: Partial<AcademicQuestionItem>) => Promise<void>;
  deleteQuestion: (id: string) => Promise<void>;
  approveQuestion: (id: string) => Promise<void>;

  // Matrix actions
  setActiveMatrixId: (id: string) => void;
  addMatrix: (data: Omit<ExamBlueprintMatrix, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateMatrix: (id: string, data: Partial<ExamBlueprintMatrix>) => Promise<void>;
  deleteMatrix: (id: string) => Promise<void>;
  getStockHealth: (matrixId: string) => Promise<StockHealthStatus[]>;
  generateSampleExam: (matrixId: string) => Promise<GeneratedSampleExam>;

  // Rubric actions
  setActiveRubricId: (id: string) => void;
  addRubric: (data: Omit<RubricSchema, 'id' | 'updated_at'>) => Promise<void>;
  updateRubric: (id: string, data: Partial<RubricSchema>) => Promise<void>;
  deleteRubric: (id: string) => Promise<void>;

  // Question Type Config actions
  addQuestionType: (data: CreateQuestionTypePayload) => Promise<void>;
  updateQuestionTypeConfig: (type: string, data: Partial<QuestionTypeConfig>, syncExistingQuestions?: boolean) => Promise<void>;
  resetQuestionTypeConfigs: () => Promise<void>;

  // Type counts (for badges)
  typeCounts: Record<QuestionType | 'ALL', number>;
}

const AcademicContext = createContext<AcademicContextValue | null>(null);

export function AcademicProvider({ children }: { children: ReactNode }) {
  // Backend data state
  const [questions, setQuestions] = useState<AcademicQuestionItem[]>([]);
  const [matrices, setMatrices] = useState<ExamBlueprintMatrix[]>([]);
  const [rubrics, setRubrics] = useState<RubricSchema[]>([]);
  const [questionTypeConfigs, setQuestionTypeConfigs] = useState<
    Record<string, QuestionTypeConfig>
  >(DEFAULT_QUESTION_TYPE_CONFIGS);

  // Loading & error states
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active IDs
  const [activeMatrixId, setActiveMatrixId] = useState<string>('');
  const [activeRubricId, setActiveRubricId] = useState<string>('');

  // Filter states
  const [selectedSkill, setSelectedSkill] = useState<SkillCategory>('SPEAKING');
  const [selectedType, setSelectedType] = useState<QuestionType | 'ALL'>('ALL');
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel | 'ALL'>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<QuestionStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // ============================================================
  // LOAD DATA FROM BACKEND
  // ============================================================
  useEffect(() => {
    let cancelled = false;

    async function loadAcademyData() {
      setIsLoading(true);
      setError(null);

      try {
        const [qs, ms, rs, qts] = await Promise.allSettled([
          academyService.getQuestions(),
          academyService.getMatrices(),
          academyService.getRubrics(),
          academyService.getQuestionTypeConfigs(),
        ]);

        if (cancelled) return;

        // Questions
        if (qs.status === 'fulfilled' && qs.value.length > 0) {
          setQuestions(qs.value as AcademicQuestionItem[]);
        }

        // Matrices
        if (ms.status === 'fulfilled' && ms.value.length > 0) {
          const loadedMatrices = ms.value as ExamBlueprintMatrix[];
          setMatrices(loadedMatrices);
          if (!activeMatrixId) setActiveMatrixId(loadedMatrices[0].id);
        }

        // Rubrics
        if (rs.status === 'fulfilled' && rs.value.length > 0) {
          const loadedRubrics = rs.value as RubricSchema[];
          setRubrics(loadedRubrics);
          if (!activeRubricId) setActiveRubricId(loadedRubrics[0].id);
        }

        // Question Type Configs (map to local format with safe defaults)
        if (qts.status === 'fulfilled' && qts.value.length > 0) {
          const configs = qts.value as QuestionTypeConfigResponse[];
          const mapped: Record<string, QuestionTypeConfig> = { ...DEFAULT_QUESTION_TYPE_CONFIGS };
          for (const cfg of configs) {
            const qt = cfg.type;
            const base = (DEFAULT_QUESTION_TYPE_CONFIGS as Record<string, QuestionTypeConfig>)[qt] || {
              code: qt,
              name: cfg.name,
              vietnamese_name: cfg.vietnamese_name || cfg.name,
              description: cfg.description,
              is_active: cfg.is_active,
              default_prep_time: cfg.default_prep_time,
              default_response_time: cfg.default_response_time,
              recommended_question_count: cfg.recommended_question_count || 2,
              requires_image: cfg.requires_image || false,
              requires_audio_prompt: cfg.requires_audio_prompt || false,
              requires_audio_script: cfg.requires_audio_script || false,
              requires_key_points: cfg.requires_key_points || false,
              question_count: cfg.question_count || 0,
            };
            mapped[qt] = {
              ...base,
              code: qt,
              name: cfg.name || base.name,
              vietnamese_name: cfg.vietnamese_name || base.vietnamese_name,
              description: cfg.description || base.description,
              default_prep_time: cfg.default_prep_time ?? base.default_prep_time,
              default_response_time: cfg.default_response_time ?? base.default_response_time,
              is_active: cfg.is_active !== undefined ? cfg.is_active : base.is_active,
              requires_image: cfg.requires_image !== undefined ? cfg.requires_image : base.requires_image,
              requires_audio_prompt: cfg.requires_audio_prompt !== undefined ? cfg.requires_audio_prompt : base.requires_audio_prompt,
              requires_audio_script: cfg.requires_audio_script !== undefined ? cfg.requires_audio_script : base.requires_audio_script,
              requires_key_points: cfg.requires_key_points !== undefined ? cfg.requires_key_points : base.requires_key_points,
              recommended_question_count: cfg.recommended_question_count || base.recommended_question_count,
              question_count: cfg.question_count ?? base.question_count ?? 0,
            };
          }
          setQuestionTypeConfigs(mapped);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[AcademicContext] Failed to load data from backend:', err);
          setError('Không thể tải dữ liệu từ máy chủ');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadAcademyData();
    return () => { cancelled = true; };
  }, []);

  // Active items
  const activeMatrix = useMemo(
    () => matrices.find((m) => m.id === activeMatrixId) || matrices[0] || null,
    [matrices, activeMatrixId]
  );

  const activeRubric = useMemo(
    () => rubrics.find((r) => r.id === activeRubricId) || rubrics[0] || null,
    [rubrics, activeRubricId]
  );

  // Type Counts map (all questions in item bank are Speaking)
  const typeCounts = useMemo(() => {
    const counts: Record<QuestionType | 'ALL', number> = {
      ALL: questions.length,
      RA: questions.filter((q) => q.type === 'RA').length,
      RS: questions.filter((q) => q.type === 'RS').length,
      GD: questions.filter((q) => q.type === 'GD').length,
      DI: questions.filter((q) => q.type === 'DI').length,
      SI: questions.filter((q) => q.type === 'SI').length,
      RL: questions.filter((q) => q.type === 'RL').length,
      ASQ: questions.filter((q) => q.type === 'ASQ').length,
    };
    return counts;
  }, [questions]);

  // Filtered Questions (100% Speaking)
  const filteredQuestions = useMemo(() => {
    return questions.filter((item) => {
      // Type filter
      if (selectedType !== 'ALL' && item.type !== selectedType) return false;

      // Difficulty filter
      if (selectedDifficulty !== 'ALL' && item.difficulty !== selectedDifficulty) return false;

      // Status filter
      if (selectedStatus !== 'ALL' && item.status !== selectedStatus) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchCode = item.code.toLowerCase().includes(q);
        const matchPrompt = item.prompt.toLowerCase().includes(q);
        const matchTags = item.tags.some((t) => t.toLowerCase().includes(q));
        if (!matchTitle && !matchCode && !matchPrompt && !matchTags) return false;
      }

      return true;
    });
  }, [
    questions,
    selectedType,
    selectedDifficulty,
    selectedStatus,
    searchQuery,
  ]);

  const resetFilters = () => {
    setSelectedType('ALL');
    setSelectedDifficulty('ALL');
    setSelectedStatus('ALL');
    setSearchQuery('');
  };

  // Question CRUD (Backend)
  const addQuestion = async (
    data: Omit<AcademicQuestionItem, 'id' | 'usage_count' | 'created_at' | 'updated_at'>
  ) => {
    try {
      const created = await academyService.createQuestion(data as Parameters<typeof academyService.createQuestion>[0]);
      setQuestions((prev) => [created as AcademicQuestionItem, ...prev]);
    } catch (err) {
      console.error('[AcademicContext] Failed to create question:', err);
      throw err;
    }
  };

  const updateQuestion = async (id: string, data: Partial<AcademicQuestionItem>) => {
    try {
      const updated = await academyService.updateQuestion(id, data as Parameters<typeof academyService.updateQuestion>[1]);
      setQuestions((prev) =>
        prev.map((q) => (q.id === id ? (updated as AcademicQuestionItem) : q))
      );
    } catch (err) {
      console.error('[AcademicContext] Failed to update question:', err);
      throw err;
    }
  };

  const deleteQuestion = async (id: string) => {
    try {
      await academyService.deleteQuestion(id);
      setQuestions((prev) => prev.filter((q) => q.id !== id));
    } catch (err) {
      console.error('[AcademicContext] Failed to delete question:', err);
      throw err;
    }
  };

  const approveQuestion = async (id: string) => {
    try {
      const approved = await academyService.approveQuestion(id);
      setQuestions((prev) =>
        prev.map((q) => (q.id === id ? (approved as AcademicQuestionItem) : q))
      );
    } catch (err) {
      console.error('[AcademicContext] Failed to approve question:', err);
      throw err;
    }
  };

  // Matrix CRUD (Backend)
  const addMatrix = async (data: Omit<ExamBlueprintMatrix, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const created = await academyService.createMatrix(data as Parameters<typeof academyService.createMatrix>[0]);
      const matrix = created as ExamBlueprintMatrix;
      setMatrices((prev) => [matrix, ...prev]);
      setActiveMatrixId(matrix.id);
    } catch (err) {
      console.error('[AcademicContext] Failed to create matrix:', err);
      throw err;
    }
  };

  const updateMatrix = async (id: string, data: Partial<ExamBlueprintMatrix>) => {
    try {
      const updated = await academyService.updateMatrix(id, data as Parameters<typeof academyService.updateMatrix>[1]);
      setMatrices((prev) =>
        prev.map((m) => (m.id === id ? (updated as ExamBlueprintMatrix) : m))
      );
    } catch (err) {
      console.error('[AcademicContext] Failed to update matrix:', err);
      throw err;
    }
  };

  const deleteMatrix = async (id: string) => {
    try {
      await academyService.deleteMatrix(id);
      setMatrices((prev) => prev.filter((m) => m.id !== id));
      if (activeMatrixId === id) {
        const remaining = matrices.filter((m) => m.id !== id);
        if (remaining.length > 0) setActiveMatrixId(remaining[0].id);
      }
    } catch (err) {
      console.error('[AcademicContext] Failed to delete matrix:', err);
      throw err;
    }
  };

  // Rubric CRUD (Backend)
  const addRubric = async (data: Omit<RubricSchema, 'id' | 'updated_at'>) => {
    try {
      const created = await academyService.createRubric(data as Parameters<typeof academyService.createRubric>[0]);
      const rubric = created as RubricSchema;
      setRubrics((prev) => [rubric, ...prev]);
      setActiveRubricId(rubric.id);
    } catch (err) {
      console.error('[AcademicContext] Failed to create rubric:', err);
      throw err;
    }
  };

  const updateRubric = async (id: string, data: Partial<RubricSchema>) => {
    try {
      const updated = await academyService.updateRubric(id, data as Parameters<typeof academyService.updateRubric>[1]);
      setRubrics((prev) =>
        prev.map((r) => (r.id === id ? (updated as RubricSchema) : r))
      );
    } catch (err) {
      console.error('[AcademicContext] Failed to update rubric:', err);
      throw err;
    }
  };

  const deleteRubric = async (id: string) => {
    try {
      await academyService.deleteRubric(id);
      setRubrics((prev) => prev.filter((r) => r.id !== id));
      if (activeRubricId === id) {
        const remaining = rubrics.filter((r) => r.id !== id);
        if (remaining.length > 0) setActiveRubricId(remaining[0].id);
      }
    } catch (err) {
      console.error('[AcademicContext] Failed to delete rubric:', err);
      throw err;
    }
  };

  // Stock Health & Sample Exam (Backend)
  const getStockHealth = (matrixId: string): Promise<StockHealthStatus[]> => {
    return academyService.getStockHealth(matrixId).then((result) =>
      result.health_breakdown.map((item) => ({
        type: item.type as QuestionType,
        name: QUESTION_TYPES_META[item.type as QuestionType]?.name || item.type,
        badge: item.type,
        required_count: item.required_count,
        available_approved_count: item.available_approved_count,
        status: item.status as 'HEALTHY' | 'WARNING' | 'CRITICAL',
        deficit: item.deficit,
      }))
    ).catch(() => {
      // Fallback to local calculation
      const target = matrices.find((m) => m.id === matrixId);
      if (!target) return Promise.resolve([]);
      const health = target.rules.map((rule) => {
        const approvedCount = questions.filter(
          (q) => q.type === rule.type && q.status === 'APPROVED'
        ).length;
        let status: 'HEALTHY' | 'WARNING' | 'CRITICAL' = 'HEALTHY';
        if (approvedCount < rule.question_count) status = 'CRITICAL';
        else if (approvedCount < rule.question_count * 2) status = 'WARNING';
        return {
          type: rule.type,
          name: QUESTION_TYPES_META[rule.type]?.name || rule.type,
          badge: rule.type,
          required_count: rule.question_count,
          available_approved_count: approvedCount,
          status,
          deficit: Math.max(0, rule.question_count - approvedCount),
        };
      });
      return Promise.resolve(health);
    });
  };

  const generateSampleExam = (matrixId: string): Promise<GeneratedSampleExam> => {
    return academyService.generateSampleExam(matrixId).then((result) => ({
      id: result.exam_sample_id || `sample-${Date.now().toString().slice(-6)}`,
      matrix_id: result.matrix_id,
      matrix_name: result.matrix_name || '',
      generated_at: Date.now(),
      total_questions: result.total_questions,
      total_duration_seconds: result.total_duration_seconds,
      items: result.questions?.map((q) => ({
        id: q.code,
        code: q.code,
        type: q.type as QuestionType,
        title: q.title,
        prompt: q.prompt,
        skill: 'SPEAKING' as SkillCategory,
        difficulty: q.difficulty as DifficultyLevel,
        prep_time: q.prep_time,
        response_time: q.response_time,
        media_url: q.media_url,
        status: 'APPROVED' as QuestionStatus,
        usage_count: 0,
        tags: [],
        created_at: Date.now(),
        updated_at: Date.now(),
      })) || [],
    }));
  };

  // Question Type Config Actions
  const addQuestionType = async (data: CreateQuestionTypePayload) => {
    try {
      const created = await academyService.createQuestionType(data);
      const newConfig: QuestionTypeConfig = {
        code: created.type,
        name: created.name,
        vietnamese_name: created.vietnamese_name || created.name,
        description: created.description,
        default_prep_time: created.default_prep_time,
        default_response_time: created.default_response_time,
        is_active: created.is_active,
        requires_image: created.requires_image,
        requires_audio_prompt: created.requires_audio_prompt,
        requires_audio_script: created.requires_audio_script,
        requires_key_points: created.requires_key_points,
        recommended_question_count: created.recommended_question_count,
        question_count: 0,
      };
      setQuestionTypeConfigs((prev) => ({
        ...prev,
        [created.type]: newConfig,
      }));
    } catch (err) {
      console.error('[AcademicContext] Failed to create question type:', err);
      throw err;
    }
  };

  const updateQuestionTypeConfig = async (
    type: string,
    data: Partial<QuestionTypeConfig>,
    syncExistingQuestions: boolean = false
  ) => {
    try {
      const res = await academyService.updateQuestionTypeConfig(
        type,
        {
          name: data.name,
          vietnamese_name: data.vietnamese_name,
          description: data.description,
          default_prep_time: data.default_prep_time,
          default_response_time: data.default_response_time,
          is_active: data.is_active,
          recommended_question_count: data.recommended_question_count,
        },
        syncExistingQuestions
      );

      setQuestionTypeConfigs((prev) => ({
        ...prev,
        [type]: {
          ...(prev[type] || DEFAULT_QUESTION_TYPE_CONFIGS[type as QuestionType]),
          ...data,
          question_count: res.question_count ?? prev[type]?.question_count ?? 0,
        },
      }));

      // Nếu đồng bộ câu hỏi cũ, cập nhật danh sách questions đang có trong state
      if (syncExistingQuestions && data.default_prep_time !== undefined && data.default_response_time !== undefined) {
        setQuestions((prev) =>
          prev.map((q) =>
            q.type === type
              ? { ...q, prep_time: data.default_prep_time!, response_time: data.default_response_time! }
              : q
          )
        );
      }
    } catch (err) {
      console.error('[AcademicContext] Failed to update question type config:', err);
      throw err;
    }
  };

  const resetQuestionTypeConfigs = async () => {
    try {
      const configs = await academyService.getQuestionTypeConfigs();
      const mapped: Record<string, QuestionTypeConfig> = { ...DEFAULT_QUESTION_TYPE_CONFIGS };
      for (const cfg of configs) {
        const qt = cfg.type;
        const base = (DEFAULT_QUESTION_TYPE_CONFIGS as Record<string, QuestionTypeConfig>)[qt] || {
          code: qt,
          name: cfg.name,
          vietnamese_name: cfg.vietnamese_name || cfg.name,
          description: cfg.description,
          is_active: cfg.is_active,
          default_prep_time: cfg.default_prep_time,
          default_response_time: cfg.default_response_time,
          recommended_question_count: cfg.recommended_question_count || 2,
          requires_image: cfg.requires_image || false,
          requires_audio_prompt: cfg.requires_audio_prompt || false,
          requires_audio_script: cfg.requires_audio_script || false,
          requires_key_points: cfg.requires_key_points || false,
          question_count: cfg.question_count || 0,
        };
        mapped[qt] = {
          ...base,
          code: qt,
          name: cfg.name || base.name,
          vietnamese_name: cfg.vietnamese_name || base.vietnamese_name,
          description: cfg.description || base.description,
          default_prep_time: cfg.default_prep_time ?? base.default_prep_time,
          default_response_time: cfg.default_response_time ?? base.default_response_time,
          is_active: cfg.is_active !== undefined ? cfg.is_active : base.is_active,
          requires_image: cfg.requires_image !== undefined ? cfg.requires_image : base.requires_image,
          requires_audio_prompt: cfg.requires_audio_prompt !== undefined ? cfg.requires_audio_prompt : base.requires_audio_prompt,
          requires_audio_script: cfg.requires_audio_script !== undefined ? cfg.requires_audio_script : base.requires_audio_script,
          requires_key_points: cfg.requires_key_points !== undefined ? cfg.requires_key_points : base.requires_key_points,
          recommended_question_count: cfg.recommended_question_count || base.recommended_question_count,
          question_count: cfg.question_count ?? base.question_count ?? 0,
        };
      }
      setQuestionTypeConfigs(mapped);
    } catch {
      setQuestionTypeConfigs(DEFAULT_QUESTION_TYPE_CONFIGS);
    }
  };

  return (
    <AcademicContext.Provider
      value={{
        questions,
        filteredQuestions,
        matrices,
        activeMatrix,
        rubrics,
        activeRubric,
        questionTypeConfigs,
        isLoading,
        error,
        selectedSkill,
        selectedType,
        selectedDifficulty,
        selectedStatus,
        searchQuery,
        setSelectedSkill,
        setSelectedType,
        setSelectedDifficulty,
        setSelectedStatus,
        setSearchQuery,
        resetFilters,
        addQuestion,
        updateQuestion,
        deleteQuestion,
        approveQuestion,
        setActiveMatrixId,
        addMatrix,
        updateMatrix,
        deleteMatrix,
        getStockHealth,
        generateSampleExam,
        setActiveRubricId,
        addRubric,
        updateRubric,
        deleteRubric,
        addQuestionType,
        updateQuestionTypeConfig,
        resetQuestionTypeConfigs,
        typeCounts,
      }}
    >
      {children}
    </AcademicContext.Provider>
  );
}

export function useAcademic() {
  const context = useContext(AcademicContext);
  if (!context) {
    throw new Error('useAcademic must be used within an AcademicProvider');
  }
  return context;
}
