'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Users,
  Search,
  Filter,
  CheckCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  BookOpen,
  ArrowRight,
  Lock,
  Unlock,
  Layers,
  Sparkles,
  FileText,
  Radio,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { useUser } from '@/hooks/useUser';

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

interface ScheduleSlotItem {
  id: string;
  slot_number: number;
  room: string;
  date: number;
  start_time: string;
  end_time: string;
  status: 'PENDING' | 'READY' | 'IN_PROGRESS' | 'COMPLETED';
  grade_locked: boolean;
  student_count: number;
  exam_id: string;
  exam_name: string;
  course_id: string;
  course_name: string;
  course_code: string;
  semester_name: string;
  exam_variant_name?: string | null;
}

const STATUS_CONFIG: Record<string, { color: string; label: string; bgBadge: string }> = {
  PENDING: { color: 'text-amber-700 border-amber-200 bg-amber-50', label: 'Chưa thi', bgBadge: 'bg-amber-500' },
  READY: { color: 'text-emerald-700 border-emerald-200 bg-emerald-50', label: 'Sẵn sàng', bgBadge: 'bg-emerald-500' },
  IN_PROGRESS: { color: 'text-blue-700 border-blue-200 bg-blue-50', label: 'Đang thi', bgBadge: 'bg-blue-500' },
  COMPLETED: { color: 'text-slate-600 border-slate-200 bg-slate-100', label: 'Hoàn thành', bgBadge: 'bg-slate-500' },
};

