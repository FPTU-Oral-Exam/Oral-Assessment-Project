'use client';

import { useState, useEffect, useCallback } from 'react';
import { FileSpreadsheet, Users, CheckCircle, AlertCircle, Loader2, Clock, MapPin, X } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface SlotResult {
  id: string;
  slot_number: number;
  room: string;
  date: number;
  start_time: string;
  end_time: string;
  status: string;
  grade_locked: boolean;
  student_count: number;
  completed_count: number;
  exam_name: string;
  course_name: string;
}

interface ExamInfo {
  id: string;
  name: string;
  course_id: string;
}

export default function ResultsDashboard() {
  const [examSlots, setExamSlots] = useState<SlotResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedExam, setSelectedExam] = useState<string>('');
  const [exams, setExams] = useState<ExamInfo[]>([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all exams to populate filter dropdown
      const examsRes = await fetch('/api/examiner/exams', { credentials: 'include' });
      if (!examsRes.ok) throw new Error(`Lỗi server: ${examsRes.status}`);
      const examsData = await examsRes.json();
      const examsList = Array.isArray(examsData) ? examsData : [];
      setExams(examsList);

      // Fetch slots with results for all exams
      const allSlots: SlotResult[] = [];

      for (const exam of examsList) {
        const slotsRes = await fetch(`/api/examiner/exams/${exam.id}/slots`, { credentials: 'include' });
        if (!slotsRes.ok) continue;

        const slotsData = await slotsRes.json();
        const slots = Array.isArray(slotsData) ? slotsData : [];

        for (const slot of slots) {
          // Fetch results for this slot to get completed count
          const resultsRes = await fetch(`/api/examiner/slots/${slot.id}/results`, { credentials: 'include' });
          let completedCount = 0;
          if (resultsRes.ok) {
            const resultsData = await resultsRes.json();
            const results = Array.isArray(resultsData) ? resultsData : [];
            completedCount = results.filter((r: { status: string }) => r.status === 'COMPLETED').length;
          }

          allSlots.push({
            ...slot,
            completed_count: completedCount,
            exam_name: exam.name,
            course_name: '',
          });
        }
      }

      // Filter by selected exam if any
      const filtered = selectedExam
        ? allSlots.filter((s) => {
            const exam = exams.find((e) => e.id === selectedExam);
            return exam && allSlots
              .filter((sl) => sl.exam_name === exam.name)
              .some((sl) => sl.id === s.id);
          })
        : allSlots;

      setExamSlots(selectedExam ? allSlots.filter((s) => {
        const slotExam = exams.find((e) => e.id === selectedExam);
        return slotExam && s.exam_name === slotExam.name;
      }) : allSlots);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }, [selectedExam]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Kết quả thi vấn đáp</h1>
          <p className="text-sm text-slate-500 mt-1">
            Xem kết quả và xuất FAP theo từng ca thi
          </p>
        </div>
        <div className="flex items-center gap-3">
          {exams.length > 0 && (
            <select
              value={selectedExam}
              onChange={(e) => setSelectedExam(e.target.value)}
              className="px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tất cả kỳ thi</option>
              {exams.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-900">{error}</p>
          </div>
          <button
            onClick={fetchData}
            className="text-xs text-red-600 hover:text-red-800 font-semibold whitespace-nowrap"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Stats Summary */}
      {!error && examSlots.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-slate-400" />
              <span className="text-xs text-slate-500 font-medium">Tổng số ca</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{examSlots.length}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-slate-400" />
              <span className="text-xs text-slate-500 font-medium">Tổng SV</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {examSlots.reduce((sum, s) => sum + s.student_count, 0)}
            </p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-xs text-slate-500 font-medium">Hoàn thành</span>
            </div>
            <p className="text-2xl font-bold text-green-600">
              {examSlots.reduce((sum, s) => sum + s.completed_count, 0)}
            </p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2 mb-1">
              <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
              <span className="text-xs text-slate-500 font-medium">Đã khóa sổ</span>
            </div>
            <p className="text-2xl font-bold text-emerald-600">
              {examSlots.filter((s) => s.grade_locked).length}
            </p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!error && examSlots.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileSpreadsheet className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-700">Chưa có kết quả thi</h3>
          <p className="text-sm text-slate-500 mt-2">
            Chưa có ca thi nào được tạo hoặc chưa có sinh viên hoàn thành bài thi.
          </p>
        </div>
      )}

      {/* Slot Cards Grid */}
      {examSlots.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {examSlots.map((slot) => (
            <Link
              key={slot.id}
              href={`/results/${slot.id}`}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:border-blue-300 transition-all group"
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200 transition-colors">
                    <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-900 text-sm leading-snug">
                      Ca {slot.slot_number}
                    </h3>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      {slot.exam_name}
                    </p>
                  </div>
                </div>
                {slot.grade_locked && (
                  <span className="flex-shrink-0 px-2 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                    Đã khóa sổ
                  </span>
                )}
              </div>

              {/* Card Body */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Ngày thi
                  </span>
                  <span className="font-semibold text-slate-700">
                    {formatDate(slot.date)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Giờ thi
                  </span>
                  <span className="font-semibold text-slate-700">
                    {slot.start_time} - {slot.end_time}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    Phòng
                  </span>
                  <span className="font-semibold text-slate-700">{slot.room}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    SV thi
                  </span>
                  <span className="font-bold">
                    <span className="text-blue-600">{slot.completed_count}</span>
                    <span className="text-slate-400">/{slot.student_count}</span>
                  </span>
                </div>
              </div>

              {/* Card Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <span className="text-xs text-slate-400 group-hover:text-blue-600 transition-colors font-semibold">
                  Xem chi tiết →
                </span>
                {slot.completed_count === slot.student_count && slot.student_count > 0 && (
                  <span className="flex items-center gap-1 text-xs text-green-600 font-semibold">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Hoàn tất
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
