'use client';

import { useState, useEffect, useCallback } from 'react';
import { Download, Lock, Unlock, Users, CheckCircle, AlertCircle, Loader2, X, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface StudentResult {
  student_id: string;
  username: string;
  name: string;
  score_ai: number | null;
  score_final: number | null;
  status: string;
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
}

interface ExamInfo {
  id: string;
  name: string;
}

interface CourseInfo {
  id: string;
  name: string;
}

export default function SlotResultsClient({ slotId }: { slotId: string }) {
  const [results, setResults] = useState<StudentResult[]>([]);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [exam, setExam] = useState<ExamInfo | null>(null);
  const [course, setCourse] = useState<CourseInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingLock, setTogglingLock] = useState(false);

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
                    Trạng thái
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {results.map((result) => (
                  <tr key={result.student_id} className="hover:bg-slate-50 transition-colors">
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
                      {result.status === 'COMPLETED' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Hoàn thành
                        </span>
                      ) : result.status === 'REVIEW_REQUIRED' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Cần phúc khảo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                          <AlertCircle className="w-3.5 h-3.5" />
                          {result.status === 'NOT_STARTED' ? 'Chưa thi' : 'Đang thi'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
