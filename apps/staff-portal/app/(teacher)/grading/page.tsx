'use client';

import { useState, useEffect } from 'react';
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
  AlertCircle
} from 'lucide-react';
import { AudioPlayer } from './components/AudioPlayer';
import { EditTranscriptModal } from './components/EditTranscriptModal';
import { ScoreOverrideModal } from './components/ScoreOverrideModal';
import { RequestReEvalModal } from './components/RequestReEvalModal';
import { ReEvaluationsList } from './components/ReEvaluationsList';
import { teacherService } from '@/services';

type ResultStatus = 'PENDING' | 'REVIEW_REQUIRED' | 'APPROVED' | 'REJECTED';

interface GradingResult {
  id: string | number;
  student_name: string;
  student_id: string;
  exam_name: string;
  exam_id: string | number;
  ai_score: number | null;
  status: ResultStatus;
  session_id: string | number;
  created_at: string;
}

interface AttemptDetail {
  id: string;
  sequence: number;
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
      weight: number;
      feedback?: string;
    }>;
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
  attempts: AttemptDetail[];
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
  const [activeTab, setActiveTab] = useState<'RESULTS' | 'RE_EVALUATION'>('RESULTS');
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

  const fetchResults = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await teacherService.getResults();

      const rawList = Array.isArray(response.results) ? response.results : [];

      const resultsList: GradingResult[] = rawList.map((row: any) => ({
        id: row.attempt_id,
        session_id: row.attempt_id,
        student_name: row.student_name || 'Chưa có tên',
        student_id: row.student_id || '',
        exam_name: row.course_name || row.exam_name || 'Bài thi vấn đáp',
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
      }));

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
      const data = await teacherService.getResultDetail(String(sessionId));
      // Map ResultDetail to SessionDetail format for the UI
      const sessionDetail: SessionDetail = {
        id: data.attempt_id,
        exam_name: data.exam_name || data.course_name || 'Bài thi vấn đáp',
        student_name: data.student_name,
        final_score: data.final_score ?? data.ai_score ?? null,
        status: data.status === 'COMPLETED' ? 'COMPLETED' : 'IN_PROGRESS',
        attempts: [{
          id: data.attempt_id,
          sequence: 1,
          question: { text: data.question_text || 'Câu hỏi vấn đáp' },
          transcript: data.transcript,
          stt_confidence: data.stt_confidence,
          status: data.status,
          assessment: {
            score: data.ai_score,
            reasoning_summary: data.ai_feedback,
            criteria: data.criteria_scores?.map((c) => ({
              name: c.name,
              score: c.score,
              max_score: 10,
              weight: 0,
            })),
          },
          evidence: data.audio_url ? [{
            id: data.attempt_id,
            kind: 'AUDIO',
            status: 'COMPLETED',
            sha256: undefined,
            size: undefined,
          }] : [],
        }],
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

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('RESULTS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'RESULTS'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            01 · Danh sách bài thi ({results.length})
          </button>
          <button
            onClick={() => setActiveTab('RE_EVALUATION')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'RE_EVALUATION'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            02 · Thẩm định độc lập (Blind Marking)
          </button>
        </div>
      </div>

      {/* TAB CONTENT 2: ReEvaluations */}
      {activeTab === 'RE_EVALUATION' && (
        <ReEvaluationsList />
      )}

      {/* TAB CONTENT 1: Grading Results */}
      {activeTab === 'RESULTS' && (
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
                            <p className="text-sm font-medium text-slate-800">{result.exam_name}</p>
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
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full border ${statusConfig.bgColor} ${statusConfig.textColor}`}
                            >
                              {result.status === 'REVIEW_REQUIRED' && <AlertTriangle className="w-3.5 h-3.5 text-orange-600" />}
                              {statusConfig.label}
                            </span>
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
      )}

      {/* Slide-over Detail Modal */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end">
          <div className="bg-white w-full max-w-3xl h-full p-6 md:p-8 shadow-2xl flex flex-col justify-between overflow-y-auto">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between border-b pb-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedSession(null)}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{selectedSession.student_name}</h3>
                    <p className="text-xs text-slate-500 font-medium">{selectedSession.exam_name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 uppercase font-semibold">Điểm tổng kết</span>
                  <p className="text-2xl font-black text-blue-600">
                    {selectedSession.final_score !== null ? `${selectedSession.final_score.toFixed(1)}` : 'Chờ chấm'}
                  </p>
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold mt-1 ${
                    selectedSession.status === 'COMPLETED'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {selectedSession.status === 'COMPLETED' ? 'ĐÃ DUYỆT CHÍNH THỨC' : 'CẦN HẬU KIỂM'}
                  </span>
                </div>
              </div>

              {/* STT Engine Badge */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 text-xs">
                <div className="flex items-center gap-2 text-blue-800 font-semibold">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span>Mô hình STT: Faster-Whisper Base/Large-v3 (Zero Client Leak)</span>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-white text-blue-700 font-bold border border-blue-200">
                  RAG-Assisted Grading
                </span>
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

                      {/* Criteria Assessment Breakdown */}
                      {att.assessment?.criteria && att.assessment.criteria.length > 0 && (
                        <div className="pt-2 border-t border-slate-200/80 space-y-2">
                          <span className="text-[11px] font-bold text-slate-500 uppercase">
                            Đánh giá tiêu chí Rubric:
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {att.assessment.criteria.map((c, cIdx) => (
                              <div key={cIdx} className="p-2.5 bg-white rounded-xl border border-slate-200 text-xs">
                                <div className="flex justify-between font-semibold">
                                  <span className="text-slate-700">{c.name}</span>
                                  <span className="text-blue-600 font-bold">{c.score}/{c.max_score} đ</span>
                                </div>
                                {c.feedback && (
                                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">{c.feedback}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

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
                          className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs"
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
                              criteria: att.assessment?.criteria || [],
                            })
                          }
                          className="px-3 py-1.5 bg-white hover:bg-amber-50 text-amber-800 border border-amber-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs"
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
                          className="px-3 py-1.5 bg-white hover:bg-indigo-50 text-indigo-800 border border-indigo-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs"
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

            {/* Bottom Actions */}
            <div className="pt-6 border-t mt-6 flex gap-3">
              <button
                onClick={() => setSelectedSession(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-all"
              >
                Đóng
              </button>
              <button
                onClick={handleApproveSession}
                disabled={approving}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2"
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
