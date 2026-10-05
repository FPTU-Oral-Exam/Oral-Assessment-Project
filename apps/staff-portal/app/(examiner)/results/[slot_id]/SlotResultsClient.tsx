'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Download,
  Lock,
  Unlock,
  Users,
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  RefreshCw,
  FileText,
  Star,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface AttemptDetail {
  id: string;
  sequence: number;
  transcript: string | null;
  stt_confidence: number | null;
  grading_message: string | null;
  score: number | null;
  status: string;
}

interface StudentResult {
  student_id: string;
  username: string;
  name: string;
  score_ai: number | null;
  score_final: number | null;
  score_review: number | null;
  status: string;
  attempts?: AttemptDetail[];
}

interface Slot {
  id: string;
  slot_number: number;
  room: string;
  date: number;
  start_time: string;
  end_time: string;
  status: string;
  grade_locked: boolean;
  exam_id?: string;
}

interface ExamInfo {
  id: string;
  name: string;
}

interface CourseInfo {
  id: string;
  name: string;
}

interface ReviewRequestModal {
  studentId: string;
  studentName: string;
  attemptId: string;
}

export default function SlotResultsClient({ slotId }: { slotId: string }) {
  const [results, setResults] = useState<StudentResult[]>([]);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [exam, setExam] = useState<ExamInfo | null>(null);
  const [course, setCourse] = useState<CourseInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingLock, setTogglingLock] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [loadingAttempts, setLoadingAttempts] = useState<string | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewModal, setReviewModal] = useState<ReviewRequestModal | null>(null);
  const [teachers, setTeachers] = useState<Array<{ id: string; name: string; username: string }>>([]);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    teacher_id_2: '',
    reason: 'GRADE_DISPUTE' as 'RECONTROLL' | 'GRADE_DISPUTE' | 'EXAMINER_REQUEST',
    reason_detail: '',
    blind_marking: true,
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch slot details and results in parallel
      const [slotRes, resultsRes] = await Promise.all([
        fetch(`/api/examiner/slots/${slotId}`, { credentials: 'include' }),
        fetch(`/api/examiner/slots/${slotId}/results`, { credentials: 'include' }),
      ]);

      if (!slotRes.ok) throw new Error(`Lỗi server: ${slotRes.status}`);
      if (!resultsRes.ok) throw new Error(`Lỗi server: ${resultsRes.status}`);

      const slotData = await slotRes.json();
      const resultsData = await resultsRes.json();

      setSlot(slotData);
      setResults(Array.isArray(resultsData) ? resultsData : []);

      // Fetch exam and course info if slot has exam_id
      if (slotData.exam_id) {
        const examRes = await fetch(`/api/examiner/exams/${slotData.exam_id}`, { credentials: 'include' });
        if (examRes.ok) {
          const examData = await examRes.json();
          setExam(examData);
          if (examData.course_id) {
            const courseRes = await fetch(`/api/examiner/courses/${examData.course_id}`, { credentials: 'include' });
            if (courseRes.ok) {
              const courseData = await courseRes.json();
              setCourse(courseData);
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }, [slotId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleExport = async () => {
    try {
      const res = await fetch(`/api/examiner/slots/${slotId}/export`, { credentials: 'include' });
      if (!res.ok) throw new Error('Xuất FAP thất bại');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `FAP_Ca${slot?.slot_number ?? slotId}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Đã tải file FAP');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xuất FAP thất bại');
    }
  };

  const handleLockToggle = async () => {
    if (!slot) return;
    setTogglingLock(true);
    try {
      const endpoint = slot.grade_locked ? 'unlock' : 'lock';
      const res = await fetch(`/api/examiner/slots/${slotId}/${endpoint}`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`${slot.grade_locked ? 'Mở khóa' : 'Khóa'} thất bại`);
      toast.success(slot.grade_locked ? 'Đã mở khóa sổ điểm' : 'Đã khóa sổ điểm');
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Thao tác thất bại');
    } finally {
      setTogglingLock(false);
    }
  };

  const formatDate = (ts: number) => {
    if (!ts) return '—';
    return new Date(ts * 1000).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const fetchAttempts = async (studentId: string) => {
    setLoadingAttempts(studentId);
    try {
      const res = await fetch(`/api/examiner/students/${studentId}/attempts?exam_id=${slot?.exam_id}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Khong the tai chi tiet');
      const data = await res.json();
      setResults((prev) =>
        prev.map((r) =>
          r.student_id === studentId ? { ...r, attempts: Array.isArray(data) ? data : [] } : r
        )
      );
    } catch {
      toast.error('Khong the tai chi tiet buoi thi');
    } finally {
      setLoadingAttempts(null);
    }
  };

  const fetchTeachers = async () => {
    try {
      const res = await fetch('/api/admin/users?role=TEACHER', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      setTeachers(Array.isArray(data) ? data : []);
    } catch {
      // Silently fail
    }
  };

  const openReviewModal = (result: StudentResult, attempt: AttemptDetail) => {
    setReviewModal({
      studentId: result.student_id,
      studentName: result.name,
      attemptId: attempt.id,
    });
    setReviewForm({
      teacher_id_2: '',
      reason: 'GRADE_DISPUTE',
      reason_detail: '',
      blind_marking: true,
    });
    fetchTeachers();
    setShowReviewModal(true);
  };

  const handleSubmitReview = async () => {
    if (!reviewModal || !reviewForm.teacher_id_2 || !reviewForm.reason_detail.trim()) {
      toast.error('Vui long dien day du thong tin');
      return;
    }
    setSubmittingReview(true);
    try {
      const res = await fetch(`/api/examiner/attempts/${reviewModal.attemptId}/request-re-eval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(reviewForm),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Yeu cau phuc khao that bai' }));
        throw new Error(err.message || err.detail || 'Yeu cau phuc khao that bai');
      }
      toast.success('Da gui yeu cau phuc khao thanh cong');
      setShowReviewModal(false);
      setReviewModal(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Yeu cau phuc khao that bai');
    } finally {
      setSubmittingReview(false);
    }
  };

  const toggleRow = (studentId: string, attempts?: AttemptDetail[]) => {
    if (expandedRow === studentId) {
      setExpandedRow(null);
    } else {
      setExpandedRow(studentId);
      if (!attempts || attempts.length === 0) {
        fetchAttempts(studentId);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-3">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <div className="text-slate-500 font-medium text-sm">Đang tải kết quả thi...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
        <p className="text-sm font-semibold text-red-900 mb-4">{error}</p>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition"
        >
          Thử lại
        </button>
      </div>
    );
  }

  const completed = results.filter((r) => r.status === 'COMPLETED').length;
  const needsReview = results.filter((r) => r.status === 'REVIEW_REQUIRED').length;
  const notStarted = results.filter((r) => r.status === 'NOT_STARTED' || r.status === 'IN_PROGRESS').length;

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/results"
        className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Quay lại danh sách ca thi
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            {course && <span>{course.name}</span>}
            {course && exam && <span>•</span>}
            {exam && <span>{exam.name}</span>}
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Kết quả Ca {slot?.slot_number}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {formatDate(slot?.date ?? 0)} • {slot?.start_time} - {slot?.end_time} • {slot?.room}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl shadow-xs transition"
          >
            <Download className="w-4 h-4" />
            Xuất FAP
          </button>
          <button
            onClick={handleLockToggle}
            disabled={togglingLock}
            className={`inline-flex items-center gap-2 font-semibold text-sm px-4 py-2.5 rounded-xl shadow-xs transition disabled:opacity-50 disabled:cursor-not-allowed ${
              slot?.grade_locked
                ? 'bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
            }`}
          >
            {togglingLock ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : slot?.grade_locked ? (
              <Unlock className="w-4 h-4" />
            ) : (
              <Lock className="w-4 h-4" />
            )}
            {slot?.grade_locked ? 'Mở khóa sổ' : 'Khóa sổ điểm'}
          </button>
        </div>
      </div>

      {/* Lock Status Banner */}
      {slot?.grade_locked && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <Lock className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-900">Sổ điểm đã bị khóa</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Không thể thay đổi điểm khi sổ điểm đang bị khóa. Nhấn "Mở khóa sổ" để chỉnh sửa.
            </p>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-500 font-medium">Tổng SV</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{results.length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-xs text-slate-500 font-medium">Hoàn thành</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{completed}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="w-4 h-4 text-yellow-500" />
            <span className="text-xs text-slate-500 font-medium">Cần phúc khảo</span>
          </div>
          <p className="text-2xl font-bold text-yellow-600">{needsReview}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-500 font-medium">Chưa thi</span>
          </div>
          <p className="text-2xl font-bold text-slate-600">{notStarted}</p>
        </div>
      </div>

      {/* Results Table */}
      {results.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-700">Chưa có kết quả</h3>
          <p className="text-sm text-slate-500 mt-1">
            Chưa có sinh viên nào trong ca thi này hoặc chưa có kết quả chấm thi.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600 w-10">
                    {/* Expand toggle */}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                    MSSV
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                    Họ tên
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-600">
                    Điểm AI
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-600">
                    Điểm CK
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-600">
                    Điểm PK
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-600">
                    Trạng thái
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {results.map((result) => {
                  const isExpanded = expandedRow === result.student_id;
                  return (
                    <>
                      <tr key={result.student_id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <button
                            onClick={() => toggleRow(result.student_id, result.attempts)}
                            className="p-1 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
                            title="Xem chi tiet"
                          >
                            {loadingAttempts === result.student_id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-sm font-semibold text-slate-700">
                            {result.username}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-900">{result.name}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {result.score_ai !== null ? (
                            <span className="font-bold text-slate-900">{result.score_ai.toFixed(1)}</span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {result.score_final !== null ? (
                            <span className="font-bold text-blue-600">{result.score_final.toFixed(1)}</span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {result.score_review !== null ? (
                            <span className="font-bold text-violet-600">{result.score_review.toFixed(1)}</span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {result.status === 'COMPLETED' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                              <CheckCircle className="w-3.5 h-3.5" />
                              Hoan thanh
                            </span>
                          ) : result.status === 'REVIEW_REQUIRED' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700">
                              <AlertCircle className="w-3.5 h-3.5" />
                              Can phuc khao
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                              <AlertCircle className="w-3.5 h-3.5" />
                              {result.status === 'NOT_STARTED' ? 'Chua thi' : 'Dang thi'}
                            </span>
                          )}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${result.student_id}-detail`}>
                          <td colSpan={7} className="px-4 py-4 bg-slate-50">
                            {result.attempts && result.attempts.length > 0 ? (
                              <div className="space-y-4">
                                {result.attempts.map((attempt) => (
                                  <div
                                    key={attempt.id}
                                    className="bg-white rounded-xl border border-slate-200 p-4 space-y-3"
                                  >
                                    {/* Attempt Header */}
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                          <FileText className="w-4 h-4 text-blue-600" />
                                        </div>
                                        <div>
                                          <p className="text-sm font-bold text-slate-900">
                                            Cau hoi {attempt.sequence}
                                          </p>
                                          <p className="text-xs text-slate-500">
                                            Diem:{' '}
                                            <span className="font-bold text-blue-600">
                                              {attempt.score !== null ? attempt.score.toFixed(1) : '—'}
                                            </span>
                                          </p>
                                        </div>
                                      </div>
                                      <button
                                        onClick={() => openReviewModal(result, attempt)}
                                        className="inline-flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition"
                                      >
                                        <RefreshCw className="w-3.5 h-3.5" />
                                        Yeu cau phuc khao
                                      </button>
                                    </div>

                                    {/* STT Confidence */}
                                    {attempt.stt_confidence !== null && (
                                      <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2 text-xs text-slate-600">
                                          <MessageSquare className="w-4 h-4 text-slate-400" />
                                          <span>STT Confidence:</span>
                                          <span
                                            className={`font-bold ${
                                              attempt.stt_confidence >= 0.8
                                                ? 'text-emerald-600'
                                                : attempt.stt_confidence >= 0.5
                                                ? 'text-amber-600'
                                                : 'text-red-600'
                                            }`}
                                          >
                                            {(attempt.stt_confidence * 100).toFixed(0)}%
                                          </span>
                                          <div className="w-24 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                            <div
                                              className={`h-full rounded-full ${
                                                attempt.stt_confidence >= 0.8
                                                  ? 'bg-emerald-500'
                                                  : attempt.stt_confidence >= 0.5
                                                  ? 'bg-amber-500'
                                                  : 'bg-red-500'
                                              }`}
                                              style={{ width: `${attempt.stt_confidence * 100}%` }}
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                    {/* Transcript */}
                                    {attempt.transcript && (
                                      <div>
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                                          Phiem am (Transcript)
                                        </p>
                                        <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-700 italic max-h-32 overflow-y-auto">
                                          "{attempt.transcript}"
                                        </div>
                                      </div>
                                    )}

                                    {/* Grading Message */}
                                    {attempt.grading_message && (
                                      <div>
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                                          Nhan xet cua AI
                                        </p>
                                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-800">
                                          {attempt.grading_message}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-8">
                                <Loader2 className="w-6 h-6 text-slate-400 mx-auto mb-2 animate-spin" />
                                <p className="text-sm text-slate-500">Dang tai chi tiet...</p>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Re-evaluation Request Modal */}
      {showReviewModal && reviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowReviewModal(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Yeu cau phuc khao</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Sinh vien: {reviewModal.studentName}
                </p>
              </div>
              <button
                onClick={() => setShowReviewModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-4">
              {/* Teacher Selection */}
              <div>
                <label
                  htmlFor="review_teacher"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                >
                  Giang vien phuc khao <span className="text-red-500">*</span>
                </label>
                <select
                  id="review_teacher"
                  value={reviewForm.teacher_id_2}
                  onChange={(e) => setReviewForm({ ...reviewForm, teacher_id_2: e.target.value })}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="">-- Chon giang vien --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.username})
                    </option>
                  ))}
                </select>
              </div>

              {/* Reason */}
              <div>
                <label
                  htmlFor="review_reason"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                >
                  Ly do <span className="text-red-500">*</span>
                </label>
                <select
                  id="review_reason"
                  value={reviewForm.reason}
                  onChange={(e) =>
                    setReviewForm({
                      ...reviewForm,
                      reason: e.target.value as 'RECONTROLL' | 'GRADE_DISPUTE' | 'EXAMINER_REQUEST',
                    })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="GRADE_DISPUTE">Khang truc diem</option>
                  <option value="RECONTROLL">Yeu cau cham lai</option>
                  <option value="EXAMINER_REQUEST">Yeu cau tu giang vien</option>
                </select>
              </div>

              {/* Reason Detail */}
              <div>
                <label
                  htmlFor="review_detail"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                >
                  Mo ta chi tiet <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="review_detail"
                  value={reviewForm.reason_detail}
                  onChange={(e) => setReviewForm({ ...reviewForm, reason_detail: e.target.value })}
                  required
                  minLength={5}
                  rows={3}
                  placeholder="Nhap chi tiet ly do phuc khao..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                />
              </div>

              {/* Blind Marking */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="blind_marking"
                  checked={reviewForm.blind_marking}
                  onChange={(e) => setReviewForm({ ...reviewForm, blind_marking: e.target.checked })}
                  className="w-4 h-4 text-violet-600 border-slate-300 rounded focus:ring-violet-500"
                />
                <label htmlFor="blind_marking" className="text-sm text-slate-700">
                  Blind marking (Giang vien phuc khao khong biet nguoi cham truoc)
                </label>
              </div>

              {/* Notice */}
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
                <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  Yeu cau phuc khao se duoc gui den giang vien duoc chon. Vui long dam bao thong tin
                  chinh xac truoc khi gui.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 p-4 border-t border-slate-200 bg-slate-50">
              <button
                onClick={() => setShowReviewModal(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Huy
              </button>
              <button
                onClick={handleSubmitReview}
                disabled={
                  submittingReview || !reviewForm.teacher_id_2 || !reviewForm.reason_detail.trim()
                }
                className="inline-flex items-center gap-2 px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl shadow-xs transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submittingReview && <Loader2 className="w-4 h-4 animate-spin" />}
                {submittingReview ? 'Dang gui...' : 'Gui yeu cau phuc khao'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
