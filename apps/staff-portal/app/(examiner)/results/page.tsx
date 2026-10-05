'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FileSpreadsheet,
  Users,
  CheckCircle,
  AlertCircle,
  Loader2,
  Clock,
  MapPin,
  X,
  Filter,
  Download,
  BookOpen,
  Calendar,
  Lock,
  Unlock,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

interface Semester {
  id: string;
  name: string;
  year: number;
  term: string;
  status: string;
}

interface Course {
  id: string;
  name: string;
  code: string;
  semester_id?: string;
  status: string;
}

interface ExamInfo {
  id: string;
  name: string;
  course_id: string;
  slot_count?: number;
}

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
  exam_id: string;
  exam_name: string;
  course_id: string;
  course_name: string;
  course_code: string;
  semester_name: string;
}

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  PENDING: { color: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Chưa thi' },
  READY: { color: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Sẵn sàng' },
  IN_PROGRESS: { color: 'bg-blue-50 text-blue-700 border-blue-200', label: 'Đang thi' },
  COMPLETED: { color: 'bg-slate-100 text-slate-600 border-slate-200', label: 'Hoàn thành' },
};

export default function ResultsDashboard() {
  const router = useRouter();

  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [exams, setExams] = useState<ExamInfo[]>([]);
  const [slots, setSlots] = useState<SlotResult[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedSemester, setSelectedSemester] = useState<string>('');
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedLockStatus, setSelectedLockStatus] = useState<string>('');

  const fetchData = useCallback(async () => {
    try {
      setError(null);

      // 1. Fetch semesters, courses, and exams in parallel
      const [semRes, courseRes, examRes] = await Promise.all([
        fetch('/api/examiner/semesters', { credentials: 'include' }),
        fetch('/api/examiner/courses', { credentials: 'include' }),
        fetch('/api/examiner/exams', { credentials: 'include' }),
      ]);

      const [semData, courseData, examData] = await Promise.all([
        semRes.ok ? semRes.json() : [],
        courseRes.ok ? courseRes.json() : [],
        examRes.ok ? examRes.json() : [],
      ]);

      const semList: Semester[] = Array.isArray(semData) ? semData : [];
      const courseList: Course[] = Array.isArray(courseData) ? courseData : [];
      const examList: ExamInfo[] = Array.isArray(examData) ? examData : [];

      setSemesters(semList);
      setCourses(courseList);
      setExams(examList);

      // Create quick lookups
      const courseMap = new Map(courseList.map((c) => [c.id, c]));
      const semMap = new Map(semList.map((s) => [s.id, s]));

      // 2. Fetch slots for all exams in parallel
      const slotResults: SlotResult[] = [];

      await Promise.all(
        examList.map(async (exam) => {
          try {
            const slotRes = await fetch(`/api/examiner/exams/${exam.id}/slots`, { credentials: 'include' });
            if (!slotRes.ok) return;
            const slotData = await slotRes.json();
            const examSlots = Array.isArray(slotData) ? slotData : [];

            const course = courseMap.get(exam.course_id);
            const semester = course?.semester_id ? semMap.get(course.semester_id) : undefined;

            for (const slot of examSlots) {
              // Fetch completed count
              let completedCount = 0;
              try {
                const resultsRes = await fetch(`/api/examiner/slots/${slot.id}/results`, { credentials: 'include' });
                if (resultsRes.ok) {
                  const rData = await resultsRes.json();
                  if (Array.isArray(rData)) {
                    completedCount = rData.filter((r: { status: string }) => r.status === 'COMPLETED').length;
                  }
                }
              } catch {
                // Ignore result count fetch failure
              }

              slotResults.push({
                ...slot,
                exam_id: exam.id,
                exam_name: exam.name,
                course_id: exam.course_id,
                course_name: course?.name || 'Môn học',
                course_code: course?.code || '',
                semester_name: semester?.name || '',
                completed_count: completedCount,
              });
            }
          } catch {
            // Ignore single exam fetch error
          }
        })
      );

      // Sort slots by date descending, then slot number
      slotResults.sort((a, b) => b.date - a.date || a.slot_number - b.slot_number);
      setSlots(slotResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu kết quả thi');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Filtered courses based on selected semester
  const availableCourses = useMemo(() => {
    if (!selectedSemester) return courses;
    return courses.filter((c) => c.semester_id === selectedSemester);
  }, [courses, selectedSemester]);

  // Filtered slots
  const filteredSlots = useMemo(() => {
    return slots.filter((slot) => {
      if (selectedSemester) {
        const course = courses.find((c) => c.id === slot.course_id);
        if (course?.semester_id !== selectedSemester) return false;
      }
      if (selectedCourse && slot.course_id !== selectedCourse) return false;
      if (selectedStatus && slot.status !== selectedStatus) return false;
      if (selectedLockStatus === 'LOCKED' && !slot.grade_locked) return false;
      if (selectedLockStatus === 'UNLOCKED' && slot.grade_locked) return false;
      return true;
    });
  }, [slots, selectedSemester, selectedCourse, selectedStatus, selectedLockStatus, courses]);

  // Statistics
  const totalSlots = filteredSlots.length;
  const totalStudents = filteredSlots.reduce((sum, s) => sum + s.student_count, 0);
  const totalCompleted = filteredSlots.reduce((sum, s) => sum + s.completed_count, 0);
  const totalLocked = filteredSlots.filter((s) => s.grade_locked).length;

  const formatDate = (ts: number) => {
    if (!ts) return '—';
    return new Date(ts * 1000).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Export FAP Excel directly
  const handleExportFAP = async (slot: SlotResult) => {
    try {
      const res = await fetch(`/api/examiner/slots/${slot.id}/export`, { credentials: 'include' });
      if (!res.ok) throw new Error('Xuất FAP thất bại');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `FAP_${slot.course_code || 'Course'}_Ca${slot.slot_number}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success(`Đã tải bảng điểm FAP Ca ${slot.slot_number}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xuất FAP thất bại');
    }
  };

  const clearFilters = () => {
    setSelectedSemester('');
    setSelectedCourse('');
    setSelectedStatus('');
    setSelectedLockStatus('');
  };

  const hasActiveFilters = Boolean(selectedSemester || selectedCourse || selectedStatus || selectedLockStatus);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <div className="text-slate-500 font-medium text-sm">Đang tải bảng điều khiển kết quả thi...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bảng điều khiển Kết quả Thi & Phúc khảo</h1>
          <p className="text-sm text-slate-500 mt-1">
            Theo dõi tiến độ chấm thi, nghe audio MinIO, duyệt phúc khảo và kết xuất bảng điểm chuẩn FAP.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition self-start disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Đang làm mới...' : 'Làm mới dữ liệu'}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 mb-1.5 text-slate-500">
            <Calendar className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-bold uppercase tracking-wider">Tổng số ca thi</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{totalSlots}</p>
          <p className="text-[11px] text-slate-400 mt-1">Các ca thi đã lên lịch</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 mb-1.5 text-slate-500">
            <Users className="w-4 h-4 text-indigo-500" />
            <span className="text-xs font-bold uppercase tracking-wider">Tổng sinh viên</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{totalStudents}</p>
          <p className="text-[11px] text-slate-400 mt-1">Sinh viên được phân bổ</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 mb-1.5 text-slate-500">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-bold uppercase tracking-wider">Đã hoàn thành</span>
          </div>
          <p className="text-2xl font-bold text-emerald-600">{totalCompleted}</p>
          <p className="text-[11px] text-slate-400 mt-1">
            {totalStudents > 0 ? `${((totalCompleted / totalStudents) * 100).toFixed(0)}% hoàn tất bài thi` : 'Chưa có SV'}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 mb-1.5 text-slate-500">
            <Lock className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-bold uppercase tracking-wider">Đã khóa sổ</span>
          </div>
          <p className="text-2xl font-bold text-amber-600">{totalLocked}</p>
          <p className="text-[11px] text-slate-400 mt-1">Ca thi đã chốt điểm</p>
        </div>
      </div>

      {/* Multi-Level Cascading Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5 text-blue-600" />
            Bộ lọc đa tầng (Học kỳ → Môn học → Trạng thái)
          </div>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              Xóa bộ lọc
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Semester Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Học kỳ</label>
            <select
              value={selectedSemester}
              onChange={(e) => {
                setSelectedSemester(e.target.value);
                setSelectedCourse('');
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tất cả học kỳ</option>
              {semesters.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.term} {s.year})
                </option>
              ))}
            </select>
          </div>

          {/* Course Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Môn học</label>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tất cả môn học</option>
              {availableCourses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} - {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Slot Status Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Trạng thái ca thi</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="PENDING">Chưa thi</option>
              <option value="READY">Sẵn sàng</option>
              <option value="IN_PROGRESS">Đang thi</option>
              <option value="COMPLETED">Hoàn thành</option>
            </select>
          </div>

          {/* Gradebook Lock Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Khóa sổ điểm</label>
            <select
              value={selectedLockStatus}
              onChange={(e) => setSelectedLockStatus(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tất cả</option>
              <option value="LOCKED">Đã khóa sổ</option>
              <option value="UNLOCKED">Chưa khóa</option>
            </select>
          </div>
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

      {/* Empty State */}
      {!error && filteredSlots.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileSpreadsheet className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-700">Không tìm thấy ca thi nào</h3>
          <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
            {hasActiveFilters
              ? 'Không có ca thi nào khớp với bộ lọc hiện tại. Thử xóa hoặc thay đổi bộ lọc.'
              : 'Chưa có ca thi nào được tạo trong hệ thống.'}
          </p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      )}

      {/* Slots List / Grid */}
      {filteredSlots.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSlots.map((slot) => {
            const statusCfg = STATUS_CONFIG[slot.status] ?? STATUS_CONFIG['PENDING'];
            const percentCompleted = slot.student_count > 0
              ? Math.round((slot.completed_count / slot.student_count) * 100)
              : 0;

            return (
              <div
                key={slot.id}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {slot.course_code && (
                          <span className="font-mono text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded">
                            {slot.course_code}
                          </span>
                        )}
                        {slot.semester_name && (
                          <span className="text-[11px] font-medium text-slate-500">
                            {slot.semester_name}
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-slate-900 text-base leading-snug">
                        Ca {slot.slot_number}
                      </h3>
                      <p className="text-xs text-slate-600 truncate mt-0.5 font-medium">
                        {slot.course_name}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusCfg.color}`}
                      >
                        {statusCfg.label}
                      </span>
                      {slot.grade_locked && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-600 border border-red-200">
                          <Lock className="w-3 h-3" />
                          Đã khóa
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Exam & Time Info */}
                  <div className="space-y-2 py-3 border-y border-slate-100 mb-4 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                        Đề thi
                      </span>
                      <span className="font-semibold text-slate-800 truncate max-w-[180px]">
                        {slot.exam_name}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        Thời gian
                      </span>
                      <span className="font-semibold text-slate-800">
                        {formatDate(slot.date)} • {slot.start_time} - {slot.end_time}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        Phòng thi
                      </span>
                      <span className="font-semibold text-slate-800 bg-slate-50 px-2 py-0.5 rounded">
                        {slot.room}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="pt-1.5">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          Tiến độ nộp bài
                        </span>
                        <span className="font-bold text-slate-800">
                          <span className="text-blue-600">{slot.completed_count}</span>
                          <span className="text-slate-400">/{slot.student_count} SV</span>
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full transition-all"
                          style={{ width: `${percentCompleted}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => router.push(`/results/${slot.id}`)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition shadow-xs"
                  >
                    Xem chi tiết & Phúc khảo
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleExportFAP(slot)}
                    title="Xuất bảng điểm Excel chuẩn FAP"
                    className="inline-flex items-center justify-center gap-1 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold rounded-xl transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    FAP
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