export default function ScheduleClient() {
  const router = useRouter();
  const { user } = useUser();
  const isExaminer = user?.roles?.some((r: string) => ['EXAMINER', 'SYSTEM_ADMIN'].includes(r));

  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [exams, setExams] = useState<ExamInfo[]>([]);
  const [slots, setSlots] = useState<ScheduleSlotItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSemester, setSelectedSemester] = useState<string>('');
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');

  const fetchScheduleData = useCallback(async () => {
    try {
      setError(null);

      // Fetch parallel
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

      const courseMap = new Map(courseList.map((c) => [c.id, c]));
      const semMap = new Map(semList.map((s) => [s.id, s]));

      // Fetch slots for all exams
      const allSlots: ScheduleSlotItem[] = [];

      await Promise.all(
        examList.map(async (exam) => {
          try {
            const slotRes = await fetch(`/api/examiner/exams/${exam.id}/slots`, { credentials: 'include' });
            if (!slotRes.ok) return;
            const slotData = await slotRes.json();
            if (!Array.isArray(slotData)) return;

            const course = courseMap.get(exam.course_id);
            const sem = course?.semester_id ? semMap.get(course.semester_id) : null;

            slotData.forEach((s: any) => {
              allSlots.push({
                id: s.id,
                slot_number: s.slot_number,
                room: s.room,
                date: s.date,
                start_time: s.start_time,
                end_time: s.end_time,
                status: s.status || 'PENDING',
                grade_locked: !!s.grade_locked,
                student_count: s.student_count || 0,
                exam_id: exam.id,
                exam_name: exam.name,
                course_id: exam.course_id,
                course_name: course?.name || 'Môn học',
                course_code: course?.code || 'N/A',
                semester_name: sem?.name || 'Toàn trường',
                exam_variant_name: s.exam_variant?.name || null,
              });
            });
          } catch {
            // ignore individual exam error
          }
        })
      );

      // Sort by date desc, then start_time, then slot_number
      allSlots.sort((a, b) => {
        if (b.date !== a.date) return b.date - a.date;
        return a.start_time.localeCompare(b.start_time) || a.slot_number - b.slot_number;
      });

      setSlots(allSlots);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải lịch thi điều phối');
      toast.error('Lỗi khi tải lịch thi điều phối');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchScheduleData();
  }, [fetchScheduleData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchScheduleData();
    toast.success('Đã làm mới dữ liệu lịch thi');
  };

  // Filtered Slots
  const filteredSlots = useMemo(() => {
    return slots.filter((slot) => {
      // Search term
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const matchRoom = slot.room.toLowerCase().includes(query);
        const matchCourse = slot.course_name.toLowerCase().includes(query) || slot.course_code.toLowerCase().includes(query);
        const matchExam = slot.exam_name.toLowerCase().includes(query);
        if (!matchRoom && !matchCourse && !matchExam) return false;
      }

      // Semester
      if (selectedSemester && slot.semester_name !== selectedSemester) {
        return false;
      }

      // Course
      if (selectedCourse && slot.course_id !== selectedCourse) {
        return false;
      }

      // Status
      if (selectedStatus && slot.status !== selectedStatus) {
        return false;
      }

      // Date
      if (selectedDate) {
        const slotDateStr = new Date(slot.date * 1000).toISOString().split('T')[0];
        if (slotDateStr !== selectedDate) return false;
      }

      return true;
    });
  }, [slots, searchTerm, selectedSemester, selectedCourse, selectedStatus, selectedDate]);

  // Metrics
  const metrics = useMemo(() => {
    const totalSlots = slots.length;
    const totalStudents = slots.reduce((acc, s) => acc + s.student_count, 0);
    const readySlots = slots.filter((s) => s.status === 'READY' || s.status === 'PENDING').length;
    const completedSlots = slots.filter((s) => s.status === 'COMPLETED').length;

    return { totalSlots, totalStudents, readySlots, completedSlots };
  }, [slots]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Lịch thi vấn đáp & Điều phối Ca thi</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Theo dõi, quản lý khung giờ, phòng thi và thí sinh trên toàn hệ thống
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
            <span>Làm mới</span>
          </button>
          <Link
            href="/courses"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Quản lý Môn học</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold flex-shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">Tổng ca thi</div>
            <div className="text-xl font-bold text-slate-900 mt-0.5">{metrics.totalSlots}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold flex-shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">Lượt thí sinh</div>
            <div className="text-xl font-bold text-slate-900 mt-0.5">{metrics.totalStudents}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold flex-shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">Sẵn sàng / Chờ thi</div>
            <div className="text-xl font-bold text-slate-900 mt-0.5">{metrics.readySlots}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center font-bold flex-shrink-0">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">Đã hoàn thành</div>
            <div className="text-xl font-bold text-slate-900 mt-0.5">{metrics.completedSlots}</div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo phòng thi, mã môn, tên môn hoặc đề thi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Date Picker Filter */}
          <div className="w-full md:w-44">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Semester Filter */}
          <div className="w-full md:w-44">
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tất cả học kỳ</option>
              {semesters.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="w-full md:w-36">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="PENDING">Chưa thi</option>
              <option value="READY">Sẵn sàng</option>
              <option value="IN_PROGRESS">Đang thi</option>
              <option value="COMPLETED">Hoàn thành</option>
            </select>
          </div>
        </div>

        {/* Clear Filter Tag */}
        {(searchTerm || selectedDate || selectedSemester || selectedStatus || selectedCourse) && (
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
            <span>Đang lọc: <strong>{filteredSlots.length}</strong> kết quả</span>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedDate('');
                setSelectedSemester('');
                setSelectedStatus('');
                setSelectedCourse('');
              }}
              className="text-blue-600 hover:text-blue-800 font-semibold underline text-xs ml-auto"
            >
              Xóa bộ lọc
            </button>
          </div>
        )}
      </div>

      {/* Main Table Content */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
            <p className="text-sm font-medium text-slate-500">Đang tải danh sách lịch thi điều phối...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
            <p className="text-sm font-semibold text-red-900">{error}</p>
            <button
              onClick={fetchScheduleData}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold"
            >
              Thử lại
            </button>
          </div>
        ) : filteredSlots.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <CalendarIcon className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-700">Chưa có ca thi nào</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Chưa có ca thi nào được tạo hoặc không có kết quả phù hợp với bộ lọc hiện tại.
            </p>
            <Link
              href="/courses"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition"
            >
              <span>Vào Quản lý Môn học để tạo Ca thi</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Ca thi / Phòng</th>
                  <th className="py-3 px-4">Ngày thi & Giờ thi</th>
                  <th className="py-3 px-4">Môn học & Kỳ thi</th>
                  <th className="py-3 px-4 text-center">Thí sinh</th>
                  <th className="py-3 px-4 text-center">Trạng thái</th>
                  <th className="py-3 px-4 text-center">Khóa điểm</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredSlots.map((slot) => {
                  const dateStr = slot.date
                    ? new Date(slot.date * 1000).toLocaleDateString('vi-VN', {
                        weekday: 'short',
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })
                    : 'N/A';

                  const statusCfg = STATUS_CONFIG[slot.status] || STATUS_CONFIG.PENDING;

                  return (
                    <tr key={slot.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Slot & Room */}
                      <td className="py-3.5 px-4 font-medium text-slate-900">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-center">
                              #{slot.slot_number}
                            </span>
                            <div className="flex items-center gap-1.5 font-bold text-slate-800">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" />
                              <span>{slot.room}</span>
                            </div>
                          </div>
                          {slot.exam_variant_name ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded">
                              <FileText className="w-2.5 h-2.5" />
                              {slot.exam_variant_name}
                            </span>
                          ) : (
                            <span className="text-[10px] text-amber-600 font-medium">Chưa sinh mã đề</span>
                          )}
                        </div>
                      </td>

                      {/* Date & Time */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-blue-500" />
                            <span>
                              {slot.start_time} - {slot.end_time}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500">{dateStr}</div>
                        </div>
                      </td>

                      {/* Course & Exam */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-semibold">
                              {slot.course_code}
                            </span>
                            <span className="truncate max-w-[220px]" title={slot.course_name}>
                              {slot.course_name}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 truncate max-w-[220px]" title={slot.exam_name}>
                            {slot.exam_name}
                          </div>
                        </div>
                      </td>

                      {/* Student count */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold text-xs bg-slate-100 text-slate-700">
                          <Users className="w-3.5 h-3.5 text-slate-500" />
                          <span>{slot.student_count}</span>
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusCfg.color}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.bgBadge}`} />
                          <span>{statusCfg.label}</span>
                        </span>
                      </td>

                      {/* Grade Lock */}
                      <td className="py-3.5 px-4 text-center">
                        {slot.grade_locked ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                            <Lock className="w-3 h-3" />
                            <span>Đã khóa</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full">
                            <Unlock className="w-3 h-3" />
                            <span>Mở sổ</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href="/proctor"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition"
                            title="Vào phòng coi thi & giám sát thí sinh"
                          >
                            <span>Coi thi</span>
                            <Radio className="w-3 h-3" />
                          </Link>
                          {isExaminer && (
                            <>
                              <Link
                                href={`/results/${slot.id}`}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 transition"
                                title="Xem bảng điểm & nghe audio"
                              >
                                <span>Xem kết quả</span>
                                <ArrowRight className="w-3 h-3" />
                              </Link>
                              <Link
                                href={`/courses/${slot.course_id}/exams?examId=${slot.exam_id}`}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                                title="Quản lý ca thi của môn"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </Link>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
