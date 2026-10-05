'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Upload,
  Users,
  FileSpreadsheet,
  X,
  Loader2,
  AlertCircle,
  Edit2,
  GraduationCap,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

interface Section {
  id: string;
  name: string;
  code: string;
  day_of_week: number;
  time_slot: 'MORNING' | 'AFTERNOON' | 'EVENING';
  max_students: number;
  status: string;
  teacher: { id: string; name: string } | null;
  student_count: number;
}

interface Teacher {
  id: string;
  name: string;
  username: string;
}

interface SectionIn {
  name: string;
  code: string;
  teacher_id: string;
  day_of_week: number;
  time_slot: 'MORNING' | 'AFTERNOON' | 'EVENING';
  max_students: number;
}

interface ImportResult {
  created_enrollments?: number;
  created_sections?: number;
  skipped?: number;
  errors?: string[];
}

const DAY_NAMES = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
const TIME_LABELS: Record<string, string> = { MORNING: 'Sáng', AFTERNOON: 'Chiều', EVENING: 'Tối' };

export default function SectionsClient({ courseId }: { courseId: string }) {
  const [sections, setSections] = useState<Section[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);

  // Form states
  const [submitting, setSubmitting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const [formData, setFormData] = useState<SectionIn>({
    name: '',
    code: '',
    teacher_id: '',
    day_of_week: 1,
    time_slot: 'MORNING',
    max_students: 40,
  });

  const [editFormData, setEditFormData] = useState<SectionIn>({
    name: '',
    code: '',
    teacher_id: '',
    day_of_week: 1,
    time_slot: 'MORNING',
    max_students: 40,
  });

  const fetchSections = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/examiner/courses/${courseId}/sections`, { credentials: 'include' });
      if (!res.ok) throw new Error(`Lỗi server: ${res.status}`);
      const data = await res.json();
      setSections(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách lớp học');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

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
      // Fallback
    }
  }, []);

  useEffect(() => {
    fetchSections();
    fetchTeachers();
  }, [fetchSections, fetchTeachers]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        teacher_id: formData.teacher_id || null,
        day_of_week: formData.day_of_week,
        time_slot: formData.time_slot,
        max_students: formData.max_students,
      };

      const res = await fetch(`/api/examiner/courses/${courseId}/sections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Lỗi không xác định' }));
        throw new Error(err.message || err.detail || 'Tạo lớp học thất bại');
      }

      setShowCreateModal(false);
      setFormData({ name: '', code: '', teacher_id: '', day_of_week: 1, time_slot: 'MORNING', max_students: 40 });
      toast.success('Tạo lớp học thành công');
      fetchSections();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Tạo lớp học thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (section: Section) => {
    setEditingSection(section);
    setEditFormData({
      name: section.name,
      code: section.code,
      teacher_id: section.teacher ? section.teacher.id : '',
      day_of_week: section.day_of_week,
      time_slot: section.time_slot,
      max_students: section.max_students,
    });
    setShowEditModal(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSection) return;
    setSubmitting(true);
    try {
      const payload = {
        name: editFormData.name.trim(),
        code: editFormData.code.trim().toUpperCase(),
        teacher_id: editFormData.teacher_id || '',
        day_of_week: editFormData.day_of_week,
        time_slot: editFormData.time_slot,
        max_students: editFormData.max_students,
      };

      const res = await fetch(`/api/examiner/sections/${editingSection.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Cập nhật thất bại' }));
        throw new Error(err.message || err.detail || 'Cập nhật thất bại');
      }

      toast.success('Cập nhật lớp học và gán giảng viên thành công');
      setShowEditModal(false);
      setEditingSection(null);
      fetchSections();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Cập nhật thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        setUploadFile(file);
      } else {
        toast.error('Vui lòng chọn tệp bảng tính Excel (.xlsx, .xls)');
      }
    }
  };

  const handleImport = async () => {
    if (!uploadFile) return;
    setImporting(true);
    setImportResult(null);
    try {
      const data = new FormData();
      data.append('course_id', courseId);
      data.append('file', uploadFile);

      const res = await fetch('/api/examiner/enrollments/import', {
        method: 'POST',
        credentials: 'include',
        body: data,
      });
      const result: ImportResult = await res.json();
      setImportResult(result);

      if (!res.ok) {
        throw new Error((result as unknown as { detail?: string }).detail || 'Import thất bại');
      }

      toast.success(`Import hoàn tất: ${result.created_enrollments ?? 0} sinh viên, ${result.created_sections ?? 0} lớp mới`);
      fetchSections();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Import thất bại');
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-3">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <div className="text-slate-500 font-medium text-sm">Đang tải danh sách lớp học...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Lớp học phần & Giảng viên</h2>
          <p className="text-sm text-slate-500 mt-0.5">Quản lý lớp, phân công giảng dạy và import sinh viên theo lớp</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setShowImportModal(true);
              setImportResult(null);
              setUploadFile(null);
            }}
            className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm px-4 py-2.5 rounded-xl shadow-xs transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Import SV (Excel)
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            Thêm lớp học
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-900">{error}</p>
          </div>
          <button onClick={fetchSections} className="text-xs text-red-600 hover:text-red-800 font-semibold whitespace-nowrap">
            Thử lại
          </button>
        </div>
      )}

      {/* Empty State */}
      {!error && sections.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-700">Chưa có lớp học phần nào</h3>
          <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
            Bạn có thể thêm lớp học thủ công hoặc tải file Excel danh sách sinh viên để hệ thống tự động nhận diện và tạo lớp.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              onClick={() => { setShowImportModal(true); setImportResult(null); setUploadFile(null); }}
              className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm px-4 py-2.5 rounded-xl transition"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Import từ Excel
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition"
            >
              <Plus className="w-4 h-4" />
              Thêm lớp đầu tiên
            </button>
          </div>
        </div>
      )}

      {/* Sections Grid */}
      {sections.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sections.map((section) => {
            const isFull = section.student_count >= section.max_students;

            return (
              <div
                key={section.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-md border border-blue-100">
                          {section.code}
                        </span>
                        <span className="text-xs font-medium text-slate-500">
                          {DAY_NAMES[section.day_of_week] || 'Chưa định ngày'}
                        </span>
                      </div>
                      <h3 className="font-bold text-slate-900 text-sm mt-1.5 leading-snug">{section.name}</h3>
                    </div>
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-[11px] font-semibold rounded-full border border-slate-200">
                      Ca {TIME_LABELS[section.time_slot] || section.time_slot}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs py-2 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                        Giảng viên
                      </span>
                      <span className="font-semibold text-slate-800">
                        {section.teacher ? (
                          section.teacher.name
                        ) : (
                          <span className="text-amber-600 font-medium">Chưa gán GV</span>
                        )}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        Sĩ số sinh viên
                      </span>
                      <span className={`font-bold ${isFull ? 'text-amber-600' : 'text-slate-800'}`}>
                        {section.student_count} / {section.max_students}
                      </span>
                    </div>

                    {/* Capacity Bar */}
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isFull ? 'bg-amber-500' : 'bg-blue-600'
                        }`}
                        style={{
                          width: `${Math.min(100, Math.round((section.student_count / (section.max_students || 1)) * 100))}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 mt-2">
                  <button
                    onClick={() => openEditModal(section)}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                    Gán giảng viên / Đổi ca
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Section Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Thêm Lớp học mới</h2>
                <p className="text-xs text-slate-500 mt-0.5">Khai báo thông tin lớp học phần</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-4 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label htmlFor="create_code" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Mã lớp <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="create_code"
                    required
                    placeholder="ENGO01"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 uppercase font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="col-span-2">
                  <label htmlFor="create_name" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Tên lớp <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="create_name"
                    required
                    placeholder="Lớp Sáng Thứ 2"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="create_teacher" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Giảng viên giảng dạy
                </label>
                <select
                  id="create_teacher"
                  value={formData.teacher_id}
                  onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Chưa chỉ định giảng viên --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.username})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="create_day" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Thứ trong tuần <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="create_day"
                    value={formData.day_of_week}
                    onChange={(e) => setFormData({ ...formData, day_of_week: parseInt(e.target.value, 10) })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {DAY_NAMES.map((day, idx) => (
                      <option key={idx} value={idx}>{day}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="create_slot" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Ca học <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="create_slot"
                    value={formData.time_slot}
                    onChange={(e) => setFormData({ ...formData, time_slot: e.target.value as 'MORNING' | 'AFTERNOON' | 'EVENING' })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="MORNING">Sáng</option>
                    <option value="AFTERNOON">Chiều</option>
                    <option value="EVENING">Tối</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="create_max" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Sĩ số tối đa <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="create_max"
                  value={formData.max_students}
                  onChange={(e) => setFormData({ ...formData, max_students: parseInt(e.target.value, 10) || 40 })}
                  required
                  min={1}
                  max={200}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting || !formData.name.trim() || !formData.code.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-xs transition disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {submitting ? 'Đang tạo...' : 'Tạo Lớp học'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Section / Assign Teacher Modal */}
      {showEditModal && editingSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowEditModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Gán Giảng viên & Chỉnh sửa lớp</h2>
                <p className="text-xs text-slate-500 mt-0.5">Lớp {editingSection.code} — {editingSection.name}</p>
              </div>
              <button onClick={() => setShowEditModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="p-4 space-y-4">
              <div>
                <label htmlFor="edit_teacher" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Giảng viên phụ trách lớp
                </label>
                <select
                  id="edit_teacher"
                  value={editFormData.teacher_id}
                  onChange={(e) => setEditFormData({ ...editFormData, teacher_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Chưa chỉ định giảng viên --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.username})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="edit_day" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Thứ trong tuần
                  </label>
                  <select
                    id="edit_day"
                    value={editFormData.day_of_week}
                    onChange={(e) => setEditFormData({ ...editFormData, day_of_week: parseInt(e.target.value, 10) })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {DAY_NAMES.map((day, idx) => (
                      <option key={idx} value={idx}>{day}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="edit_slot" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Ca học
                  </label>
                  <select
                    id="edit_slot"
                    value={editFormData.time_slot}
                    onChange={(e) => setEditFormData({ ...editFormData, time_slot: e.target.value as 'MORNING' | 'AFTERNOON' | 'EVENING' })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="MORNING">Sáng</option>
                    <option value="AFTERNOON">Chiều</option>
                    <option value="EVENING">Tối</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="edit_max" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Sĩ số tối đa
                </label>
                <input
                  type="number"
                  id="edit_max"
                  value={editFormData.max_students}
                  onChange={(e) => setEditFormData({ ...editFormData, max_students: parseInt(e.target.value, 10) || 40 })}
                  required
                  min={1}
                  max={200}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-xs transition disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {submitting ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Excel Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowImportModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Import Sinh viên từ Excel</h2>
                <p className="text-xs text-slate-500 mt-0.5">Tự động nhận diện lớp và thêm sinh viên vào danh sách</p>
              </div>
              <button onClick={() => setShowImportModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Drag and Drop Box */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleFileDrop}
                className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50/50'
                    : 'border-slate-300 hover:border-blue-400 bg-slate-50/60'
                }`}
              >
                <Upload className={`w-10 h-10 mx-auto mb-2 transition-colors ${isDragging ? 'text-blue-600' : 'text-slate-400'}`} />
                <p className="text-sm font-semibold text-slate-700 mb-1">
                  Kéo thả file Excel vào đây hoặc{' '}
                  <label htmlFor="file-upload" className="text-blue-600 hover:text-blue-700 cursor-pointer underline underline-offset-2">
                    chọn từ máy tính
                  </label>
                </p>
                <p className="text-xs text-slate-400">Định dạng hỗ trợ: .xlsx, .xls</p>
                <input
                  type="file"
                  id="file-upload"
                  accept=".xlsx,.xls"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="hidden"
                />

                {uploadFile && (
                  <div className="mt-4 p-2.5 bg-white border border-blue-200 rounded-xl inline-flex items-center gap-2 text-xs font-semibold text-blue-700 shadow-2xs">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span>{uploadFile.name} ({(uploadFile.size / 1024).toFixed(1)} KB)</span>
                    <button
                      onClick={() => setUploadFile(null)}
                      className="p-1 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Template Download Link */}
              <div className="flex items-center justify-between text-xs px-1">
                <span className="text-slate-500">File Excel gồm 3 cột: MSSV, Họ tên, Mã lớp</span>
                <a
                  href="/template.xlsx"
                  download="Mau_danh_sach_sinh_vien.xlsx"
                  className="inline-flex items-center gap-1.5 font-bold text-blue-600 hover:text-blue-800"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  Tải file mẫu (.xlsx)
                </a>
              </div>

              {/* Import Results Box */}
              {importResult && (
                <div className="space-y-3 pt-2">
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs space-y-1.5">
                    <p className="font-bold text-emerald-900 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Kết quả xử lý:
                    </p>
                    <div className="grid grid-cols-3 gap-2 pt-1 text-slate-700">
                      <div className="bg-white/80 p-2 rounded-lg border border-emerald-100 text-center">
                        <span className="text-slate-500 block text-[10px] uppercase font-bold">SV thêm mới</span>
                        <span className="font-bold text-emerald-700 text-sm">{importResult.created_enrollments ?? 0}</span>
                      </div>
                      <div className="bg-white/80 p-2 rounded-lg border border-emerald-100 text-center">
                        <span className="text-slate-500 block text-[10px] uppercase font-bold">Lớp tự sinh</span>
                        <span className="font-bold text-blue-700 text-sm">{importResult.created_sections ?? 0}</span>
                      </div>
                      <div className="bg-white/80 p-2 rounded-lg border border-emerald-100 text-center">
                        <span className="text-slate-500 block text-[10px] uppercase font-bold">Trùng lặp</span>
                        <span className="font-bold text-amber-700 text-sm">{importResult.skipped ?? 0}</span>
                      </div>
                    </div>
                  </div>

                  {/* Warning / Error report */}
                  {importResult.errors && importResult.errors.length > 0 && (
                    <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-1.5 max-h-36 overflow-y-auto">
                      <p className="font-bold text-amber-900 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        Cảnh báo dòng lỗi ({importResult.errors.length}):
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-amber-800">
                        {importResult.errors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Modal Footer */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={handleImport}
                  disabled={!uploadFile || importing}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-xs transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {importing && <Loader2 className="w-4 h-4 animate-spin" />}
                  {importing ? 'Đang xử lý...' : 'Tiến hành Import'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
