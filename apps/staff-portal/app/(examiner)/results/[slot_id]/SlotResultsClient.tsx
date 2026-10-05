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
  Volume2,
  HelpCircle,
  ShieldCheck,
  Award,
  Clock,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface AttemptDetail {
  id: string;
  sequence: number;
  question?: string | null;
  transcript: string | null;
  stt_confidence: number | null;
  grading_message: string | null;
  score: number | null;
  status: string;
  audio_url?: string | null;
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
  course_id?: string;
}

interface CourseInfo {
  id: string;
  name: string;
  code: string;
}

interface ReviewRequestModal {
  studentId: string;
  studentName: string;
  attemptId: string;
  sequence: number;
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

  // Re-evaluation modal state
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
      setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu ca thi');
    } finally {
      setLoading(false);
    }
  }, [slotId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Export FAP Excel
  const handleExport = async () => {
    try {
      const res = await fetch(`/api/examiner/slots/${slotId}/export`, { credentials: 'include' });
      if (!res.ok) throw new Error('Xuất FAP thất bại');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `FAP_${course?.code || 'Course'}_Ca${slot?.slot_number ?? slotId}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Đã tải bảng điểm Excel chuẩn FAP');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xuất FAP thất bại');
    }
  };

  // Lock / Unlock gradebook
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
      toast.success(slot.grade_locked ? 'Đã mở khóa sổ điểm' : 'Đã khóa sổ điểm ca thi');
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

  // Fetch attempt details (audio, transcript, STT confidence, AI message)
  const fetchAttempts = async (studentId: string) => {
    setLoadingAttempts(studentId);
    try {
      const res = await fetch(`/api/examiner/students/${studentId}/attempts?exam_id=${slot?.exam_id}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Không thể tải chi tiết');
      const data = await res.json();
      setResults((prev) =>
        prev.map((r) =>
          r.student_id === studentId ? { ...r, attempts: Array.isArray(data) ? data : [] } : r
        )
      );
    } catch {
      toast.error('Không thể tải chi tiết bài thi của sinh viên');
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
      // Ignore
    }
  };

  const openReviewModal = (result: StudentResult, attempt: AttemptDetail) => {
    setReviewModal({
      studentId: result.student_id,
      studentName: result.name,
      attemptId: attempt.id,
      sequence: attempt.sequence,
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

  // Submit Blind Re-evaluation request
  const handleSubmitReview = async () => {
    if (!reviewModal || !reviewForm.teacher_id_2 || !reviewForm.reason_detail.trim()) {
      toast.error('Vui lòng chọn giảng viên và nhập đầy đủ lý do');
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
        const err = await res.json().catch(() => ({ message: 'Yêu cầu phúc khảo thất bại' }));
        throw new Error(err.message || err.detail || 'Yêu cầu phúc khảo thất bại');
      }

      toast.success('Đã gửi yêu cầu phúc khảo chấm mù thành công cho giảng viên thứ 2');
      setShowReviewModal(false);
      setReviewModal(null);
      fetchData();
      if (reviewModal.studentId) {
        fetchAttempts(reviewModal.studentId);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Yêu cầu phúc khảo thất bại');
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
      <div className="flex flex-col items-center justify-center py-24 space-y-3">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <div className="text-slate-500 font-medium text-sm">Đang tải kết quả ca thi...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center max-w-lg mx-auto">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
        <p className="text-sm font-semibold text-red-900 mb-4">{error}</p>
        <button
          onClick={fetchData}
          className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition"
        >
          Thử lại
        </button>
      </div>
    );
  }

  const completed = results.filter((r) => r.status === 'COMPLETED').length;
  const needsReview = results.filter((r) => r.status === 'REVIEW_REQUIRED').length;
  const inProgress = results.filter((r) => r.status === 'IN_PROGRESS').length;
  const notStarted = results.filter((r) => r.status === 'NOT_STARTED').length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Back to Results Dashboard */}
      <Link
        href="/results"
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Quay lại Bảng điều khiển Kết quả
      </Link>

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1 flex-wrap">
            {course && (
              <span className="font-mono font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                {course.code}
              </span>
            )}
            {course && <span>•</span>}
            {course && <span className="font-medium text-slate-700">{course.name}</span>}
            {exam && <span>•</span>}
            {exam && <span className="text-slate-600">{exam.name}</span>}
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Chi tiết Kết quả Ca {slot?.slot_number}</h1>
          <p className="text-sm text-slate-500 mt-1">
            Ngày thi: {formatDate(slot?.date ?? 0)} • {slot?.start_time} - {slot?.end_time} • Phòng {slot?.room}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl shadow-xs transition"
          >
            <Download className="w-4 h-4" />
            Xuất Bảng điểm FAP
          </button>
          <button
            onClick={handleLockToggle}
            disabled={togglingLock}
            className={`inline-flex items-center gap-2 font-semibold text-sm px-4 py-2.5 rounded-xl shadow-xs transition disabled:opacity-50 disabled:cursor-not-allowed ${
              slot?.grade_locked
                ? 'bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
            }`}
          >
            {togglingLock ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : slot?.grade_locked ? (
              <Unlock className="w-4 h-4" />
            ) : (
              <Lock className="w-4 h-4" />
            )}
            {slot?.grade_locked ? 'Mở khóa sổ điểm' : 'Khóa sổ điểm'}
          </button>
        </div>
      </div>

      {/* Gradebook Locked Warning Banner */}
      {slot?.grade_locked && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <Lock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-900">Sổ điểm ca thi đang bị khóa</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Toàn bộ điểm số trong ca thi này đã được đóng băng. Giảng viên không thể chỉnh sửa điểm bài thi trừ khi Khảo thí hoặc Quản trị viên mở khóa sổ điểm.
            </p>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Sĩ số ca</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{results.length}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Đã hoàn thành</span>
          </div>
          <p className="text-2xl font-bold text-emerald-600">{completed}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Cần phúc khảo</span>
          </div>
          <p className="text-2xl font-bold text-amber-600">{needsReview}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Chưa thi / Đang thi</span>
          </div>
          <p className="text-2xl font-bold text-slate-600">{notStarted + inProgress}</p>
        </div>
      </div>

      {/* Student Results Table */}
      {results.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-700">Chưa có sinh viên nào trong ca thi</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
            Ca thi này chưa có sinh viên được gán hoặc chưa có lượt thi nào được ghi nhận.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Danh sách Thí sinh & Điểm số</h2>
              <p className="text-xs text-slate-500">
                Nhấn vào từng hàng để nghe lại audio MinIO, đối chiếu transcript PhoWhisper và xem nhận xét AI.
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-500">{results.length} sinh viên</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-600 w-12 text-center">
                    #
                  </th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-600">
                    MSSV
                  </th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-600">
                    Họ và tên
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-600">
                    Điểm AI
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-600">
                    Điểm Chốt (CK)
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-600">
                    Điểm Phúc khảo (PK)
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-600">
                    Trạng thái
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-600">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {results.map((result, idx) => {
                  const isExpanded = expandedRow === result.student_id;

                  return (
                    <>
                      <tr
                        key={result.student_id}
                        className={`hover:bg-slate-50 transition-colors cursor-pointer ${
                          isExpanded ? 'bg-blue-50/40' : ''
                        }`}
                        onClick={() => toggleRow(result.student_id, result.attempts)}
                      >
                        <td className="px-4 py-3.5 text-center text-xs font-mono text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                            {result.username}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-sm font-semibold text-slate-900">{result.name}</span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {result.score_ai !== null ? (
                            <span className="font-bold text-slate-800 text-sm">{result.score_ai.toFixed(1)}</span>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {result.score_final !== null ? (
                            <span className="font-bold text-blue-600 text-sm">{result.score_final.toFixed(1)}</span>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {result.score_review !== null ? (
                            <span className="font-bold text-violet-600 text-sm bg-violet-50 px-2 py-0.5 rounded">
                              {result.score_review.toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {result.status === 'COMPLETED' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                              <CheckCircle className="w-3 h-3" />
                              Hoàn thành
                            </span>
                          ) : result.status === 'REVIEW_REQUIRED' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                              <AlertCircle className="w-3 h-3" />
                              Cần phúc khảo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                              {result.status === 'NOT_STARTED' ? 'Chưa thi' : 'Đang thi'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleRow(result.student_id, result.attempts);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                          >
                            {loadingAttempts === result.student_id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : isExpanded ? (
                              <>
                                Thu gọn
                                <ChevronUp className="w-3.5 h-3.5" />
                              </>
                            ) : (
                              <>
                                Xem bài
                                <ChevronDown className="w-3.5 h-3.5" />
                              </>
                            )}
                          </button>
                        </td>
                      </tr>

                      {/* Expandable Details Row */}
                      {isExpanded && (
                        <tr key={`${result.student_id}-details`}>
                          <td colSpan={8} className="p-0 border-b border-slate-200">
                            <div className="bg-slate-50/80 p-5 space-y-4 border-l-4 border-blue-600">
                              <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                                  <FileText className="w-4 h-4 text-blue-600" />
                                  Chi tiết các câu trả lời & Bằng chứng ghi âm — {result.name} ({result.username})
                                </h4>
                                <span className="text-xs text-slate-500 font-medium">
                                  {result.attempts?.length || 0} câu trả lời
                                </span>
                              </div>

                              {/* Attempts list */}
                              {loadingAttempts === result.student_id ? (
                                <div className="text-center py-8">
                                  <Loader2 className="w-6 h-6 text-blue-600 mx-auto mb-2 animate-spin" />
                                  <p className="text-xs text-slate-500">Đang tải audio và phiên âm từ server...</p>
                                </div>
                              ) : result.attempts && result.attempts.length > 0 ? (
                                <div className="space-y-4">
                                  {result.attempts.map((attempt) => {
                                    const confidencePercent = attempt.stt_confidence !== null
                                      ? Math.round(attempt.stt_confidence * 100)
                                      : null;

                                    return (
                                      <div
                                        key={attempt.id}
                                        className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4"
                                      >
                                        {/* Attempt Header */}
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                                          <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center font-bold text-blue-700 text-xs">
                                              C{attempt.sequence}
                                            </div>
                                            <div>
                                              <p className="text-sm font-bold text-slate-900">
                                                Câu hỏi số {attempt.sequence}
                                              </p>
                                              {attempt.question && (
                                                <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">
                                                  {attempt.question}
                                                </p>
                                              )}
                                            </div>
                                          </div>

                                          <div className="flex items-center gap-3 self-end sm:self-center">
                                            <div className="text-right">
                                              <span className="text-[11px] text-slate-400 block">Điểm câu hỏi</span>
                                              <span className="text-base font-bold text-blue-600">
                                                {attempt.score !== null ? `${attempt.score.toFixed(1)} / 10` : '—'}
                                              </span>
                                            </div>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                openReviewModal(result, attempt);
                                              }}
                                              className="inline-flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold px-3 py-2 rounded-xl transition shadow-xs"
                                            >
                                              <RefreshCw className="w-3.5 h-3.5" />
                                              Yêu cầu phúc khảo
                                            </button>
                                          </div>
                                        </div>

                                        {/* Audio Player Evidence */}
                                        {attempt.audio_url ? (
                                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                                            <div className="flex items-center justify-between mb-2">
                                              <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                                                <Volume2 className="w-4 h-4 text-blue-600" />
                                                <span>Bằng chứng ghi âm (MinIO S3 Raw Audio Streaming)</span>
                                              </div>
                                              <a
                                                href={attempt.audio_url}
                                                download={`Audio_C${attempt.sequence}_${result.username}.wav`}
                                                className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1"
                                                onClick={(e) => e.stopPropagation()}
                                              >
                                                <Download className="w-3 h-3" />
                                                Tải file gốc
                                              </a>
                                            </div>
                                            <audio controls className="w-full h-9 rounded-lg" preload="metadata">
                                              <source src={attempt.audio_url} />
                                              Trình duyệt không hỗ trợ nghe file âm thanh trực tiếp.
                                            </audio>
                                          </div>
                                        ) : (
                                          <div className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-xl border border-slate-200">
                                            Chưa có file âm thanh bằng chứng hoặc thí sinh chưa hoàn thành câu này.
                                          </div>
                                        )}

                                        {/* STT Confidence Meter */}
                                        {confidencePercent !== null && (
                                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                                            <div className="flex items-center gap-2">
                                              <ShieldCheck className="w-4 h-4 text-slate-500" />
                                              <span className="font-semibold text-slate-700">
                                                Độ tự tin nhận dạng giọng nói (STT Confidence):
                                              </span>
                                              <span
                                                className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                                                  confidencePercent >= 80
                                                    ? 'bg-emerald-100 text-emerald-800'
                                                    : confidencePercent >= 60
                                                    ? 'bg-amber-100 text-amber-800'
                                                    : 'bg-red-100 text-red-800'
                                                }`}
                                              >
                                                {confidencePercent}% —{' '}
                                                {confidencePercent >= 80
                                                  ? 'Chất lượng tốt'
                                                  : confidencePercent >= 60
                                                  ? 'Cần lưu ý'
                                                  : 'Chất lượng ghi âm kém / Khuyến nghị phúc khảo'}
                                              </span>
                                            </div>

                                            <div className="w-36 h-2 bg-slate-200 rounded-full overflow-hidden flex-shrink-0">
                                              <div
                                                className={`h-full rounded-full transition-all ${
                                                  confidencePercent >= 80
                                                    ? 'bg-emerald-500'
                                                    : confidencePercent >= 60
                                                    ? 'bg-amber-500'
                                                    : 'bg-red-500'
                                                }`}
                                                style={{ width: `${confidencePercent}%` }}
                                              />
                                            </div>
                                          </div>
                                        )}

                                        {/* Transcript */}
                                        <div>
                                          <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                            <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                                            Văn bản Phiên âm tự động (Server-side PhoWhisper / Whisper Large-v3)
                                          </p>
                                          <div className="bg-slate-50 rounded-xl p-3.5 text-sm text-slate-800 border border-slate-200 leading-relaxed font-serif">
                                            {attempt.transcript ? (
                                              `"${attempt.transcript}"`
                                            ) : (
                                              <span className="text-slate-400 italic font-sans text-xs">
                                                Chưa có dữ liệu phiên âm.
                                              </span>
                                            )}
                                          </div>
                                        </div>

                                        {/* AI Grading Rubric Feedback */}
                                        {attempt.grading_message && (
                                          <div>
                                            <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                              <Award className="w-3.5 h-3.5 text-blue-500" />
                                              Nhận xét đánh giá chi tiết theo Rubric của AI
                                            </p>
                                            <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3.5 text-xs text-blue-900 leading-relaxed">
                                              {attempt.grading_message}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="text-center py-6 text-xs text-slate-500">
                                  Chưa ghi nhận câu hỏi hoặc lượt thi nào của sinh viên này.
                                </div>
                              )}
                            </div>
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

      {/* Modal: Blind Re-evaluation Request Modal */}
      {showReviewModal && reviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowReviewModal(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Yêu cầu Phúc khảo Chấm mù (Blind Marking)</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Thí sinh: <span className="font-semibold text-slate-800">{reviewModal.studentName}</span> • Câu hỏi số {reviewModal.sequence}
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
            <div className="p-5 space-y-4">
              {/* Teacher Selection */}
              <div>
                <label
                  htmlFor="review_teacher"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                >
                  Giảng viên chấm phúc khảo (Giám khảo 2) <span className="text-red-500">*</span>
                </label>
                <select
                  id="review_teacher"
                  value={reviewForm.teacher_id_2}
                  onChange={(e) => setReviewForm({ ...reviewForm, teacher_id_2: e.target.value })}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="">-- Chọn giảng viên độc lập --</option>
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
                  Lý do phúc khảo <span className="text-red-500">*</span>
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
                  <option value="GRADE_DISPUTE">Khiếu nại điểm thi từ sinh viên (Grade Dispute)</option>
                  <option value="EXAMINER_REQUEST">Khảo thí yêu cầu do độ tự tin STT thấp / Nhiễu âm (Examiner Request)</option>
                  <option value="RECONTROLL">Kiểm tra ngẫu nhiên chất lượng chấm (Quality Audit Re-control)</option>
                </select>
              </div>

              {/* Reason Detail */}
              <div>
                <label
                  htmlFor="review_detail"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                >
                  Ghi chú chi tiết cho Giám khảo 2 <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="review_detail"
                  value={reviewForm.reason_detail}
                  onChange={(e) => setReviewForm({ ...reviewForm, reason_detail: e.target.value })}
                  required
                  minLength={5}
                  rows={3}
                  placeholder="Mô tả lý do cần chấm lại và các điểm cần giám khảo 2 chú ý khi nghe audio..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                />
              </div>

              {/* Blind Marking Checkbox */}
              <div className="bg-violet-50/70 border border-violet-200 rounded-xl p-3.5">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    id="blind_marking"
                    checked={reviewForm.blind_marking}
                    onChange={(e) => setReviewForm({ ...reviewForm, blind_marking: e.target.checked })}
                    className="w-4 h-4 text-violet-600 border-slate-300 rounded focus:ring-violet-500 mt-0.5"
                  />
                  <div>
                    <span className="text-xs font-bold text-violet-950 block">
                      Cơ chế Phúc khảo Chấm mù (Blind Marking - Khuyến nghị)
                    </span>
                    <span className="text-[11px] text-violet-800 leading-snug block mt-0.5">
                      Giảng viên 2 chỉ được nghe file audio và đọc rubric gốc, hoàn toàn ẩn điểm của Giám khảo 1 và điểm gợi ý của AI để đảm bảo tính khách quan tuyệt đối.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 p-5 border-t border-slate-200 bg-slate-50">
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSubmitReview}
                disabled={submittingReview || !reviewForm.teacher_id_2 || !reviewForm.reason_detail.trim()}
                className="inline-flex items-center gap-2 px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl shadow-xs transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submittingReview && <Loader2 className="w-4 h-4 animate-spin" />}
                {submittingReview ? 'Đang gửi...' : 'Gửi yêu cầu phúc khảo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
