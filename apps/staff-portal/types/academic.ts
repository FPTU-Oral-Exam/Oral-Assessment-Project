export type QuestionType =
  | 'GENERAL_INTERVIEW'
  | 'PICTURE_DESCRIPTION'
  | 'TOPIC_MONOLOGUE'
  | 'DEEP_DISCUSSION';

export type SkillCategory = 'SPEAKING' | 'WRITING' | 'READING' | 'LISTENING';

export type DifficultyLevel = 'EASY' | 'MEDIUM' | 'HARD';

export type QuestionStatus = 'DRAFT' | 'APPROVED' | 'IN_USE' | 'ARCHIVED';

export interface QuestionTypeMeta {
  type: QuestionType;
  name: string;
  badge: string;
  description: string;
  color: string;
  bgLight: string;
  borderColor: string;
  defaultPrepTime: number;
  defaultResponseTime: number;
}

export const QUESTION_TYPES_META: Record<QuestionType, QuestionTypeMeta> = {
  GENERAL_INTERVIEW: {
    type: 'GENERAL_INTERVIEW',
    name: 'General Interview',
    badge: 'INTERVIEW',
    description: 'Khởi động với các câu hỏi phỏng vấn cơ bản về bản thân, gia đình, học tập và cuộc sống hàng ngày',
    color: 'text-blue-500',
    bgLight: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    defaultPrepTime: 0,
    defaultResponseTime: 45,
  },
  PICTURE_DESCRIPTION: {
    type: 'PICTURE_DESCRIPTION',
    name: 'Picture Description',
    badge: 'PICTURE',
    description: 'Quan sát bức tranh trực quan và miêu tả chi tiết bối cảnh, con người, hành động dựa trên 4 câu hỏi định hướng',
    color: 'text-amber-500',
    bgLight: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    defaultPrepTime: 120,
    defaultResponseTime: 150,
  },
  TOPIC_MONOLOGUE: {
    type: 'TOPIC_MONOLOGUE',
    name: 'Topic Monologue',
    badge: 'MONOLOGUE',
    description: 'Thuyết trình độc thoại về một chủ đề học thuật hoặc xã hội với các gợi ý triển khai ý tưởng',
    color: 'text-purple-500',
    bgLight: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    defaultPrepTime: 60,
    defaultResponseTime: 150,
  },
  DEEP_DISCUSSION: {
    type: 'DEEP_DISCUSSION',
    name: 'Deep Discussion',
    badge: 'DISCUSSION',
    description: 'Vấn đáp đào sâu và tư duy phản biện đa chiều về các khía cạnh phức tạp của chủ đề',
    color: 'text-emerald-500',
    bgLight: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    defaultPrepTime: 15,
    defaultResponseTime: 90,
  },
};

export interface AcademicQuestionItem {
  id: string;
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
  status: QuestionStatus;
  usage_count: number;
  tags: string[];
  sample_answer?: string;
  key_points?: string[];
  created_at: number;
  updated_at: number;
}

export interface ExamMatrixRule {
  type: QuestionType;
  question_count: number;
  prep_time: number;
  response_time: number;
  target_difficulty: DifficultyLevel;
  weight_percentage: number;
}

export interface ExamBlueprintMatrix {
  id: string;
  code: string;
  name: string;
  description: string;
  rubric_id?: string | null;
  rules: ExamMatrixRule[];
  total_questions: number;
  estimated_duration: number; // Phút
  difficulty_ratio: {
    easy: number;
    medium: number;
    hard: number;
  };
  is_active: boolean;
  created_at: number;
  updated_at: number;
}

export interface BandDescriptor {
  level: string;
  score_range: string;
  description: string;
}

export interface RubricCriterion {
  id?: string;
  name: string;
  description?: string;
  guiding_question?: string;
  scoring_method?: string;
  max_score: number;
  weight: number; // Tổng = 100%
  descriptors?: BandDescriptor[];
}

export interface RubricSchema {
  id: string;
  name: string;
  description?: string;
  course_id?: string | null;
  criteria: RubricCriterion[];
  version: number;
  created_at: number;
  updated_at: number;
}

export interface StockHealthStatus {
  type: QuestionType;
  name: string;
  badge: string;
  required_count: number;
  available_approved_count: number;
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  deficit: number;
}

