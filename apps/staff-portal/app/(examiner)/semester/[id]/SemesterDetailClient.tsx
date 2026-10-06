'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Check,
  ChevronRight,
  ExternalLink,
  GraduationCap,
  Layers,
  Loader2,
  Plus,
  Search,
  Users,
  X,
  AlertCircle,
  Building2,
  Clock,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';

interface CourseItem {
  id: string;
  code: string;
  name: string;
  description?: string;
  credits: number;
  department_code: string;
  status: string;
  candidate_count?: number;
  batch_count?: number;
}

interface SemesterData {
  id: string;
  name: string;
  year: number;
  term: 'SPRING' | 'SUMMER' | 'FALL';
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED';
  start_date: number;
  end_date: number;
  course_count: number;
  total_candidates: number;
  total_batches: number;
  courses: CourseItem[];
}

interface MasterCourse {
  id: string;
  code: string;
  name: string;
  department_code: string;
  credits: number;
  description?: string;
}

interface ManualCourseForm {
  code: string;
  name: string;
  department_code: string;
  credits: number;
  description: string;
}

const TERM_LABELS: Record<string, string> = {
  SPRING: 'Học kỳ Xuân',
  SUMMER: 'Học kỳ Hè',
  FALL: 'Học kỳ Thu',
};

