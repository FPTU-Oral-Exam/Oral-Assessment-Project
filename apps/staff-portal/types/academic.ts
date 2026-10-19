export type QuestionType = 'RA' | 'RS' | 'GD' | 'DI' | 'SI' | 'RL' | 'ASQ';

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
  RA: {
    type: 'RA',
    name: 'Read Aloud',
    badge: 'RA',
    description: 'Đọc to đoạn văn bản học thuật để đánh giá phát âm và độ lưu loát',
    color: 'text-teal-400',
    bgLight: 'bg-teal-500/10',
    borderColor: 'border-teal-500/30',
    defaultPrepTime: 35,
    defaultResponseTime: 40,
  },
  RS: {
    type: 'RS',
    name: 'Repeat Sentence',
    badge: 'RS',
    description: 'Nghe đoạn âm thanh câu ngắn và lặp lại chính xác nguyên văn',
    color: 'text-purple-400',
    bgLight: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    defaultPrepTime: 3,
    defaultResponseTime: 15,
  },
  GD: {
    type: 'GD',
    name: 'Summarize Group Discussion',
    badge: 'GD',
    description: 'Lắng nghe cuộc thảo luận nhóm đa giọng nói và tóm tắt các luận điểm chính',
    color: 'text-emerald-400',
    bgLight: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    defaultPrepTime: 10,
    defaultResponseTime: 60,
  },
  DI: {
    type: 'DI',
    name: 'Describe Image',
    badge: 'DI',
    description: 'Quan sát biểu đồ, sơ đồ hoặc hình ảnh và thuyết trình miêu tả xu hướng chi tiết',
    color: 'text-amber-400',
    bgLight: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    defaultPrepTime: 25,
    defaultResponseTime: 40,
  },
  SI: {
    type: 'SI',
    name: 'Respond to a Situation',
    badge: 'SI',
    description: 'Đóng vai xử lý và phản hồi bằng lời nói trước tình huống giao tiếp học thuật/thực tế',
    color: 'text-pink-400',
    bgLight: 'bg-pink-500/10',
    borderColor: 'border-pink-500/30',
    defaultPrepTime: 20,
    defaultResponseTime: 40,
  },
  RL: {
    type: 'RL',
    name: 'Re-tell Lecture',
    badge: 'RL',
    description: 'Lắng nghe bài giảng học thuật ngắn (60-90s) và thuyết trình tóm tắt lại nội dung',
    color: 'text-sky-400',
    bgLight: 'bg-sky-500/10',
    borderColor: 'border-sky-500/30',
    defaultPrepTime: 10,
    defaultResponseTime: 40,
  },
  ASQ: {
    type: 'ASQ',
    name: 'Answer Short Question',
    badge: 'ASQ',
    description: 'Lắng nghe câu hỏi vấn đáp ngắn và trả lời bằng một hoặc vài từ ngắn gọn',
    color: 'text-cyan-400',
    bgLight: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/30',
    defaultPrepTime: 3,
    defaultResponseTime: 10,
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
  RA: {
    code: 'RA',
    name: 'Read Aloud',
    vietnamese_name: 'Đọc to văn bản học thuật',
    description: 'Thí sinh quan sát đoạn văn bản trên màn hình và đọc to rõ ràng, chuẩn phát âm và nhịp điệu.',
    color_theme: 'blue',
    is_active: true,
    default_prep_time: 35,
    min_prep_time: 15,
    max_prep_time: 60,
    default_response_time: 40,
    min_response_time: 20,
    max_response_time: 60,
    recommended_question_count: 2,
    requires_image: false,
    requires_audio_prompt: false,
    requires_audio_script: false,
    requires_key_points: false,
    min_prompt_words: 30,
    max_prompt_words: 80,
    focus_pronunciation: 40,
    focus_fluency: 40,
    focus_content: 20,
    focus_grammar_lexical: 0,
  },
  RS: {
    code: 'RS',
    name: 'Repeat Sentence',
    vietnamese_name: 'Lặp lại câu ngắn sau khi nghe',
    description: 'Thí sinh lắng nghe một câu nói ngắn (3–9 giây) và nhắc lại nguyên văn chính xác nhất có thể.',
    color_theme: 'purple',
    is_active: true,
    default_prep_time: 3,
    min_prep_time: 1,
    max_prep_time: 10,
    default_response_time: 15,
    min_response_time: 10,
    max_response_time: 30,
    recommended_question_count: 2,
    requires_image: false,
    requires_audio_prompt: true,
    requires_audio_script: true,
    requires_key_points: false,
    min_prompt_words: 6,
    max_prompt_words: 20,
    focus_pronunciation: 35,
    focus_fluency: 35,
    focus_content: 30,
    focus_grammar_lexical: 0,
  },
  GD: {
    code: 'GD',
    name: 'Summarize Group Discussion',
    vietnamese_name: 'Tóm tắt thảo luận nhóm đa giọng nói',
    description: 'Lắng nghe cuộc thảo luận học thuật giữa 2–3 nhân vật và tổng hợp các luận điểm chính bằng lời nói.',
    color_theme: 'emerald',
    is_active: true,
    default_prep_time: 10,
    min_prep_time: 5,
    max_prep_time: 30,
    default_response_time: 60,
    min_response_time: 30,
    max_response_time: 90,
    recommended_question_count: 1,
    requires_image: false,
    requires_audio_prompt: true,
    requires_audio_script: true,
    requires_key_points: true,
    min_prompt_words: 40,
    max_prompt_words: 150,
    focus_pronunciation: 20,
    focus_fluency: 20,
    focus_content: 45,
    focus_grammar_lexical: 15,
  },
  DI: {
    code: 'DI',
    name: 'Describe Image',
    vietnamese_name: 'Thuyết trình miêu tả biểu đồ / hình ảnh',
    description: 'Quan sát hình ảnh đồ thị, sơ đồ quy trình hoặc tranh ảnh khoa học và thuyết trình phân tích chi tiết.',
    color_theme: 'amber',
    is_active: true,
    default_prep_time: 25,
    min_prep_time: 15,
    max_prep_time: 40,
    default_response_time: 40,
    min_response_time: 25,
    max_response_time: 60,
    recommended_question_count: 2,
    requires_image: true,
    requires_audio_prompt: false,
    requires_audio_script: false,
    requires_key_points: true,
    min_prompt_words: 10,
    max_prompt_words: 50,
    focus_pronunciation: 25,
    focus_fluency: 25,
    focus_content: 35,
    focus_grammar_lexical: 15,
  },
  SI: {
    code: 'SI',
    name: 'Respond to a Situation',
    vietnamese_name: 'Phản xạ xử lý tình huống giao tiếp',
    description: 'Đóng vai giải quyết một tình huống phát sinh trong môi trường đại học hoặc nghề nghiệp.',
    color_theme: 'rose',
    is_active: true,
    default_prep_time: 20,
    min_prep_time: 10,
    max_prep_time: 35,
    default_response_time: 40,
    min_response_time: 25,
    max_response_time: 60,
    recommended_question_count: 1,
    requires_image: false,
    requires_audio_prompt: false,
    requires_audio_script: false,
    requires_key_points: true,
    min_prompt_words: 25,
    max_prompt_words: 100,
    focus_pronunciation: 20,
    focus_fluency: 25,
    focus_content: 35,
    focus_grammar_lexical: 20,
  },
  RL: {
    code: 'RL',
    name: 'Re-tell Lecture',
    vietnamese_name: 'Kể lại nội dung bài giảng khoa học',
    description: 'Nghe đoạn trích bài giảng khoa học (kèm slide minh họa nếu có) và tường thuật lại các khái niệm then chốt.',
    color_theme: 'indigo',
    is_active: true,
    default_prep_time: 10,
    min_prep_time: 5,
    max_prep_time: 25,
    default_response_time: 40,
    min_response_time: 25,
    max_response_time: 60,
    recommended_question_count: 1,
    requires_image: false,
    requires_audio_prompt: true,
    requires_audio_script: true,
    requires_key_points: true,
    min_prompt_words: 30,
    max_prompt_words: 120,
    focus_pronunciation: 20,
    focus_fluency: 25,
    focus_content: 40,
    focus_grammar_lexical: 15,
  },
  ASQ: {
    code: 'ASQ',
    name: 'Answer Short Question',
    vietnamese_name: 'Trả lời câu hỏi vấn đáp ngắn',
    description: 'Nghe câu hỏi vấn đáp ngắn bằng âm thanh và đưa ra câu trả lời súc tích bằng một hoặc vài từ chuẩn xác.',
    color_theme: 'cyan' as any,
    is_active: true,
    default_prep_time: 3,
    min_prep_time: 1,
    max_prep_time: 10,
    default_response_time: 10,
    min_response_time: 5,
    max_response_time: 20,
    recommended_question_count: 2,
    requires_image: false,
    requires_audio_prompt: true,
    requires_audio_script: true,
    requires_key_points: false,
    min_prompt_words: 5,
    max_prompt_words: 30,
    focus_pronunciation: 40,
    focus_fluency: 30,
    focus_content: 30,
    focus_grammar_lexical: 0,
  },
};
