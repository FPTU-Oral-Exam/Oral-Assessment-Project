'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Calendar,
  Clock,
  MapPin,
  Users,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  CalendarDays,
  FileSpreadsheet,
  Sparkles,
  Layers,
  ChevronRight,
  Filter,
  Search,
} from 'lucide-react';
import { useUser } from '@/hooks/useUser';
import { api } from '@/lib/api';

export interface ExamBatchInfo {
  batch_id: string;
  name: string;
  date: number;
  start_time: string;
  end_time: string;
  total_assigned: number;
  status: string;
  slot_count: number;
  rooms: string[];
}

export interface ExamInfo {
  id: string;
  name: string;
  status: string;
  time_limit: number;
  question_count: number;
  batches: ExamBatchInfo[];
}

export interface AssignedCourse {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: string;
  exams: ExamInfo[];
}

export interface SemesterGroup {
  semester_id: string | null;
  semester_name: string;
  semester_code?: string | null;
  semester_year?: number | null;
  semester_term?: string | null;
  semester_status?: string | null;
  start_date?: number | null;
  end_date?: number | null;
  courses: AssignedCourse[];
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

export default function CourseListClient() {
  const { user } = useUser();
  const [semesters, setSemesters] = useState<SemesterGroup[]>([]);
  const [selectedSemesterId, setSelectedSemesterId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeViewTab, setActiveViewTab] = useState<'semesters' | 'all_courses'>('semesters');

  const fetchTeacherData = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await api<SemesterGroup[]>('/admin/teacher-semesters');
      setSemesters(Array.isArray(data) ? data : []);

      // If only 1 semester exists, auto-select it for convenient immediate view
      if (Array.isArray(data) && data.length === 1 && data[0].semester_id) {
        setSelectedSemesterId(data[0].semester_id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách học kỳ & môn học');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeacherData();
  }, []);

  const formatDate = (timestamp?: number | null) => {
    if (!timestamp) return '—';
    return new Date(timestamp * 1000).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status?: string | null) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Đang diễn ra
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
            Đã kết thúc
          </span>
        );
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            Chuẩn bị
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            {status || 'Hoạt động'}
          </span>
        );
    }
  };

  // Selected semester object
  const currentSemester = semesters.find(
    (s) => s.semester_id === selectedSemesterId || (!s.semester_id && selectedSemesterId === '__no_semester__')
  );

  // Flattened all courses across semesters for quick search / alternative view
  const allFlattenedCourses = semesters.flatMap((sem) =>
    sem.courses.map((course) => ({
      ...course,
      semesterName: sem.semester_name,
      semesterStatus: sem.semester_status,
    }))
  );

  // Filter courses by search
  const filteredCoursesInCurrentSemester = currentSemester
    ? currentSemester.courses.filter(
        (c) =>
          c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const filteredAllCourses = allFlattenedCourses.filter(
    (c) =>
      c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.semesterName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner Notice */}
      <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-blue-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Phân quyền Giảng viên phụ trách • Dữ liệu Khảo thí (Chỉ đọc)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Kỳ học & Môn học phụ trách
            </h1>
            <p className="text-slate-300 text-sm leading-relaxed">
              Các học kỳ, môn học và ca thi được tạo và phân bổ tự động từ bộ phận <strong>Khảo thí</strong>. Giảng viên chỉ cần chọn học kỳ, môn học để vào không gian <strong>soạn đề thi (RAG)</strong> và <strong>chấm điểm thi vấn đáp</strong>.
            </p>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end justify-between gap-3 border-t sm:border-t-0 sm:border-l border-white/10 pt-4 sm:pt-0 sm:pl-6">
            <div className="text-left sm:text-right">
              <p className="text-xs text-slate-400 font-medium">Tổng học kỳ được giao</p>
              <p className="text-2xl font-black text-white">{semesters.length}</p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-xs text-slate-400 font-medium">Tổng môn học được phân</p>
              <p className="text-2xl font-black text-indigo-400">{allFlattenedCourses.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation & Search Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setActiveViewTab('semesters');
              setSelectedSemesterId(null);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeViewTab === 'semesters' && !selectedSemesterId
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Xem theo Học kỳ ({semesters.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveViewTab('all_courses');
              setSelectedSemesterId(null);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeViewTab === 'all_courses'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Tất cả môn phụ trách ({allFlattenedCourses.length})</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo mã môn, tên môn..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
          />
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <Loader2 className="w-9 h-9 text-indigo-600 animate-spin" />
          <span className="text-slate-600 text-sm font-medium">Đang đồng bộ dữ liệu phân công từ Khảo thí...</span>
        </div>
      )}

      {/* Error Alert */}
      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="space-y-1 flex-1">
            <h3 className="text-sm font-bold text-red-900">Không thể tải dữ liệu phân công</h3>
            <p className="text-xs text-red-700">{error}</p>
            <button
              onClick={fetchTeacherData}
              className="mt-2 text-xs font-bold text-red-800 hover:underline"
            >
              Thử lại ngay
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && semesters.length === 0 && (
        <div className="bg-white border border-dashed border-slate-300 rounded-3xl p-12 text-center space-y-3 max-w-lg mx-auto">
          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto">
            <Calendar className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            Chưa có kỳ học hoặc ca thi nào được phân công
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Bộ phận Khảo thí sẽ tạo học kỳ, thiết lập ca thi và chỉ định bạn làm giảng viên phụ trách đề thi/chấm thi. Sau khi được phân bổ, danh sách sẽ tự động xuất hiện tại đây.
          </p>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 1: SEMESTER LIST (Mức 1 - Danh sách các học kỳ) */}
      {/* ========================================================================= */}
      {!loading && !error && activeViewTab === 'semesters' && !selectedSemesterId && semesters.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-800">
              Danh sách Học kỳ có môn học & ca thi được giao ({semesters.length})
            </h2>
            <span className="text-xs text-slate-500">Bấm vào học kỳ để xem chi tiết môn học</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {semesters.map((sem) => {
              const totalBatches = sem.courses.reduce(
                (sum, c) => sum + c.exams.reduce((bSum, e) => bSum + e.batches.length, 0),
                0
              );
              const totalStudents = sem.courses.reduce(
                (sum, c) =>
                  sum +
                  c.exams.reduce(
                    (bSum, e) => bSum + e.batches.reduce((sSum, b) => sSum + b.total_assigned, 0),
                    0
                  ),
                0
              );

              return (
                <div
                  key={sem.semester_id || '__no_sem__'}
                  onClick={() => setSelectedSemesterId(sem.semester_id || '__no_semester__')}
                  className="bg-white rounded-3xl border border-slate-200/90 hover:border-indigo-400 hover:shadow-lg transition-all p-6 cursor-pointer flex flex-col justify-between group space-y-5"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-black group-hover:scale-105 transition-transform shadow-xs">
                        <Calendar className="w-6 h-6" />
                      </div>
                      {getStatusBadge(sem.semester_status)}
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {sem.semester_name}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 font-mono">
                        {sem.semester_year && <span>Năm: {sem.semester_year}</span>}
                        {sem.semester_term && <span>• Kỳ: {sem.semester_term}</span>}
                      </div>
                    </div>

                    {(sem.start_date || sem.end_date) && (
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {formatDate(sem.start_date)} — {formatDate(sem.end_date)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Summary Counters */}
                  <div className="pt-4 border-t border-slate-100 space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-center bg-slate-50/80 p-2.5 rounded-2xl border border-slate-100">
                      <div>
                        <p className="text-base font-black text-slate-800">{sem.courses.length}</p>
                        <p className="text-[10px] text-slate-500 font-semibold">Môn học</p>
                      </div>
                      <div>
                        <p className="text-base font-black text-indigo-600">{totalBatches}</p>
                        <p className="text-[10px] text-slate-500 font-semibold">Ca thi</p>
                      </div>
                      <div>
                        <p className="text-base font-black text-emerald-600">{totalStudents}</p>
                        <p className="text-[10px] text-slate-500 font-semibold">Thí sinh</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs font-bold text-indigo-600 pt-1 group-hover:translate-x-1 transition-transform">
                      <span>Mở danh sách môn học</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: SEMESTER DETAIL (Mức 2 - Danh sách môn & Ca thi trong 1 Học kỳ) */}
      {/* ========================================================================= */}
      {!loading && !error && activeViewTab === 'semesters' && currentSemester && (
        <div className="space-y-6">
          {/* Back button & Breadcrumb */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <button
              onClick={() => setSelectedSemesterId(null)}
              className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-indigo-600 transition-colors w-fit bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Quay lại chọn học kỳ khác</span>
            </button>

            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-xs font-semibold">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              <span>Chế độ Chỉ đọc: Được gán bởi Khảo thí</span>
            </div>
          </div>

          {/* Current Semester Header Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-indigo-100">
                <Calendar className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">
                    {currentSemester.semester_name}
                  </h2>
                  {getStatusBadge(currentSemester.semester_status)}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Thời gian đào tạo & thi: {formatDate(currentSemester.start_date)} đến{' '}
                  {formatDate(currentSemester.end_date)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 self-start md:self-auto">
              <div className="px-4 py-2 bg-slate-50 rounded-2xl border border-slate-200 text-center">
                <p className="text-sm font-black text-slate-800">{currentSemester.courses.length}</p>
                <p className="text-[10px] text-slate-500 font-semibold">Môn được giao</p>
              </div>
            </div>
          </div>

          {/* Course List in Selected Semester */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-800">
              Các môn học & ca thi bạn phụ trách ({filteredCoursesInCurrentSemester.length})
            </h3>

            {filteredCoursesInCurrentSemester.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-dashed border-slate-300 text-center">
                <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-600">Không tìm thấy môn học nào</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5">
                {filteredCoursesInCurrentSemester.map((course) => {
                  const allBatches = course.exams.flatMap((e) => e.batches);
                  const totalCandidates = allBatches.reduce((acc, b) => acc + b.total_assigned, 0);

                  return (
                    <div
                      key={course.id}
                      className="bg-white rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-md transition-shadow p-6 space-y-5"
                    >
                      {/* Course Header */}
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                        <div className="flex items-start gap-3.5">
                          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold shrink-0">
                            <BookOpen className="w-6 h-6" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-800 border border-slate-200">
                                {course.code}
                              </span>
                              <h4 className="text-lg font-bold text-slate-900">{course.name}</h4>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                                Phụ trách
                              </span>
                            </div>
                            {course.description && (
                              <p className="text-xs text-slate-500 mt-1 max-w-3xl line-clamp-2">
                                {course.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* CTA Button to enter Workspace */}
                        <Link
                          href={`/courses/${course.id}`}
                          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all whitespace-nowrap self-start md:self-auto group"
                        >
                          <Sparkles className="w-4 h-4 text-amber-300" />
                          <span>Vào soạn đề thi & Quản trị</span>
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                      </div>

                      {/* Examiner Assigned Batches Section */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                            <Layers className="w-4 h-4 text-indigo-600" />
                            <span>Ca thi Khảo thí giao cho bạn ({allBatches.length} ca thi • {totalCandidates} thí sinh)</span>
                          </div>
                          <span className="text-[11px] text-slate-400 italic">
                            Chịu trách nhiệm ra đề & chấm thi
                          </span>
                        </div>

                        {allBatches.length === 0 ? (
                          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center">
                            <p className="text-xs text-slate-500">
                              Chưa có ca thi nào được tạo cho môn này. Bạn có thể vào không gian môn học để chuẩn bị kho kiến thức (Giáo trình, Chuẩn đầu ra, Đề thi) trước.
                            </p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {allBatches.map((batch) => (
                              <div
                                key={batch.batch_id}
                                className="bg-slate-50/80 hover:bg-white rounded-2xl border border-slate-200/80 p-4 space-y-2.5 transition-colors"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-black text-slate-800">
                                    {batch.name}
                                  </span>
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                                    {batch.status === 'SCHEDULED' ? 'Đã lên lịch' : batch.status}
                                  </span>
                                </div>

                                <div className="space-y-1.5 text-[11px] text-slate-600">
                                  <div className="flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span>
                                      {formatDate(batch.date)} • {batch.start_time} - {batch.end_time}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span className="truncate">
                                      Phòng:{' '}
                                      <strong>
                                        {batch.rooms && batch.rooms.length > 0
                                          ? batch.rooms.join(', ')
                                          : `${batch.slot_count} phòng thi`}
                                      </strong>
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span>
                                      Số thí sinh: <strong>{batch.total_assigned} sinh viên</strong>
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 3: ALL COURSES FLAT LIST (Dự phòng cho giảng viên muốn xem toàn bộ) */}
      {/* ========================================================================= */}
      {!loading && !error && activeViewTab === 'all_courses' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-800">
              Tất cả các môn học được phân công ({filteredAllCourses.length})
            </h2>
          </div>

          {filteredAllCourses.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-dashed border-slate-300 text-center">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-700">Chưa có môn học nào</h3>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredAllCourses.map((course) => (
                <div
                  key={`${course.id}-${course.semesterName}`}
                  className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 truncate max-w-[150px]">
                        {course.semesterName}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-slate-900 leading-snug">{course.name}</h3>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">{course.code}</p>
                    </div>

                    {course.description && (
                      <p className="text-xs text-slate-600 line-clamp-2">{course.description}</p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      Trạng thái: <strong className="text-emerald-600">{course.status}</strong>
                    </span>

                    <Link
                      href={`/courses/${course.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs transition-colors"
                    >
                      <span>Vào soạn đề</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