export default function SemesterDetailClient({ semesterId }: { semesterId: string }) {
  const router = useRouter();
  const [semester, setSemester] = useState<SemesterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');

  // Add Course Modal
  const [isAddCourseModalOpen, setIsAddCourseModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'catalog' | 'manual'>('catalog');
  const [masterCourses, setMasterCourses] = useState<MasterCourse[]>([]);
  const [loadingMasterCourses, setLoadingMasterCourses] = useState(false);
  const [selectedMasterCourseId, setSelectedMasterCourseId] = useState<string>('');
  const [submittingCourse, setSubmittingCourse] = useState(false);

  const [manualForm, setManualForm] = useState<ManualCourseForm>({
    code: '',
    name: '',
    department_code: 'SE',
    credits: 3,
    description: '',
  });

  const fetchSemesterDetail = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/examiner/semesters/${semesterId}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error(`Lỗi tải dữ liệu học kỳ (${res.status})`);
      }
      const data = await res.json();
      setSemester(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải thông tin học kỳ');
    } finally {
      setLoading(false);
    }
  }, [semesterId]);

  const fetchMasterCourses = useCallback(async () => {
    try {
      setLoadingMasterCourses(true);
      const res = await fetch('/api/examiner/master-courses', {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setMasterCourses(data);
        if (data.length > 0 && !selectedMasterCourseId) {
          setSelectedMasterCourseId(data[0].id);
        }
      }
    } catch {
      // Ignored - fallback silently
    } finally {
      setLoadingMasterCourses(false);
    }
  }, [selectedMasterCourseId]);

  useEffect(() => {
    fetchSemesterDetail();
  }, [fetchSemesterDetail]);

  useEffect(() => {
    if (isAddCourseModalOpen) {
      fetchMasterCourses();
    }
  }, [isAddCourseModalOpen, fetchMasterCourses]);

  const handleActivate = async () => {
    if (!semester) return;
    try {
      setActionLoading(true);
      const res = await fetch(`/api/examiner/semesters/${semester.id}/activate`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Kích hoạt học kỳ thất bại');
      toast.success('Đã kích hoạt học kỳ thành công');
      fetchSemesterDetail();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Kích hoạt thất bại');
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!semester) return;
    try {
      setActionLoading(true);
      const res = await fetch(`/api/examiner/semesters/${semester.id}/complete`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Đánh dấu hoàn thành thất bại');
      toast.success('Đã đánh dấu hoàn thành học kỳ');
      fetchSemesterDetail();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Thao tác thất bại');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddCourseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!semester) return;
    setSubmittingCourse(true);

    try {
      let payload: Record<string, unknown> = {};

      if (activeTab === 'catalog') {
        if (!selectedMasterCourseId) {
          throw new Error('Vui lòng chọn môn học từ danh mục mẫu');
        }
        payload = { master_course_id: selectedMasterCourseId };
      } else {
        if (!manualForm.code.trim() || !manualForm.name.trim()) {
          throw new Error('Vui lòng nhập đầy đủ mã môn và tên môn');
        }
        payload = {
          code: manualForm.code.trim().toUpperCase(),
          name: manualForm.name.trim(),
          department_code: manualForm.department_code.trim(),
          credits: Number(manualForm.credits) || 3,
          description: manualForm.description.trim(),
        };
      }

      const res = await fetch(`/api/examiner/semesters/${semester.id}/courses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Thêm môn học thất bại' }));
        throw new Error(err.message || err.detail || 'Thêm môn học thất bại');
      }

      toast.success('Đã thêm môn học vào học kỳ');
      setIsAddCourseModalOpen(false);
      setManualForm({
        code: '',
        name: '',
        department_code: 'SE',
        credits: 3,
        description: '',
      });
      fetchSemesterDetail();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Thêm môn học thất bại');
    } finally {
      setSubmittingCourse(false);
    }
  };

  const selectedMasterCourse = useMemo(() => {
    return masterCourses.find((c) => c.id === selectedMasterCourseId);
  }, [masterCourses, selectedMasterCourseId]);

  const departments = useMemo(() => {
    if (!semester?.courses) return [];
    const set = new Set<string>();
    semester.courses.forEach((c) => {
      if (c.department_code) set.add(c.department_code);
    });
    return Array.from(set).sort();
  }, [semester?.courses]);

  const filteredCourses = useMemo(() => {
    if (!semester?.courses) return [];
    return semester.courses.filter((course) => {
      const matchSearch =
        course.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchDept =
        selectedDept === 'ALL' || course.department_code === selectedDept;
      return matchSearch && matchDept;
    });
  }, [semester?.courses, searchQuery, selectedDept]);

  const formatDate = (timestamp: number) => {
    if (!timestamp) return '—';
    return new Date(timestamp * 1000).toLocaleDateString('vi-VN');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <div className="text-slate-500 font-medium text-sm">Đang tải dữ liệu học kỳ...</div>
      </div>
    );
  }

  if (error || !semester) {
    return (
      <div className="max-w-3xl mx-auto py-12">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
          <h2 className="text-lg font-bold text-red-900">Không tìm thấy thông tin học kỳ</h2>
          <p className="text-sm text-red-600">{error || 'Học kỳ không tồn tại hoặc bạn không có quyền truy cập.'}</p>
          <div className="pt-2">
            <Link
              href="/semester"
              className="inline-flex items-center gap-2 bg-slate-800 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-slate-900 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Quay lại danh sách học kỳ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between gap-4">
        <nav className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <Link href="/semester" className="hover:text-blue-600 transition flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            Quản lý Học kỳ
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-slate-900 font-semibold">{semester.name}</span>
        </nav>
      </div>

      {/* Main Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{semester.name}</h1>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold border ${
                semester.status === 'ACTIVE'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : semester.status === 'COMPLETED'
                  ? 'bg-slate-100 text-slate-600 border-slate-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              {semester.status === 'ACTIVE' && <Check className="w-3.5 h-3.5 inline mr-1" />}
              {semester.status === 'DRAFT'
                ? 'Bản nháp'
                : semester.status === 'ACTIVE'
                ? 'Đang hoạt động'
                : 'Đã hoàn thành'}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-500 font-medium flex-wrap">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>Năm học: <strong className="text-slate-700">{semester.year}</strong></span>
            </div>
            <span className="text-slate-300">•</span>
            <div className="flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-slate-400" />
              <span>{TERM_LABELS[semester.term] || semester.term}</span>
            </div>
            <span className="text-slate-300">•</span>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-slate-400" />
              <span>
                {formatDate(semester.start_date)} — {formatDate(semester.end_date)}
              </span>
            </div>
          </div>
        </div>

        {/* State Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {semester.status === 'DRAFT' && (
            <button
              onClick={handleActivate}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-xs transition disabled:opacity-50"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Kích hoạt học kỳ
            </button>
          )}
          {semester.status === 'ACTIVE' && (
            <button
              onClick={handleComplete}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 bg-slate-700 hover:bg-slate-800 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-xs transition disabled:opacity-50"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Đánh dấu hoàn thành
            </button>
          )}
          {semester.status === 'COMPLETED' && (
            <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-400 text-xs font-semibold px-4 py-2.5 rounded-xl cursor-not-allowed">
              <Check className="w-4 h-4" />
              Học kỳ đã đóng
            </span>
          )}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Courses */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {semester.course_count ?? semester.courses?.length ?? 0}
            </div>
            <div className="text-xs font-semibold text-slate-500 mt-0.5">Môn học trong kỳ</div>
          </div>
        </div>

        {/* Total Candidates */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {semester.total_candidates ?? 0}
            </div>
            <div className="text-xs font-semibold text-slate-500 mt-0.5">Thí sinh đã ghi danh</div>
          </div>
        </div>

        {/* Total Batches */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 flex-shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {semester.total_batches ?? 0}
            </div>
            <div className="text-xs font-semibold text-slate-500 mt-0.5">Đợt thi đã thiết lập</div>
          </div>
        </div>
      </div>

      {/* Course Management Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Toolbar Header */}
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
          <div>
            <h2 className="text-base font-bold text-slate-900">Danh sách Môn học trong kỳ</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Quản lý danh sách học phần, candidate pool và tổ chức đợt thi vấn đáp
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Search Input */}
            <div className="relative min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm mã hoặc tên môn..."
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Department Filter */}
            {departments.length > 0 && (
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="bg-white border border-slate-200 text-xs font-medium text-slate-700 px-3 py-2 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              >
                <option value="ALL">Tất cả ngành ({departments.length})</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    Ngành {d}
                  </option>
                ))}
              </select>
            )}

            {/* Add Course Button */}
            <button
              onClick={() => setIsAddCourseModalOpen(true)}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-4 py-2 rounded-xl shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              Thêm Môn học vào kỳ
            </button>
          </div>
        </div>

        {/* Course List Table */}
        {filteredCourses.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
            <div className="text-sm font-bold text-slate-700">
              {searchQuery || selectedDept !== 'ALL'
                ? 'Không tìm thấy môn học phù hợp với bộ lọc'
                : 'Chưa có môn học nào trong học kỳ này'}
            </div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery || selectedDept !== 'ALL'
                ? 'Thử thay đổi từ khóa tìm kiếm hoặc chọn tất cả các ngành.'
                : 'Bấm nút "Thêm Môn học vào kỳ" ở góc phải để thêm môn từ Khung chương trình hoặc nhập mới.'}
            </p>
            {!searchQuery && selectedDept === 'ALL' && (
              <button
                onClick={() => setIsAddCourseModalOpen(true)}
                className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 hover:bg-blue-100 font-semibold text-xs px-4 py-2 rounded-xl transition mt-2"
              >
                <Plus className="w-3.5 h-3.5" />
                Thêm môn học ngay
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Mã môn</th>
                  <th className="py-3 px-4">Tên môn học</th>
                  <th className="py-3 px-4">Mã ngành</th>
                  <th className="py-3 px-4 text-center">Số tín chỉ</th>
                  <th className="py-3 px-4 text-center">Thí sinh</th>
                  <th className="py-3 px-4 text-center">Đợt thi</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredCourses.map((course) => (
                  <tr
                    key={course.id}
                    onClick={() => router.push(`/courses/${course.id}`)}
                    className="hover:bg-slate-50/80 cursor-pointer transition group"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-600">
                      <span className="bg-blue-50 px-2 py-1 rounded-md border border-blue-100">
                        {course.code}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 group-hover:text-blue-600 transition">
                        {course.name}
                      </div>
                      {course.description && (
                        <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                          {course.description}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {course.department_code ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          {course.department_code}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center font-medium text-slate-700">
                      {course.credits ?? 3} tín chỉ
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[11px]">
                        <Users className="w-3 h-3" />
                        {course.candidate_count ?? 0}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full text-[11px]">
                        <Layers className="w-3 h-3" />
                        {course.batch_count ?? 0}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          course.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {course.status === 'ACTIVE' ? 'Hoạt động' : 'Bản nháp'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="inline-flex items-center gap-1 text-slate-400 group-hover:text-blue-600 text-xs font-semibold transition">
                        Chi tiết
                        <ChevronRight className="w-4 h-4" />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Thêm Môn học vào kỳ (2 Tabs: Master Catalog & Manual) */}
      {isAddCourseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Thêm Môn học vào kỳ</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Chọn môn từ Khung chương trình đào tạo hoặc thêm môn học mới
                </p>
              </div>
              <button
                onClick={() => setIsAddCourseModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-slate-200 px-5 pt-3 gap-6 bg-white">
              <button
                type="button"
                onClick={() => setActiveTab('catalog')}
                className={`pb-3 text-xs font-bold transition relative ${
                  activeTab === 'catalog'
                    ? 'text-blue-600'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Chọn từ Danh mục Khung (Master)
                {activeTab === 'catalog' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('manual')}
                className={`pb-3 text-xs font-bold transition relative ${
                  activeTab === 'manual'
                    ? 'text-blue-600'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Thêm môn học mới thủ công
                {activeTab === 'manual' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
                )}
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleAddCourseSubmit}>
              <div className="p-5 space-y-4">
                {activeTab === 'catalog' ? (
                  /* Tab 1: Master Catalog */
                  <div className="space-y-4">
                    {loadingMasterCourses ? (
                      <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-500 text-xs">
                        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                        Đang tải danh mục môn học toàn trường...
                      </div>
                    ) : masterCourses.length === 0 ? (
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2.5">
                        <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                          Danh mục khung hiện chưa có môn học mẫu nào. Vui lòng chuyển sang tab{' '}
                          <strong>Thêm môn học mới thủ công</strong> để nhập thông tin môn.
                        </div>
                      </div>
                    ) : (
                      <>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Chọn môn học từ danh mục toàn trường <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={selectedMasterCourseId}
                            onChange={(e) => setSelectedMasterCourseId(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                          >
                            {masterCourses.map((mc) => (
                              <option key={mc.id} value={mc.id}>
                                [{mc.code}] {mc.name} ({mc.department_code} - {mc.credits} TC)
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Read-only Preview Box */}
                        {selectedMasterCourse && (
                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-xs">
                            <div className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">
                              Thông tin môn học mẫu (Read-only)
                            </div>
                            <div className="grid grid-cols-2 gap-3 pt-1">
                              <div>
                                <span className="text-slate-400 block text-[11px]">Mã môn:</span>
                                <span className="font-mono font-bold text-slate-800">
                                  {selectedMasterCourse.code}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[11px]">Mã ngành:</span>
                                <span className="font-semibold text-slate-800">
                                  {selectedMasterCourse.department_code}
                                </span>
                              </div>
                              <div className="col-span-2">
                                <span className="text-slate-400 block text-[11px]">Tên môn học:</span>
                                <span className="font-bold text-slate-900">
                                  {selectedMasterCourse.name}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[11px]">Số tín chỉ:</span>
                                <span className="font-semibold text-slate-800">
                                  {selectedMasterCourse.credits} tín chỉ
                                </span>
                              </div>
                              {selectedMasterCourse.description && (
                                <div className="col-span-2">
                                  <span className="text-slate-400 block text-[11px]">Mô tả:</span>
                                  <span className="text-slate-600">
                                    {selectedMasterCourse.description}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  /* Tab 2: Manual Entry */
                  <div className="space-y-3.5">
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Mã ngành <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={manualForm.department_code}
                          onChange={(e) =>
                            setManualForm((prev) => ({
                              ...prev,
                              department_code: e.target.value.toUpperCase(),
                            }))
                          }
                          placeholder="SE, AI, CS..."
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 uppercase focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Mã môn <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={manualForm.code}
                          onChange={(e) =>
                            setManualForm((prev) => ({
                              ...prev,
                              code: e.target.value.toUpperCase(),
                            }))
                          }
                          placeholder="VD: MAS291"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 uppercase focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Số tín chỉ
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={manualForm.credits}
                          onChange={(e) =>
                            setManualForm((prev) => ({
                              ...prev,
                              credits: parseInt(e.target.value) || 3,
                            }))
                          }
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Tên môn học <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={manualForm.name}
                        onChange={(e) =>
                          setManualForm((prev) => ({ ...prev, name: e.target.value }))
                        }
                        placeholder="VD: Xác suất & Thống kê ứng dụng"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Mô tả tóm tắt môn học
                      </label>
                      <textarea
                        rows={3}
                        value={manualForm.description}
                        onChange={(e) =>
                          setManualForm((prev) => ({ ...prev, description: e.target.value }))
                        }
                        placeholder="Nội dung chính, mục tiêu môn học..."
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition resize-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddCourseModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submittingCourse || (activeTab === 'catalog' && masterCourses.length === 0)}
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-5 py-2 rounded-xl shadow-xs transition disabled:opacity-50"
                >
                  {submittingCourse && <Loader2 className="w-4 h-4 animate-spin" />}
                  {activeTab === 'catalog' ? 'Thêm từ Danh mục' : 'Thêm môn mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
