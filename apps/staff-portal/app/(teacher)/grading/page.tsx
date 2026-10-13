'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Search,
  Loader2,
  Filter,
  CheckCircle,
  AlertTriangle,
  FileText,
  Volume2,
  Sparkles,
  Award,
  ChevronRight,
  ArrowLeft,
  Headphones,
  Edit3,
  Sliders,
  UserCheck,
  CheckCircle2,
  RotateCcw,
  X,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  BookOpen,
  Info
} from 'lucide-react';
import { AudioPlayer } from './components/AudioPlayer';
import { EditTranscriptModal } from './components/EditTranscriptModal';
import { ScoreOverrideModal } from './components/ScoreOverrideModal';
import { RequestReEvalModal } from './components/RequestReEvalModal';
import { ReEvaluationsList } from './components/ReEvaluationsList';
import { teacherService } from '@/services';

type ResultStatus = 'PENDING' | 'REVIEW_REQUIRED' | 'APPROVED' | 'REJECTED';

interface GradingProgress {
  total_questions: number;
  completed_questions: number;
  current_sequence: number;
  current_stage: string;
  stage_label: string;
  percent: number;
}

interface GradingResult {
  id: string | number;
  student_name: string;
  student_id: string;
  exam_name: string;
  exam_id: string | number;
  attempt_number?: number;
  ai_score: number | null;
  status: ResultStatus;
  session_id: string | number;
  created_at: string;
  progress?: GradingProgress | null;
}

interface AttemptDetail {
  id: string;
  sequence: number;
  stage?: string;
  stage_label?: string;
  question: {
    text: string;
    topic_id?: string;
    topic_title?: string;
  };
  transcript: string | null;
  stt_confidence: number | null;
  status: string;
  assessment?: {
    score: number | null;
    review_required?: boolean;
    reasoning_summary?: string;
    transcript_edited?: boolean;
    edit_reason?: string;
    manual_override?: boolean;
    override_reason?: string;
    override_by?: string;
    criteria?: Array<{
      name: string;
      score: number;
      max_score: number;
      weight?: number;
      description?: string;
      feedback?: string;
      comment?: string;
    }>;
    enhanced_metrics?: {
      fluency: {
        score: number;
        speech_rate_wps: number;
        speech_rate_status: string;
        pause_count: number;
        pause_ratio: number;
        filled_pause_count: number;
        transcript_with_pauses?: string;
      } | null;
      pronunciation: {
        score: number;
        wer: number;
        is_valid: boolean;
        grade: string;
        grade_description: string;
        errors: {
          total: number;
          substitutions: number;
          deletions: number;
          insertions: number;
          details?: {
            substitutions?: Array<{reference: string; hypothesis: string}>;
            deletions?: string[];
            insertions?: string[];
          };
        };
        feedback: string;
      } | null;
      lexical: {
        total_words: number;
        unique_words: number;
        ttr: number;
        ttr_score: number;
        vocabulary_level: string;
        vocabulary_description: string;
      } | null;
    } | null;
  };
  evidence?: Array<{
    id: string;
    kind: string;
    status: string;
    sha256?: string;
    size?: number;
  }>;
}

interface SessionDetail {
  id: string;
  exam_name: string;
  student_name: string;
  final_score: number | null;
  status: string;
  progress?: GradingProgress | null;
  attempts: AttemptDetail[];
}