export interface GeneratedSampleExam {
  exam_sample_id?: string;
  id?: string;
  matrix_id: string;
  matrix_name?: string;
  generated_at?: number;
  total_questions: number;
  total_duration_seconds: number;
  questions?: SampleExamQuestion[];
  items?: AcademicQuestionItem[];
}

export interface SampleExamQuestion {
  sequence?: number;
  type: string;
  code: string;
  title: string;
  prompt: string;
  media_url?: string;
  prep_time: number;
  response_time: number;
  difficulty: string;
}

export interface QuestionTypeConfig {
  code: string;
  name: string;
  vietnamese_name: string;
  description: string;
  color_theme?: string;
  is_active: boolean;

  // Timing & Quotas
  default_prep_time: number;
  min_prep_time?: number;
  max_prep_time?: number;
  default_response_time: number;
  min_response_time?: number;
  max_response_time?: number;
  recommended_question_count: number;

  // Input Requirements
  requires_image: boolean;
  requires_audio_prompt: boolean;
  requires_audio_script: boolean;
  requires_key_points: boolean;
  min_prompt_words?: number;
  max_prompt_words?: number;

  // Metrics
  question_count?: number;

  // AI Grading Directives (%)
  focus_pronunciation?: number;
  focus_fluency?: number;
  focus_content?: number;
  focus_grammar_lexical?: number;
}

export const DEFAULT_QUESTION_TYPE_CONFIGS: Record<QuestionType, QuestionTypeConfig> = {
  GENERAL_INTERVIEW: {
    code: 'GENERAL_INTERVIEW',
    name: 'General Interview',
    vietnamese_name: 'Phỏng vấn vấn đáp mở đầu',
    description: 'Thí sinh trả lời các câu hỏi phỏng vấn cơ bản về bản thân, gia đình, sở thích và cuộc sống hàng ngày.',
    color_theme: 'blue',
    is_active: true,
    default_prep_time: 0,
    min_prep_time: 0,
    max_prep_time: 30,
    default_response_time: 45,
    min_response_time: 30,
    max_response_time: 90,
    recommended_question_count: 3,
    requires_image: false,
    requires_audio_prompt: false,
    requires_audio_script: false,
    requires_key_points: true,
  },
  PICTURE_DESCRIPTION: {
    code: 'PICTURE_DESCRIPTION',
    name: 'Picture Description',
    vietnamese_name: 'Miêu tả tranh & Bối cảnh',
    description: 'Thí sinh quan sát bức tranh trực quan và miêu tả chi tiết bối cảnh, con người, hành động dựa trên 4 câu hỏi định hướng.',
    color_theme: 'amber',
    is_active: true,
    default_prep_time: 120,
    min_prep_time: 60,
    max_prep_time: 180,
    default_response_time: 150,
    min_response_time: 90,
    max_response_time: 180,
    recommended_question_count: 1,
    requires_image: true,
    requires_audio_prompt: false,
    requires_audio_script: false,
    requires_key_points: true,
  },
  TOPIC_MONOLOGUE: {
    code: 'TOPIC_MONOLOGUE',
    name: 'Topic Monologue',
    vietnamese_name: 'Thuyết trình theo chủ đề',
    description: 'Thí sinh thuyết trình độc thoại về một chủ đề học thuật hoặc xã hội với các gợi ý triển khai ý tưởng.',
    color_theme: 'purple',
    is_active: true,
    default_prep_time: 60,
    min_prep_time: 30,
    max_prep_time: 120,
    default_response_time: 150,
    min_response_time: 90,
    max_response_time: 180,
    recommended_question_count: 1,
    requires_image: false,
    requires_audio_prompt: false,
    requires_audio_script: false,
    requires_key_points: true,
  },
  DEEP_DISCUSSION: {
    code: 'DEEP_DISCUSSION',
    name: 'Deep Discussion',
    vietnamese_name: 'Thảo luận sâu phản biện',
    description: 'Vấn đáp đào sâu và tư duy phản biện đa chiều về các khía cạnh phức tạp của chủ đề.',
    color_theme: 'emerald',
    is_active: true,
    default_prep_time: 15,
    min_prep_time: 10,
    max_prep_time: 45,
    default_response_time: 90,
    min_response_time: 60,
    max_response_time: 120,
    recommended_question_count: 2,
    requires_image: false,
    requires_audio_prompt: false,
    requires_audio_script: false,
    requires_key_points: true,
  },
};

