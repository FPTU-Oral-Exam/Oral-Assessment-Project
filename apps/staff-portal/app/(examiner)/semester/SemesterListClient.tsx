'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Calendar,
  Check,
  Loader2,
  X,
  AlertCircle,
  BookOpen,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  GraduationCap,
} from 'lucide-react';
import { toast } from 'sonner';

interface Semester {
  id: string;
  name: string;
  year: number;
  term: 'SPRING' | 'SUMMER' | 'FALL';
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED';
  start_date: number;
  end_date: number;
  course_count: number;
  created_at?: number;
}

interface SemesterIn {
  name: string;
  year: number;
  term: 'SPRING' | 'SUMMER' | 'FALL';
  start_date: number;
  end_date: number;
}

interface SemesterCourse {
  id: string;
  name: string;
  code: string;
  description?: string;
  status: string;
  semester_id: string;
  teacher?: { id: string; name: string } | null;
}

interface Teacher {
  id: string;
  name: string;
  username: string;
}

interface CourseFormData {
  code: string;
  name: string;
  description: string;
  credits: number;
  teacher_id: string;
}

export default function SemesterListClient() {
  const router = useRouter();
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<SemesterIn>({
    name: '',
    year: new Date().getFullYear(),
    term: 'SPRING',
    start_date: 0,
    end_date: 0,
  });

  // Course expansion & creation state
  const [expandedSemesterId, setExpandedSemesterId] = useState<string | null>(null);
  const [semesterCourses, setSemesterCourses] = useState<Record<string, SemesterCourse[]>>({});
  const [loadingCourses, setLoadingCourses] = useState<Record<string, boolean>>({});
  const [showAddCourseModal, setShowAddCourseModal] = useState(false);
  const [activeSemesterForCourse, setActiveSemesterForCourse] = useState<Semester | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [creatingCourse, setCreatingCourse] = useState(false);
  const [courseFormData, setCourseFormData] = useState<CourseFormData>({
    code: '',
    name: '',
    description: '',
    credits: 3,
    teacher_id: '',
  });

  const fetchSemesters = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/examiner/semesters', { credentials: 'include' });
      if (!res.ok) throw new Error(`Lỗi server: ${res.status}`);
      const data = await res.json();
      setSemesters(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách học kỳ');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTeachers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/users', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        const teacherUsers = Array.isArray(data)
          ? data.filter((u: { role?: string; roles?: string[] }) =>
              u.role === 'TEACHER' || u.roles?.includes('TEACHER')
            )
          : [];
        setTeachers(teacherUsers);
      }
    } catch {
      // Fallback silently if teacher listing is unavailable
    }
  }, []);

  useEffect(() => {
    fetchSemesters();
    fetchTeachers();
  }, [fetchSemesters, fetchTeachers]);

  const fetchSemesterCourses = async (semesterId: string) => {
    try {
      setLoadingCourses((prev) => ({ ...prev, [semesterId]: true }));
      const res = await fetch(`/api/examiner/semesters/${semesterId}/courses`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setSemesterCourses((prev) => ({ ...prev, [semesterId]: data }));
      }
    } catch {
      toast.error('Không thể tải môn học của học kỳ');
    } finally {
      setLoadingCourses((prev) => ({ ...prev, [semesterId]: false }));
    }
  };

  const toggleExpandCourses = (semester: Semester) => {
    if (expandedSemesterId === semester.id) {
      setExpandedSemesterId(null);
    } else {
      setExpandedSemesterId(semester.id);
      fetchSemesterCourses(semester.id);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/examiner/semesters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Lỗi không xác định' }));
        throw new Error(err.message || err.detail || 'Tạo học kỳ thất bại');
      }
      const data = await res.json().catch(() => ({}));
      setIsModalOpen(false);
      setFormData({ name: '', year: new Date().getFullYear(), term: 'SPRING', start_date: 0, end_date: 0 });
      toast.success('Tạo học kỳ thành công');
      if (data?.id) {
        router.push(`/semester/${data.id}`);
      } else {
        fetchSemesters();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Tạo học kỳ thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSemesterForCourse) return;
    setCreatingCourse(true);
    try {
      const payload = {
        code: courseFormData.code.trim(),
        name: courseFormData.name.trim(),
        description: courseFormData.description.trim(),
        credits: courseFormData.credits,
        teacher_id: courseFormData.teacher_id || null,
      };

      const res = await fetch(`/api/examiner/semesters/${activeSemesterForCourse.id}/courses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Tạo môn học thất bại' }));
        throw new Error(err.message || err.detail || 'Tạo môn học thất bại');
      }

      toast.success(`Đã thêm môn học ${courseFormData.code}`);
      setShowAddCourseModal(false);
      setCourseFormData({ code: '', name: '', description: '', credits: 3, teacher_id: '' });
      fetchSemesterCourses(activeSemesterForCourse.id);
      fetchSemesters();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Tạo môn học thất bại');
    } finally {
      setCreatingCourse(false);
    }
  };

  const handleActivate = async (id: string) => {
    try {
      const res = await fetch(`/api/examiner/semesters/${id}/activate`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Kích hoạt thất bại');
      toast.success('Đã kích hoạt học kỳ');
      fetchSemesters();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Kích hoạt thất bại');
    }
  };

  const handleComplete = async (id: string) => {
    try {
      const res = await fetch(`/api/examiner/semesters/${id}/complete`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Hoàn thành thất bại');
      toast.success('Đã đánh dấu hoàn thành');
      fetchSemesters();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Thao tác thất bại');
    }
  };

  const formatDate = (timestamp: number) => {
    if (!timestamp) return '—';
    return new Date(timestamp * 1000).toLocaleDateString('vi-VN');
  };

  const termLabel: Record<string, string> = {
    SPRING: 'Xuân',
    SUMMER: 'Hè',
    FALL: 'Thu',
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-3">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <div className="text-slate-500 font-medium text-sm">Đang tải danh sách học kỳ...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quản lý Học kỳ</h1>
          <p className="text-sm text-slate-500 mt-1">Khai báo cấu trúc học kỳ, môn học và phân công giảng viên</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          Tạo Học kỳ mới
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-900">{error}</p>
          </div>
          <button
            onClick={fetchSemesters}
            className="text-xs text-red-600 hover:text-red-800 font-semibold whitespace-nowrap"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Empty State */}
      {!error && semesters.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-700">Chưa có học kỳ nào</h3>
          <p className="text-sm text-slate-500 mt-2">Bắt đầu bằng cách tạo học kỳ đầu tiên của bạn.</p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="mt-6 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition"
          >
            <Plus className="w-4 h-4" />
            Tạo Học kỳ đầu tiên
          </button>
        </div>
      )}

      {/* Semester Grid */}
      {semesters.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {semesters.map((semester) => {
            const isExpanded = expandedSemesterId === semester.id;
            const courses = semesterCourses[semester.id] || [];
            const isLoadingCourses = loadingCourses[semester.id];

            return (
              <div
                key={semester.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow flex flex-col overflow-hidden"
              >
                <div className="p-5 flex-1">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/semester/${semester.id}`}
                          className="font-bold text-slate-900 text-sm leading-snug truncate hover:text-blue-600 transition block"
                        >
                          {semester.name}
                        </Link>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">
                          {semester.year} — {termLabel[semester.term] || semester.term}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                        semester.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : semester.status === 'COMPLETED'
                          ? 'bg-slate-100 text-slate-600 border-slate-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {semester.status === 'ACTIVE' && <Check className="w-3 h-3 inline mr-1" />}
                      {semester.status === 'DRAFT'
                        ? 'Nháp'
                        : semester.status === 'ACTIVE'
                        ? 'Hoạt động'
                        : 'Hoàn thành'}
                    </span>
                  </div>

                  {/* Card Body */}
                  <div className="space-y-2 mb-4 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Bắt đầu</span>
                      <span className="font-semibold text-slate-700">{formatDate(semester.start_date)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Kết thúc</span>
                      <span className="font-semibold text-slate-700">{formatDate(semester.end_date)}</span>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-slate-500">Môn học đã mở</span>
                      <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                        {semester.course_count ?? 0} môn
                      </span>
                    </div>
                  </div>

                  {/* Toggle Courses View Button */}
                  <div className="pt-2">
                    <button
                      onClick={() => toggleExpandCourses(semester)}
                      className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-700 transition"
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                        Danh sách môn học ({semester.course_count ?? 0})
                      </span>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                    </button>
                  </div>

                  {/* Expanded Courses Panel */}
                  {isExpanded && (
                    <div className="mt-3 p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Môn học trong kỳ
                        </span>
                        <button
                          onClick={() => {
                            setActiveSemesterForCourse(semester);
                            setShowAddCourseModal(true);
                          }}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
                        >
                          <Plus className="w-3 h-3" /> Thêm môn
                        </button>
                      </div>

                      {isLoadingCourses ? (
                        <div className="py-4 text-center">
                          <Loader2 className="w-4 h-4 text-blue-600 animate-spin mx-auto" />
                        </div>
                      ) : courses.length === 0 ? (
                        <p className="text-xs text-slate-400 py-2 text-center">Chưa có môn học nào trong kỳ này.</p>
                      ) : (
                        <div className="space-y-1.5 max-h-48 overflow-y-auto">
                          {courses.map((course) => (
                            <div
                              key={course.id}
                              className="p-2.5 bg-white rounded-lg border border-slate-200 flex items-center justify-between gap-2 shadow-2xs"
                            >
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-900 truncate">
                                  {course.code} — {course.name}
                                </p>
                                <p className="text-[11px] text-slate-500 flex items-center gap-1">
                                  <GraduationCap className="w-3 h-3 text-slate-400" />
                                  {course.teacher ? course.teacher.name : 'Chưa gán GV'}
                                </p>
                              </div>
                              <Link
                                href={`/courses/${course.id}`}
                                className="flex-shrink-0 p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition"
                                title="Mở Không gian môn học (4 tabs)"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </Link>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="p-4 pt-3 border-t border-slate-100 flex gap-2 bg-slate-50/40">
                  <Link
                    href={`/semester/${semester.id}`}
                    className="inline-flex items-center justify-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold px-3 py-2 rounded-xl transition shadow-xs"
                  >
                    Chi tiết
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                  </Link>
                  {semester.status === 'DRAFT' && (
                    <button
                      onClick={() => handleActivate(semester.id)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-2 rounded-xl transition shadow-xs"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Kích hoạt
                    </button>
                  )}
                  {semester.status === 'ACTIVE' && (
                    <button
                      onClick={() => handleComplete(semester.id)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 bg-slate-700 hover:bg-slate-800 text-white text-xs font-semibold py-2 rounded-xl transition shadow-xs"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Hoàn thành
                    </button>
                  )}
                  {semester.status === 'COMPLETED' && (
                    <span className="flex-1 inline-flex items-center justify-center gap-1.5 bg-slate-100 text-slate-400 text-xs font-semibold py-2 rounded-xl cursor-not-allowed">
                      <Check className="w-3.5 h-3.5" />
                      Đã kết thúc
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Semester Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Tạo Học kỳ mới</h2>
                <p className="text-xs text-slate-500 mt-0.5">Khai báo thông tin học kỳ mới cho hệ thống</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-4 space-y-4">
              <div>
                <label htmlFor="name" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Tên học kỳ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="Ví dụ: Học kỳ Xuân 2026"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="year" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Năm học <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    id="year"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value, 10) })}
                    required
                    min={2020}
                    max={2100}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="term" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Kỳ học <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="term"
                    value={formData.term}
                    onChange={(e) => setFormData({ ...formData, term: e.target.value as 'SPRING' | 'SUMMER' | 'FALL' })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="SPRING">Xuân (Spring)</option>
                    <option value="SUMMER">Hè (Summer)</option>
                    <option value="FALL">Thu (Fall)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="start_date" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Ngày bắt đầu <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    id="start_date"
                    required
                    onChange={(e) => {
                      const d = new Date(e.target.value);
                      setFormData({ ...formData, start_date: Math.floor(d.getTime() / 1000) });
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="end_date" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Ngày kết thúc <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    id="end_date"
                    required
                    onChange={(e) => {
                      const d = new Date(e.target.value);
                      setFormData({ ...formData, end_date: Math.floor(d.getTime() / 1000) });
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting || !formData.name.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-xs transition disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {submitting ? 'Đang tạo...' : 'Tạo Học kỳ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Course to Semester Modal */}
      {showAddCourseModal && activeSemesterForCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowAddCourseModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Thêm Môn học vào học kỳ</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Khai báo môn học cho {activeSemesterForCourse.name}
                </p>
              </div>
              <button
                onClick={() => setShowAddCourseModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleCreateCourse} className="p-4 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label htmlFor="course_code" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Mã môn <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="course_code"
                    required
                    placeholder="VD: ENGO301"
                    value={courseFormData.code}
                    onChange={(e) => setCourseFormData({ ...courseFormData, code: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase font-mono"
                  />
                </div>
                <div className="col-span-2">
                  <label htmlFor="course_name" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Tên môn học <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="course_name"
                    required
                    placeholder="VD: English Oral Exam"
                    value={courseFormData.name}
                    onChange={(e) => setCourseFormData({ ...courseFormData, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label htmlFor="course_credits" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Số tín chỉ
                  </label>
                  <input
                    type="number"
                    id="course_credits"
                    min={1}
                    max={10}
                    value={courseFormData.credits}
                    onChange={(e) => setCourseFormData({ ...courseFormData, credits: parseInt(e.target.value, 10) || 3 })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="col-span-2">
                  <label htmlFor="teacher_id" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Giảng viên phụ trách
                  </label>
                  <select
                    id="teacher_id"
                    value={courseFormData.teacher_id}
                    onChange={(e) => setCourseFormData({ ...courseFormData, teacher_id: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Chưa chỉ định --</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.username})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="course_desc" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Mô tả môn học
                </label>
                <textarea
                  id="course_desc"
                  rows={3}
                  placeholder="Mô tả mục tiêu môn học và kỳ thi vấn đáp..."
                  value={courseFormData.description}
                  onChange={(e) => setCourseFormData({ ...courseFormData, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCourseModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={creatingCourse || !courseFormData.code.trim() || !courseFormData.name.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-xs transition disabled:opacity-50"
                >
                  {creatingCourse && <Loader2 className="w-4 h-4 animate-spin" />}
                  {creatingCourse ? 'Đang tạo...' : 'Tạo môn học'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