function PipelineProgressStepper({ stage, stageLabel }: { stage?: string; stageLabel?: string }) {
  const isAllDone = stage === 'GRADED' || stage === 'COMPLETED' || stage === 'REVIEW_REQUIRED';
  const steps = [
    { key: 'SUBMITTED', label: '1. Nhận âm thanh', isDone: isAllDone || ['TRANSCRIBING', 'ANALYZING', 'GRADING'].includes(stage || '') },
    { key: 'TRANSCRIBING', label: '2. Whisper STT', isDone: isAllDone || ['ANALYZING', 'GRADING'].includes(stage || ''), isCurrent: !isAllDone && stage === 'TRANSCRIBING' },
    { key: 'ANALYZING', label: '3. Phân tích âm học', isDone: isAllDone || ['GRADING'].includes(stage || ''), isCurrent: !isAllDone && stage === 'ANALYZING' },
    { key: 'GRADING', label: '4. AI Chấm Rubric', isDone: isAllDone, isCurrent: !isAllDone && stage === 'GRADING' },
  ];

  return (
    <div className={`p-3.5 rounded-xl border space-y-2.5 transition-all ${
      isAllDone 
        ? 'bg-gradient-to-r from-emerald-50 to-teal-50/60 border-emerald-200' 
        : 'bg-gradient-to-r from-blue-50 to-indigo-50/60 border-blue-200/80'
    }`}>
      <div className="flex items-center justify-between text-xs font-bold">
        <span className="flex items-center gap-2">
          {isAllDone ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          ) : (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
          )}
          <span className={isAllDone ? 'text-emerald-900' : 'text-blue-900'}>
            Tiến độ Worker AI: <strong className={isAllDone ? 'text-emerald-700 font-bold' : 'text-blue-700'}>
              {stageLabel || (isAllDone ? 'Hoàn tất AI chấm điểm — Sẵn sàng thẩm định' : 'Đang xử lý...')}
            </strong>
          </span>
        </span>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shadow-2xs ${
          isAllDone 
            ? 'bg-emerald-100/80 border-emerald-200 text-emerald-800' 
            : 'bg-white border-blue-200 text-blue-700'
        }`}>
          {isAllDone ? 'Hoàn tất 100%' : 'Thời gian thực'}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
        {steps.map((step) => {
          return (
            <div
              key={step.key}
              className={`p-2 rounded-lg border transition-all flex items-center gap-2 ${
                step.isDone
                  ? 'bg-white border-emerald-300 text-emerald-800 font-medium'
                  : step.isCurrent
                  ? 'bg-white border-blue-500 text-blue-800 font-bold shadow-xs ring-2 ring-blue-100 animate-pulse'
                  : 'bg-slate-50/80 border-slate-200 text-slate-400'
              }`}
            >
              <div className="shrink-0">
                {step.isDone ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ) : step.isCurrent ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                ) : (
                  <span className="w-3.5 h-3.5 rounded-full border border-slate-300 inline-block" />
                )}
              </div>
              <span className="leading-tight text-[11px] truncate">{step.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface RubricGuideLevel {
  score: number;
  description: string;
}

interface RubricGuideItem {
  key: string;
  title: string;
  question: string;
  scoringMethod: string;
  levels: RubricGuideLevel[];
}

const PTE_RUBRIC_GUIDES: Record<string, RubricGuideItem> = {
  content: {
    key: 'content',
    title: 'Enabling skill - Content',
    question: 'Does your response include all the words in the reading text and only these words?',
    scoringMethod:
      'Content is scored by counting the number of correct words in your response. Replacements insertions and omissions of words will negatively affect your score.',
    levels: [
      { score: 5, description: 'All words in the response from the prompt' },
      { score: 4, description: 'At least 75% of words in the response from the prompt' },
      { score: 3, description: 'At least 50% of words in the response from the prompt' },
      { score: 2, description: 'At least 25% of words in the response from the prompt' },
      { score: 1, description: 'Less than 25% of words in the response from the prompt' },
      { score: 0, description: 'Almost nothing from the prompt in the response' },
    ],
  },
  oral_fluency: {
    key: 'oral_fluency',
    title: 'Enabling skill - Oral fluency',
    question: 'Does your response demonstrate a smooth, effortless and natural rate of Speech?',
    scoringMethod:
      'Oral fluency is scored by determining if your rhythm, phrasing and stress are smooth. The best responses are spoken at a constant and natural rate of speech with appropriate phrasing. Hesitations, repetitions and false starts will negatively affect your score.',
    levels: [
      {
        score: 5,
        description:
          'Speech shows smooth rhythm and phrasing. There are no hesitations, repetitions, false starts or non-native phonological simplifications',
      },
      {
        score: 4,
        description:
          'Speech has an acceptable rhythm with appropriate phrasing and word emphasis. There is no more than one hesitation, one repetition or a false start. There are no significant non-native phonological simplifications',
      },
      {
        score: 3,
        description:
          'Speech is at an acceptable speed but may be uneven. There may be more than one hesitation, but most words are spoken in continuous phrases. There are few repetitions or false starts. There are no long pauses and speech does not sound staccato',
      },
      {
        score: 2,
        description:
          'Speech may be uneven or staccato. Speech (if >= 6 words) has at least one smooth three-word run, and no more than two or three hesitations, repetitions or false starts. There may be one long pause, but not two or more',
      },
      {
        score: 1,
        description:
          'Speech has irregular phrasing or sentence rhythm. Poor phrasing, staccato or syllabic timing, and/or multiple hesitations, repetitions, and/or false starts make spoken performance notably uneven or discontinuous. Long utterances may have one or two long pauses and inappropriate sentencelevel word emphasis',
      },
      {
        score: 0,
        description:
          'Speech is slow and labored with little discernable phrase grouping, multiple hesitations, pauses, false starts, and/or major phonological simplifications. Most words are isolated, and there may be more than one long pause',
      },
    ],
  },
  pronunciation: {
    key: 'pronunciation',
    title: 'Enabling skill - Pronunciation',
    question:
      'Does your response demonstrate your ability to produce speech sounds in a similar way to most regular speakers of the language?',
    scoringMethod:
      'Pronunciation is scored by determining if your speech is easily understandable to most regular speakers of the language. The best responses contain vowels and consonants pronounced in a native-like way, as well as words and phrases stressed correctly. Responses should also be immediately understandable to a regular speaker of the language.',
    levels: [
      {
        score: 5,
        description:
          'All vowels and consonants are produced in a manner that is easily understood by regular speakers of the language. The speaker uses assimilation and deletions appropriate to continuous speech. Stress is placed correctly in all words and sentence-level stress is fully appropriate',
      },
      {
        score: 4,
        description:
          'Vowels and consonants are produced clearly and unambiguously. A few minor consonant, vowel or stress distortions do not affect intelligibility. All words are easily understandable. A few consonants or consonant sequences may be distorted. Stress is placed correctly on all common words, and sentence level stress is reasonable',
      },
      {
        score: 3,
        description:
          'Most vowels and consonants are pronounced correctly. Some consistent errors might make a few words unclear. A few consonants in certain contexts may be regularly distorted, omitted or mispronounced. Stressdependent vowel reduction may occur on a few words',
      },
      {
        score: 2,
        description:
          'Some consonants and vowels are consistently mispronounced in a nonnative like manner. At least 2/3 of speech is intelligible, but listeners might need to adjust to the accent. Some consonants are regularly omitted, and consonant sequences may be simplified. Stress may be placed incorrectly on some words or be unclear',
      },
      {
        score: 1,
        description:
          'Many consonants and vowels are mispronounced, resulting in a strong intrusive foreign accent. Listeners may have difficulty understanding about 1/3 of the words. Many consonants may be distorted or omitted. Consonant sequences may be non-English. Stress is placed in a non-English manner; unstressed words may be reduced or omitted and a few syllables added or missed',
      },
      {
        score: 0,
        description:
          'Pronunciation seems completely characteristic of another language. Many consonants and vowels are mispronounced, misordered or omitted. Listeners may find more than 1/2 of the speech unintelligible. Stressed and unstressed syllables are realized in a non-English manner. Several words may have the wrong number of syllables',
      },
    ],
  },
};

function getRubricGuide(name: string): RubricGuideItem | null {
  const norm = name.toLowerCase().trim();
  if (norm.includes('content') || norm.includes('nội dung')) return PTE_RUBRIC_GUIDES.content;
  if (norm.includes('fluen') || norm.includes('trôi chảy')) return PTE_RUBRIC_GUIDES.oral_fluency;
  if (norm.includes('pronun') || norm.includes('phát âm')) return PTE_RUBRIC_GUIDES.pronunciation;
  return null;
}

function RubricGuideAccordionContent({ guide }: { guide: RubricGuideItem }) {
  const getBadgeStyle = (score: number) => {
    switch (score) {
      case 5:
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 4:
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 3:
        return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      case 2:
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 1:
        return 'bg-orange-100 text-orange-800 border-orange-300';
      default:
        return 'bg-rose-100 text-rose-800 border-rose-300';
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-slate-200/90 space-y-3 animate-in fade-in slide-in-from-top-1 duration-150">
      {/* Question Header */}
      <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200/70 text-xs space-y-1">
        <span className="font-bold text-blue-900 flex items-center gap-1.5">
          <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
          Câu hỏi định hướng chấm điểm:
        </span>
        <p className="text-blue-800 italic leading-relaxed">
          &ldquo;{guide.question}&rdquo;
        </p>
      </div>

      {/* Scoring Method */}
      <div className="text-[11px] text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-200/60">
        <strong className="text-slate-800">Phương pháp tính điểm: </strong>
        {guide.scoringMethod}
      </div>

      {/* Marks breakdown 0-5 */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
          <BookOpen className="w-3 h-3 text-slate-500" />
          Bảng thang điểm chi tiết (How marks are awarded):
        </span>
        <div className="space-y-1">
          {guide.levels.map((lvl) => (
            <div
              key={lvl.score}
              className="flex items-start gap-2.5 p-2 rounded-lg bg-white border border-slate-200/70 text-xs shadow-2xs"
            >
              <span
                className={`px-2 py-0.5 rounded font-black text-xs shrink-0 border ${getBadgeStyle(
                  lvl.score
                )}`}
              >
                {lvl.score} điểm
              </span>
              <p className="text-slate-700 leading-relaxed text-[11px] pt-0.5">
                {lvl.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const STATUS_CONFIG: Record<ResultStatus, { label: string; bgColor: string; textColor: string }> = {
  PENDING: {
    label: 'Chờ xử lý',
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-700 border-yellow-200',
  },
  REVIEW_REQUIRED: {
    label: 'Cần xem xét',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-700 border-orange-200',
  },
  APPROVED: {
    label: 'Đã duyệt',
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-700 border-emerald-200',
  },
  REJECTED: {
    label: 'Từ chối',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700 border-red-200',
  },
};

export default function GradingPage() {
  const [results, setResults] = useState<GradingResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ResultStatus | 'ALL'>('ALL');

  // Detail Modal state
  const [selectedSession, setSelectedSession] = useState<SessionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [approving, setApproving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sub-modals state
  const [editTranscriptTarget, setEditTranscriptTarget] = useState<{
    attemptId: string;
    sequence: number;
    questionText: string;
    transcript: string;
    confidence?: number | null;
  } | null>(null);

  const [scoreOverrideTarget, setScoreOverrideTarget] = useState<{
    attemptId: string;
    sequence: number;
    questionText: string;
    currentScore: number | null;
    criteria: any[];
  } | null>(null);

  const [requestReEvalTarget, setRequestReEvalTarget] = useState<{
    attemptId: string;
    sequence: number;
    questionText: string;
  } | null>(null);

  // Rubric Accordion state
  const [expandedRubricKey, setExpandedRubricKey] = useState<string | null>(null);
  const [expandedAttemptRubricKey, setExpandedAttemptRubricKey] = useState<string | null>(null);

  const fetchResults = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await teacherService.getResults();

      const rawList = Array.isArray(response)
        ? response
        : Array.isArray((response as any)?.results)
        ? (response as any).results
        : [];

      const resultsList: GradingResult[] = rawList.map((row: any) => {
        const idVal = String(row.id || row.attempt_id || row.session_id || '');
        return {
          id: idVal,
          session_id: idVal,
          attempt_number: row.attempt_number ?? 1,
          student_name: row.student_name || 'Chưa có tên',
          student_id: row.student_id || '',
          exam_name: row.exam_name || row.course_name || 'Bài thi vấn đáp',
          exam_id: row.exam_id,
          ai_score: row.final_score !== undefined && row.final_score !== null ? row.final_score : row.ai_score ?? null,
          status: (
            row.status === 'COMPLETED'
              ? 'APPROVED'
              : row.status === 'REVIEW_REQUIRED'
              ? 'REVIEW_REQUIRED'
              : row.status === 'IN_PROGRESS' || row.status === 'SUBMITTED'
              ? 'PENDING'
              : row.status
          ) as ResultStatus,
          created_at: typeof row.created_at === 'number'
            ? new Date(row.created_at * 1000).toLocaleString('vi-VN')
            : (row.created_at || 'Mới nộp'),
          progress: row.progress || null,
        };
      });

      setResults(resultsList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load grading results');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetail = async (sessionId: string | number) => {
    try {
      setDetailLoading(true);
      const data: any = await teacherService.getResultDetail(String(sessionId));

      // Build attempts list from API response
      let mappedAttempts: AttemptDetail[] = [];

      if (Array.isArray(data.attempts) && data.attempts.length > 0) {
        mappedAttempts = data.attempts.map((att: any, idx: number) => {
          // Build rubric mapping
          const rubricMap = new Map<string, any>();
          if (Array.isArray(att.assessment?.rubric_criteria)) {
            att.assessment.rubric_criteria.forEach((rc: any) => {
              if (rc.name) rubricMap.set(rc.name.toLowerCase().trim(), rc);
            });
          }

          const rawCriteria = att.assessment?.criteria || att.criteria_scores || [];
          const criteria = Array.isArray(rawCriteria)
            ? rawCriteria.map((c: any) => {
                const normName = (c.name || '').toLowerCase().trim();
                const rubricDef = rubricMap.get(normName);
                return {
                  name: c.name || 'Tiêu chí',
                  score: typeof c.score === 'number' ? c.score : 0,
                  max_score: rubricDef?.max_score ?? c.max_score ?? 10,
                  weight: rubricDef?.weight ?? c.weight ?? 0,
                  description: rubricDef?.description || c.description || '',
                  feedback: c.comment || c.feedback || '',
                  comment: c.comment || c.feedback || '',
                };
              })
            : [];

          return {
            id: String(att.id || att.attempt_id || `${data.id || sessionId}_${idx + 1}`),
            sequence: att.sequence ?? (idx + 1),
            stage: att.stage || att.status,
            stage_label: att.stage_label,
            question: {
              text: att.question?.text || att.question_text || `Câu hỏi ${att.sequence ?? (idx + 1)}`,
              topic_id: att.question?.topic_id,
              topic_title: att.question?.topic_title,
            },
            transcript: att.transcript || null,
            stt_confidence: att.stt_confidence ?? null,
            status: att.status || data.status || 'COMPLETED',
            assessment: {
              score: att.assessment?.score ?? att.score ?? null,
              review_required: att.assessment?.review_required,
              reasoning_summary: att.assessment?.reasoning_summary || att.reasoning_summary || att.ai_feedback,
              transcript_edited: att.assessment?.transcript_edited,
              edit_reason: att.assessment?.edit_reason,
              manual_override: att.assessment?.manual_override,
              override_reason: att.assessment?.override_reason,
              override_by: att.assessment?.override_by,
              criteria,
              enhanced_metrics: att.assessment?.enhanced_metrics ?? null,
            },
            evidence: Array.isArray(att.evidence) && att.evidence.length > 0
              ? att.evidence
              : (att.audio_url ? [{
                  id: String(att.id || att.attempt_id || data.id),
                  kind: 'AUDIO',
                  status: 'COMPLETED',
                }] : []),
          };
        });
      } else {
        // Fallback for flat ResultDetail
        mappedAttempts = [{
          id: String(data.id || data.attempt_id || sessionId),
          sequence: 1,
          stage: data.stage || data.status,
          stage_label: data.stage_label,
          question: { text: data.question_text || 'Câu hỏi vấn đáp' },
          transcript: data.transcript || null,
          stt_confidence: data.stt_confidence ?? null,
          status: data.status || 'COMPLETED',
          assessment: {
            score: data.ai_score ?? data.final_score ?? null,
            reasoning_summary: data.ai_feedback || data.reasoning_summary,
            criteria: Array.isArray(data.criteria_scores)
              ? data.criteria_scores.map((c: any) => ({
                  name: c.name,
                  score: c.score,
                  max_score: 10,
                  weight: 0,
                  feedback: c.feedback || c.comment || '',
                }))
              : [],
          },
          evidence: data.audio_url ? [{
            id: String(data.attempt_id || data.id || sessionId),
            kind: 'AUDIO',
            status: 'COMPLETED',
          }] : [],
        }];
      }

      const sessionDetail: SessionDetail = {
        id: String(data.id || data.attempt_id || sessionId),
        exam_name: data.exam_name || data.course_name || 'Bài thi vấn đáp',
        student_name: data.student_name || 'Chưa có tên',
        final_score: data.final_score ?? data.ai_score ?? null,
        status: data.status || 'IN_PROGRESS',
        progress: data.progress || null,
        attempts: mappedAttempts,
      };

      setSelectedSession(sessionDetail);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Lỗi khi tải chi tiết');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleApproveSession = async () => {
    if (!selectedSession) return;
    try {
      setApproving(true);
      await teacherService.approveResult(selectedSession.id);
      setSelectedSession((prev) => (prev ? { ...prev, status: 'COMPLETED' } : null));
      setToastMessage('Đã duyệt điểm chính thức thành công và cập nhật vào hệ thống.');
      setTimeout(() => setToastMessage(null), 4000);
      await fetchResults();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Lỗi khi duyệt điểm');
    } finally {
      setApproving(false);
    }
  };

  const handleAttemptUpdated = (updatedAttempt: any) => {
    if (!selectedSession) return;
    setSelectedSession((prev) => {
      if (!prev) return null;
      const updatedAttempts = prev.attempts.map((att) =>
        att.id === updatedAttempt.id ? { ...att, ...updatedAttempt } : att
      );
      // Re-calculate local session final_score
      const scores = updatedAttempts
        .map((a) => a.assessment?.score)
        .filter((s): s is number => s !== undefined && s !== null);
      const newFinal = scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100 : prev.final_score;

      return {
        ...prev,
        attempts: updatedAttempts,
        final_score: newFinal,
      };
    });
    fetchResults();
  };

  useEffect(() => {
    fetchResults();
  }, []);

  const filteredResults = results.filter((result) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      result.student_name.toLowerCase().includes(query) ||
      result.student_id.toLowerCase().includes(query) ||
      result.exam_name.toLowerCase().includes(query);

    const matchesStatus = statusFilter === 'ALL' || result.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Toast alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 p-4 rounded-xl bg-emerald-600 text-white shadow-xl flex items-center gap-2 text-sm font-semibold animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Hậu kiểm & Thẩm định Chấm thi</h1>
          <p className="text-sm text-slate-500 mt-1">
            Nghe minh chứng âm thanh, đối soát transcript Whisper, can thiệp điểm và yêu cầu thẩm định độc lập.
          </p>
        </div>
        <button
          onClick={() => fetchResults()}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-xl border border-slate-200/80 shadow-sm hover:shadow transition-all disabled:opacity-50 cursor-pointer self-start md:self-auto"
        >
          <RotateCcw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          <span>Làm mới dữ liệu</span>
        </button>
      </div>

      {/* Grading Results */}
      <div className="space-y-6">
          {/* Filters Row */}
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search Bar */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm kiếm theo tên sinh viên, MSSV hoặc tên bài thi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200/80 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as ResultStatus | 'ALL')}
                className="pl-10 pr-8 py-2.5 bg-white border border-slate-200/80 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="REVIEW_REQUIRED">⚠️ Cần xem xét (Review Required)</option>
                <option value="PENDING">Chờ xử lý</option>
                <option value="APPROVED">Đã duyệt điểm</option>
                <option value="REJECTED">Từ chối</option>
              </select>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-16 bg-white rounded-2xl border border-slate-200/80">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              <span className="ml-3 text-slate-600 font-medium">Đang tải danh sách bài thi...</span>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
              <p className="text-red-700 text-sm font-medium">{error}</p>
              <button
                onClick={fetchResults}
                className="mt-3 text-sm text-red-600 hover:text-red-800 font-bold"
              >
                Thử lại
              </button>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && filteredResults.length === 0 && (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                {searchQuery || statusFilter !== 'ALL'
                  ? 'Không tìm thấy kết quả phù hợp'
                  : 'Chưa có bài thi nào cần chấm'}
              </h3>
              <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
                {searchQuery || statusFilter !== 'ALL'
                  ? 'Vui lòng thay đổi từ khóa hoặc bộ lọc trạng thái.'
                  : 'Các bài thi hoàn thành sẽ xuất hiện tại đây sau khi Worker AI hoàn tất phiên âm.'}
              </p>
            </div>
          )}

          {/* Results Table */}
          {!loading && !error && filteredResults.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
                      <th className="px-5 py-4">Sinh viên</th>
                      <th className="px-5 py-4">Bài thi</th>
                      <th className="px-5 py-4 text-center">Điểm AI / Chốt</th>
                      <th className="px-5 py-4 text-center">Trạng thái</th>
                      <th className="px-5 py-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredResults.map((result) => {
                      const statusConfig = STATUS_CONFIG[result.status] || STATUS_CONFIG.PENDING;
                      return (
                        <tr
                          key={result.id}
                          onClick={() => handleOpenDetail(result.session_id)}
                          className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
                                {result.student_name.slice(0, 1)}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-900">{result.student_name}</p>
                                <p className="text-xs text-slate-400 font-mono mt-0.5">{result.student_id}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-slate-800">{result.exam_name}</p>
                              {result.attempt_number ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-[11px] font-bold shrink-0">
                                  Lần {result.attempt_number}
                                </span>
                              ) : null}
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">{result.created_at}</p>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <span className={`inline-flex px-3 py-1 rounded-xl text-sm font-bold ${
                              result.ai_score !== null
                                ? result.ai_score >= 5.0
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-slate-100 text-slate-500'
                            }`}>
                              {result.ai_score !== null ? `${result.ai_score.toFixed(1)} / 10` : 'Đang chấm'}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-center">
                            {result.progress ? (
                              <div className="inline-flex flex-col items-center gap-1.5">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs animate-pulse">
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600 shrink-0" />
                                  <span>{result.progress.stage_label}</span>
                                </span>
                                <div className="w-28 bg-slate-100 rounded-full h-1.5 overflow-hidden border border-slate-200/60">
                                  <div
                                    className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
                                    style={{ width: `${result.progress.percent}%` }}
                                  />
                                </div>
                              </div>
                            ) : (
                              <span
                                className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full border ${statusConfig.bgColor} ${statusConfig.textColor}`}
                              >
                                {result.status === 'REVIEW_REQUIRED' && <AlertTriangle className="w-3.5 h-3.5 text-orange-600" />}
                                {statusConfig.label}
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDetail(result.session_id);
                              }}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-semibold transition-all"
                            >
                              <span>Xem chi tiết</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

      {/* Centered Detail Modal */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6">
          <div className="bg-white w-full max-w-4xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white shrink-0">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedSession(null)}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                  title="Quay lại danh sách"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{selectedSession.student_name}</h3>
                  <p className="text-xs text-slate-500 font-medium">{selectedSession.exam_name}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="text-[11px] text-slate-400 uppercase font-semibold">Điểm tổng kết</span>
                  <p className="text-xl font-black text-blue-600">
                    {selectedSession.final_score !== null ? `${selectedSession.final_score.toFixed(1)}` : 'Chờ chấm'}
                  </p>
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                    selectedSession.status === 'COMPLETED'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {selectedSession.status === 'COMPLETED' ? 'ĐÃ DUYỆT CHÍNH THỨC' : 'CẦN HẬU KIỂM'}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedSession(null)}
                  className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  title="Đóng cửa sổ"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* 1. AI Pipeline Progress Stepper Tracking */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    Tiến trình theo dõi AI chấm điểm:
                  </h4>
                  <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                    Quy trình 4 chặng Celery/Worker
                  </span>
                </div>
                <PipelineProgressStepper
                  stage={
                    selectedSession.status === 'COMPLETED' || selectedSession.status === 'REVIEW_REQUIRED' || selectedSession.final_score !== null
                      ? 'GRADED'
                      : selectedSession.progress?.current_stage || selectedSession.status
                  }
                  stageLabel={
                    selectedSession.status === 'COMPLETED'
                      ? 'Đã hoàn thành toàn bộ quy trình chấm'
                      : selectedSession.status === 'REVIEW_REQUIRED' || selectedSession.final_score !== null
                      ? 'Hoàn tất AI chấm điểm — Sẵn sàng thẩm định'
                      : selectedSession.progress?.stage_label || 'Đang xử lý...'
                  }
                />
              </div>

              {/* Questions & Audio Transcript List */}
              <div className="space-y-6">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Chi tiết từng câu hỏi ({selectedSession.attempts?.length || 0} câu)
                </h4>

                {selectedSession.attempts?.map((att, idx) => {
                  const audioEvidence = att.evidence?.find(
                    (e) => e.kind === 'AUDIO' && e.status === 'COMPLETED'
                  );
                  const isEdited = att.assessment?.transcript_edited;
                  const isOverridden = att.assessment?.manual_override;

                  // Fallback rubric criteria if criteria is empty
                  const hasGradedCriteria = att.assessment?.criteria && att.assessment.criteria.length > 0;
                  const defaultCriteria = (selectedSession as any).snapshot?.criteria || [
                    { name: 'Content', max_score: 5, weight: 1, description: 'Độ chính xác nội dung, độ bao phủ ý và từ khóa chính' },
                    { name: 'Oral Fluency', max_score: 5, weight: 1, description: 'Độ trôi chảy, nhịp điệu phát âm, ngắt nghỉ câu tự nhiên' },
                    { name: 'Pronunciation', max_score: 5, weight: 1, description: 'Độ chuẩn xác nguyên âm, phụ âm và trọng âm từ' },
                  ];
                  const displayCriteria = (hasGradedCriteria ? att.assessment!.criteria! : defaultCriteria).map((c: any) => ({
                    ...c,
                    max_score: c.name.toLowerCase().includes('content') ? 5 : (c.max_score || 5)
                  }));

                  return (
                    <div key={idx} className="p-5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-4">
                      {/* Question Text & Score */}
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="inline-block px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 text-[10px] font-bold uppercase">
                              Câu {att.sequence || idx + 1}
                            </span>
                            {isEdited && (
                              <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 text-[10px] font-bold">
                                Transcript đã hiệu đính
                              </span>
                            )}
                            {isOverridden && (
                              <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold">
                                Điểm đã can thiệp thủ công
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-semibold text-slate-900 mt-1.5 leading-snug">
                            {att.question?.text || 'Nội dung câu hỏi thi vấn đáp'}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-base font-black text-slate-800 whitespace-nowrap">
                            {att.assessment?.score !== undefined && att.assessment?.score !== null
                              ? `${att.assessment.score} đ`
                              : '-'}
                          </span>
                        </div>
                      </div>

                      {/* Processing Stepper if not yet graded */}
                      {(!att.assessment || att.status !== 'GRADED') && (
                        <PipelineProgressStepper
                          stage={att.stage || att.status}
                          stageLabel={att.stage_label || 'Worker đang xử lý...'}
                        />
                      )}

                      {/* Audio Player Evidence */}
                      {audioEvidence && (
                        <div className="space-y-1.5">
                          <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
                            <Headphones className="w-3.5 h-3.5 text-blue-600" />
                            Minh chứng âm thanh thí sinh trả lời:
                          </span>
                          <AudioPlayer
                            evidenceId={audioEvidence.id}
                            sha256={audioEvidence.sha256}
                            size={audioEvidence.size}
                          />
                        </div>
                      )}

                      {/* Transcript Box */}
                      <div className="p-3.5 bg-white rounded-xl border border-slate-200 text-xs leading-relaxed space-y-2">
                        <div className="flex items-center justify-between text-slate-400 font-semibold">
                          <span className="flex items-center gap-1.5 text-slate-700">
                            <Volume2 className="w-3.5 h-3.5 text-blue-600" />
                            Văn bản bóc băng chữ (Transcript):
                          </span>
                          {att.stt_confidence !== null && (
                            <span className="text-emerald-600 font-mono text-[11px]">
                              Độ tin cậy STT: {(att.stt_confidence * 100).toFixed(1)}%
                            </span>
                          )}
                        </div>
                        <p className="text-slate-800 italic bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          &ldquo;{att.transcript || '[Không phát hiện giọng nói hoặc chưa chạy STT]'}&rdquo;
                        </p>

                        {isEdited && att.assessment?.edit_reason && (
                          <p className="text-[11px] text-blue-600 bg-blue-50/50 p-2 rounded border border-blue-100">
                            <strong>Lý do sửa:</strong> {att.assessment.edit_reason} (bởi {att.assessment.override_by || 'Giảng viên'})
                          </p>
                        )}
                      </div>

                      {/* Criteria Assessment Breakdown (With Fallback & Interactive 0-5 Guide) */}
                      <div className="pt-2 border-t border-slate-200/80 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                            <Award className="w-3.5 h-3.5 text-blue-600" />
                            Đánh giá theo Tiêu chí Rubric:
                          </span>
                          <span className="text-[11px] text-slate-400 font-medium">
                            {hasGradedCriteria ? `${displayCriteria.length} tiêu chí đã có điểm` : `${displayCriteria.length} tiêu chí chuẩn đề thi`}
                          </span>
                        </div>
                        <div className="space-y-2.5">
                          {displayCriteria.map((c: any, cIdx: number) => {
                            const guide = getRubricGuide(c.name);
                            const attemptKey = `${att.id}-${c.name}`;
                            const isExpanded = expandedAttemptRubricKey === attemptKey;

                            return (
                              <div
                                key={cIdx}
                                className={`p-3 bg-white rounded-xl border text-xs shadow-2xs space-y-2 transition-all ${
                                  isExpanded
                                    ? 'border-blue-400 ring-2 ring-blue-50'
                                    : 'border-slate-200 hover:border-slate-300'
                                }`}
                              >
                                <div
                                  onClick={() =>
                                    setExpandedAttemptRubricKey(isExpanded ? null : attemptKey)
                                  }
                                  className="flex items-start justify-between gap-2 cursor-pointer select-none"
                                >
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-slate-800 text-[13px]">{c.name}</span>
                                      {c.weight !== undefined && c.weight > 0 && (
                                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-medium border border-slate-200/60">
                                          Trọng số: {c.weight <= 1 ? Math.round(c.weight * 100) : c.weight}%
                                        </span>
                                      )}
                                      <span className="text-[10px] text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 flex items-center gap-1">
                                        <span>{isExpanded ? 'Đóng thang điểm' : 'Xem chuẩn 0-5đ'}</span>
                                        {isExpanded ? (
                                          <ChevronUp className="w-3 h-3 text-blue-600" />
                                        ) : (
                                          <ChevronDown className="w-3 h-3 text-blue-600" />
                                        )}
                                      </span>
                                    </div>
                                    {c.description && (
                                      <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{c.description}</p>
                                    )}
                                  </div>
                                  <span className={`px-2.5 py-1 rounded-lg font-bold text-xs shrink-0 border ${
                                    hasGradedCriteria && c.score !== undefined && c.score !== null
                                      ? 'bg-blue-50 text-blue-700 border-blue-100'
                                      : 'bg-slate-50 text-slate-500 border-slate-200'
                                  }`}>
                                    {hasGradedCriteria && c.score !== undefined && c.score !== null
                                      ? `${c.score} / ${c.max_score || 5} đ`
                                      : `Thang điểm: ${c.max_score || 5} đ`}
                                  </span>
                                </div>
                                {(c.feedback || c.comment) && (
                                  <div className="p-2.5 bg-slate-50/80 rounded-lg border border-slate-100 text-[11px] text-slate-700 leading-relaxed">
                                    <span className="font-semibold text-slate-900">Nhận xét AI: </span>
                                    {c.feedback || c.comment}
                                  </div>
                                )}

                                {isExpanded && guide && <RubricGuideAccordionContent guide={guide} />}
                              </div>
                            );
                          })}
                        </div>
                      </div>


                      {/* Reasoning Summary if available */}
                      {att.assessment?.reasoning_summary && (
                        <div className="p-2.5 bg-amber-50/40 rounded-xl border border-amber-200/70 text-[11px] text-amber-900 leading-relaxed">
                          <strong>AI Nhận xét tổng quan:</strong> {att.assessment.reasoning_summary}
                        </div>
                      )}

                      {/* Question Action Buttons: Sửa transcript, Can thiệp điểm, Yêu cầu thẩm định */}
                      <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-200/60">
                        <button
                          type="button"
                          onClick={() =>
                            setEditTranscriptTarget({
                              attemptId: att.id,
                              sequence: att.sequence || idx + 1,
                              questionText: att.question?.text || '',
                              transcript: att.transcript || '',
                              confidence: att.stt_confidence,
                            })
                          }
                          className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                          <span>Sửa Transcript & Chấm lại</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setScoreOverrideTarget({
                              attemptId: att.id,
                              sequence: att.sequence || idx + 1,
                              questionText: att.question?.text || '',
                              currentScore: att.assessment?.score ?? null,
                              criteria: displayCriteria,
                            })
                          }
                          className="px-3 py-1.5 bg-white hover:bg-amber-50 text-amber-800 border border-amber-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                        >
                          <Sliders className="w-3.5 h-3.5 text-amber-600" />
                          <span>Can thiệp điểm</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setRequestReEvalTarget({
                              attemptId: att.id,
                              sequence: att.sequence || idx + 1,
                              questionText: att.question?.text || '',
                            })
                          }
                          className="px-3 py-1.5 bg-white hover:bg-indigo-50 text-indigo-800 border border-indigo-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                        >
                          <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Yêu cầu Thẩm định</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
              <button
                onClick={() => setSelectedSession(null)}
                className="px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-sm font-semibold transition-all cursor-pointer shadow-2xs"
              >
                Đóng
              </button>
              <button
                onClick={handleApproveSession}
                disabled={approving}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                {approving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang duyệt điểm...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Duyệt điểm chính thức</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Transcript Modal */}
      {editTranscriptTarget && (
        <EditTranscriptModal
          isOpen={true}
          onClose={() => setEditTranscriptTarget(null)}
          attemptId={editTranscriptTarget.attemptId}
          sequence={editTranscriptTarget.sequence}
          questionText={editTranscriptTarget.questionText}
          initialTranscript={editTranscriptTarget.transcript}
          sttConfidence={editTranscriptTarget.confidence}
          onSuccess={(updated) => {
            handleAttemptUpdated(updated);
            setToastMessage('Đã cập nhật transcript và AI đã chấm lại câu hỏi thành công.');
            setTimeout(() => setToastMessage(null), 4000);
          }}
        />
      )}

      {/* Score Override Modal */}
      {scoreOverrideTarget && (
        <ScoreOverrideModal
          isOpen={true}
          onClose={() => setScoreOverrideTarget(null)}
          attemptId={scoreOverrideTarget.attemptId}
          sequence={scoreOverrideTarget.sequence}
          questionText={scoreOverrideTarget.questionText}
          currentScore={scoreOverrideTarget.currentScore}
          initialCriteria={scoreOverrideTarget.criteria}
          onSuccess={(updated) => {
            handleAttemptUpdated(updated);
            setToastMessage('Đã can thiệp và lưu điểm thủ công thành công.');
            setTimeout(() => setToastMessage(null), 4000);
          }}
        />
      )}

      {/* Request Re-Evaluation Modal */}
      {requestReEvalTarget && (
        <RequestReEvalModal
          isOpen={true}
          onClose={() => setRequestReEvalTarget(null)}
          attemptId={requestReEvalTarget.attemptId}
          sequence={requestReEvalTarget.sequence}
          questionText={requestReEvalTarget.questionText}
          onSuccess={() => {
            setToastMessage('Đã gửi yêu cầu thẩm định chấm chéo độc lập thành công.');
            setTimeout(() => setToastMessage(null), 4000);
          }}
        />
      )}
    </div>
  );
}
