'use client';

import { useState, useEffect } from 'react';
import {
  Search,
  Loader2,
  Play,
  Filter,
  CheckCircle,
  AlertTriangle,
  FileText,
  Volume2,
  Sparkles,
  Award,
  ChevronRight,
  User,
  ArrowLeft,
  Headphones
} from 'lucide-react';

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
    criteria?: Array<{
      name: string;
      score: number;
      max_score: number;
      weight: number;
      feedback?: string;
    }>;
  };
  evidence?: Array<{
    id?: string;
    kind: string;
    status: string;
    sha256?: string;
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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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

  // Drawer / Detail state
  const [selectedSession, setSelectedSession] = useState<SessionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchResults = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE_URL}/admin/results`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch results: ${response.status}`);
      }

      const data = await response.json();
      const rawList = Array.isArray(data) ? data : data.results || data.data || [];

      const resultsList: GradingResult[] = rawList.map((row: any) => ({
        id: row.id,
        session_id: row.id,
        student_name: row.student_name || 'Chưa có tên',
        student_id: row.student_id || '',
        exam_name: row.exam_name || 'Bài thi vấn đáp',
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
      const res = await fetch(`${API_BASE_URL}/admin/results/${sessionId}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Không thể tải chi tiết bài thi');
      const data = await res.json();
      setSelectedSession(data);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Lỗi khi tải chi tiết');
    } finally {
      setDetailLoading(false);
    }
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
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Đánh giá & Thẩm định Chấm bài</h1>
          <p className="text-sm text-slate-500 mt-1">
            Hệ thống AI chạy mô hình <strong>Whisper Large-v3 (English)</strong> tự động nhận dạng giọng nói và đối soát Rubric chuyên ngành.
          </p>
        </div>

        <button
          onClick={fetchResults}
          className="self-start md:self-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-all"
        >
          Làm mới danh sách
        </button>
      </div>

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
                  <th className="px-5 py-4 text-center">Điểm AI</th>
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

      {/* Slide-over Detail Modal */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end">
          <div className="bg-white w-full max-w-2xl h-full p-6 md:p-8 shadow-2xl flex flex-col justify-between overflow-y-auto">
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
                  <span className="text-xs text-slate-400 uppercase font-semibold">Điểm tổng</span>
                  <p className="text-2xl font-black text-blue-600">
                    {selectedSession.final_score !== null ? `${selectedSession.final_score.toFixed(1)}` : 'Chờ chấm'}
                  </p>
                </div>
              </div>

              {/* STT Engine Badge */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 text-xs">
                <div className="flex items-center gap-2 text-blue-800 font-semibold">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span>Mô hình STT: Whisper Large-v3 (English - 32 Layers)</span>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-white text-blue-700 font-bold border border-blue-200">
                  Zero-Client Leak
                </span>
              </div>

              {/* Questions & Audio Transcript List */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Chi tiết từng câu hỏi ({selectedSession.attempts?.length || 0} câu)
                </h4>

                {selectedSession.attempts?.map((att, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="inline-block px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 text-[10px] font-bold uppercase">
                          Câu {att.sequence || idx + 1}
                        </span>
                        <p className="text-sm font-semibold text-slate-900 mt-1">
                          {att.question?.text || 'Nội dung câu hỏi thi vấn đáp'}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-slate-800 whitespace-nowrap">
                        {att.assessment?.score !== undefined && att.assessment?.score !== null
                          ? `${att.assessment.score} đ`
                          : '-'}
                      </span>
                    </div>

                    {/* Audio Player & Transcript Box */}
                    <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs leading-relaxed space-y-2">
                      {att.evidence && att.evidence.some((e) => e.kind === "AUDIO" && e.id) && (
                        <div className="p-2 bg-slate-50 rounded border border-slate-200 flex flex-col gap-1.5">
                          <div className="flex items-center gap-1.5 text-slate-700 font-semibold text-[11px]">
                            <Headphones className="w-3.5 h-3.5 text-blue-600" />
                            <span>Ghi âm câu trả lời (MinIO Evidence):</span>
                          </div>
                          {att.evidence
                            .filter((e) => e.kind === "AUDIO" && e.id)
                            .map((ev) => (
                              <audio
                                key={ev.id}
                                controls
                                preload="metadata"
                                className="w-full h-8"
                                src={`${API_BASE_URL}/api/evidence/${ev.id}/content`}
                              />
                            ))}
                        </div>
                      )}
                      <div className="flex items-center justify-between text-slate-400 mb-1.5 font-semibold">
                        <span className="flex items-center gap-1.5 text-slate-600">
                          <Volume2 className="w-3.5 h-3.5 text-blue-600" />
                          Phiên âm tiếng Anh (Transcript):
                        </span>
                        {att.stt_confidence !== null && (
                          <span className="text-emerald-600 font-mono text-[11px]">
                            Confidence: {(att.stt_confidence * 100).toFixed(1)}%
                          </span>
                        )}
                      </div>
                      <p className="text-slate-800 italic">
                        &ldquo;{att.transcript || '[Không phát hiện giọng nói hoặc chưa chạy STT]'}&rdquo;
                      </p>
                    </div>

                    {/* Criteria Assessment Breakdown */}
                    {att.assessment?.criteria && att.assessment.criteria.length > 0 && (
                      <div className="pt-2 border-t border-slate-200/80 space-y-2">
                        <span className="text-[11px] font-bold text-slate-500 uppercase">Đánh giá tiêu chí Rubric:</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {att.assessment.criteria.map((c, cIdx) => (
                            <div key={cIdx} className="p-2 bg-white rounded-lg border border-slate-200 text-xs">
                              <div className="flex justify-between font-semibold">
                                <span className="text-slate-700">{c.name}</span>
                                <span className="text-blue-600">{c.score}/{c.max_score}</span>
                              </div>
                              {c.feedback && (
                                <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{c.feedback}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
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
                onClick={() => {
                  alert('Điểm của sinh viên đã được phê duyệt và lưu vào sổ điểm.');
                  setSelectedSession(null);
                }}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-blue-500/20"
              >
                Duyệt điểm chính thức
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
